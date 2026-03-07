import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

import { createAdminAuditLog } from "./admin-audit.service";
import type {
  AdminAiUsageOverviewInput,
  AdminAiUsageUserUsageInput,
  ListAdminAiUsageEventsInput,
  UpdateAdminAiConfigEnabledInput,
} from "./admin-ai-usage.schema";

type PrismaClient = typeof prisma;

const adminAiConfigSelect = {
  id: true,
  userId: true,
  name: true,
  provider: true,
  model: true,
  baseUrl: true,
  isDefault: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AiConfigSelect;

function buildDateRangeFilter(
  startedAt?: string,
  endedAt?: string
): Prisma.DateTimeFilter | undefined {
  if (!startedAt && !endedAt) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (startedAt) {
    filter.gte = new Date(startedAt);
  }

  if (endedAt) {
    filter.lte = new Date(endedAt);
  }

  return filter;
}

function buildAdminAiUsageWhere(
  input: ListAdminAiUsageEventsInput
): Prisma.AiUsageWhereInput {
  const andFilters: Prisma.AiUsageWhereInput[] = [];

  if (input.provider) {
    andFilters.push({
      provider: {
        contains: input.provider,
        mode: "insensitive",
      },
    });
  }

  if (input.model) {
    andFilters.push({
      model: {
        contains: input.model,
        mode: "insensitive",
      },
    });
  }

  if (input.status) {
    andFilters.push({ status: input.status });
  }

  const dateRange = buildDateRangeFilter(input.startedAt, input.endedAt);
  if (dateRange) {
    andFilters.push({ createdAt: dateRange });
  }

  if (input.userQuery) {
    andFilters.push({
      user: {
        OR: [
          {
            name: {
              contains: input.userQuery,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: input.userQuery,
              mode: "insensitive",
            },
          },
        ],
      },
    });
  }

  if (andFilters.length === 0) {
    return {};
  }

  return {
    AND: andFilters,
  };
}

function mapAdminAiUsageEvent(event: {
  id: string;
  userId: string;
  provider: string;
  model: string;
  tokens: number;
  action: string;
  status: "SUCCESS" | "FAILED";
  durationMs: number | null;
  errorSummary: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
}) {
  return {
    id: event.id,
    userId: event.userId,
    userName: event.user.name,
    userEmail: event.user.email,
    provider: event.provider,
    model: event.model,
    tokens: event.tokens,
    action: event.action,
    status: event.status,
    durationMs: event.durationMs,
    errorSummary: event.errorSummary,
    createdAt: event.createdAt,
  };
}

export async function getAdminAiUsageOverview(
  db: PrismaClient,
  input: AdminAiUsageOverviewInput
) {
  const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

  const where: Prisma.AiUsageWhereInput = {
    createdAt: {
      gte: since,
    },
  };

  const [
    aggregateUsage,
    failureCount,
    topUserGroups,
    userFailureGroups,
    providerModelGroups,
    providerFailureGroups,
    recentFailureEvents,
  ] = await Promise.all([
    db.aiUsage.aggregate({
      where,
      _sum: {
        tokens: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.aiUsage.count({
      where: {
        ...where,
        status: "FAILED",
      },
    }),
    db.aiUsage.groupBy({
      by: ["userId"],
      where,
      _sum: {
        tokens: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          tokens: "desc",
        },
      },
      take: 10,
    }),
    db.aiUsage.groupBy({
      by: ["userId"],
      where: {
        ...where,
        status: "FAILED",
      },
      _count: {
        _all: true,
      },
    }),
    db.aiUsage.groupBy({
      by: ["provider", "model"],
      where,
      _sum: {
        tokens: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          tokens: "desc",
        },
      },
      take: 20,
    }),
    db.aiUsage.groupBy({
      by: ["provider", "model"],
      where: {
        ...where,
        status: "FAILED",
      },
      _count: {
        _all: true,
      },
    }),
    db.aiUsage.findMany({
      where: {
        ...where,
        status: "FAILED",
        errorSummary: {
          not: null,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        userId: true,
        provider: true,
        model: true,
        errorSummary: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const userMap = new Map<string, { name: string; email: string }>();
  const topUserIds = topUserGroups.map((item) => item.userId);
  const users = topUserIds.length
    ? await db.user.findMany({
        where: {
          id: {
            in: topUserIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : [];

  for (const user of users) {
    userMap.set(user.id, {
      name: user.name,
      email: user.email,
    });
  }

  const failureCountByUser = new Map(
    userFailureGroups.map((item) => [item.userId, item._count._all])
  );
  const failureCountByProviderModel = new Map(
    providerFailureGroups.map((item) => [
      `${item.provider}:${item.model}`,
      item._count._all,
    ])
  );

  return {
    periodDays: input.days,
    totalTokens: aggregateUsage._sum.tokens ?? 0,
    totalRequests: aggregateUsage._count._all,
    failureCount,
    topUsers: topUserGroups.map((item) => {
      const user = userMap.get(item.userId);

      return {
        userId: item.userId,
        userName: user?.name ?? "Unknown user",
        userEmail: user?.email ?? "unknown@newsflow.local",
        tokens: item._sum.tokens ?? 0,
        requestCount: item._count._all,
        failureCount: failureCountByUser.get(item.userId) ?? 0,
      };
    }),
    providerModelBreakdown: providerModelGroups.map((item) => ({
      provider: item.provider,
      model: item.model,
      tokens: item._sum.tokens ?? 0,
      requestCount: item._count._all,
      failureCount:
        failureCountByProviderModel.get(`${item.provider}:${item.model}`) ?? 0,
    })),
    recentFailures: recentFailureEvents
      .filter((event) => Boolean(event.errorSummary))
      .map((event) => ({
        id: event.id,
        userId: event.userId,
        userName: event.user.name,
        userEmail: event.user.email,
        provider: event.provider,
        model: event.model,
        errorSummary: event.errorSummary as string,
        createdAt: event.createdAt,
      })),
  };
}

export async function listAdminAiUsageEvents(
  db: PrismaClient,
  input: ListAdminAiUsageEventsInput
) {
  const events = await db.aiUsage.findMany({
    where: buildAdminAiUsageWhere(input),
    take: input.limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      userId: true,
      provider: true,
      model: true,
      tokens: true,
      action: true,
      status: true,
      durationMs: true,
      errorSummary: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    items: events.map(mapAdminAiUsageEvent),
  };
}

export async function getAdminAiUserUsage(
  db: PrismaClient,
  input: AdminAiUsageUserUsageInput
) {
  const user = await db.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

  const where: Prisma.AiUsageWhereInput = {
    userId: input.userId,
    createdAt: {
      gte: since,
    },
  };

  const [aggregateUsage, failureCount, providerModelGroups, providerFailureGroups, events] =
    await Promise.all([
      db.aiUsage.aggregate({
        where,
        _sum: {
          tokens: true,
        },
        _count: {
          _all: true,
        },
      }),
      db.aiUsage.count({
        where: {
          ...where,
          status: "FAILED",
        },
      }),
      db.aiUsage.groupBy({
        by: ["provider", "model"],
        where,
        _sum: {
          tokens: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _sum: {
            tokens: "desc",
          },
        },
      }),
      db.aiUsage.groupBy({
        by: ["provider", "model"],
        where: {
          ...where,
          status: "FAILED",
        },
        _count: {
          _all: true,
        },
      }),
      db.aiUsage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          userId: true,
          provider: true,
          model: true,
          tokens: true,
          action: true,
          status: true,
          durationMs: true,
          errorSummary: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

  const failureCountByProviderModel = new Map(
    providerFailureGroups.map((item) => [
      `${item.provider}:${item.model}`,
      item._count._all,
    ])
  );

  return {
    user,
    periodDays: input.days,
    totalTokens: aggregateUsage._sum.tokens ?? 0,
    totalRequests: aggregateUsage._count._all,
    failureCount,
    providerModelBreakdown: providerModelGroups.map((item) => ({
      provider: item.provider,
      model: item.model,
      tokens: item._sum.tokens ?? 0,
      requestCount: item._count._all,
      failureCount:
        failureCountByProviderModel.get(`${item.provider}:${item.model}`) ?? 0,
    })),
    recentEvents: events.map(mapAdminAiUsageEvent),
  };
}

interface UpdateAdminAiConfigEnabledParams extends UpdateAdminAiConfigEnabledInput {
  adminUserId: string;
}

export async function updateAdminAiConfigEnabled(
  db: PrismaClient,
  input: UpdateAdminAiConfigEnabledParams
) {
  const existingConfig = await db.aiConfig.findUnique({
    where: {
      id: input.aiConfigId,
    },
    select: adminAiConfigSelect,
  });

  if (!existingConfig) {
    return null;
  }

  if (existingConfig.isEnabled === input.isEnabled) {
    throw new ORPCError("BAD_REQUEST", {
      message: input.isEnabled
        ? "AI config is already enabled."
        : "AI config is already disabled.",
    });
  }

  const updatedConfig = await db.$transaction(async (tx) => {
    const config = await tx.aiConfig.update({
      where: {
        id: input.aiConfigId,
      },
      data: {
        isEnabled: input.isEnabled,
      },
      select: adminAiConfigSelect,
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "AI_CONFIG_ENABLED_UPDATED",
      targetType: "AI_CONFIG",
      targetId: input.aiConfigId,
      metadata: {
        reason: input.reason ?? null,
        previous: {
          isEnabled: existingConfig.isEnabled,
        },
        next: {
          isEnabled: input.isEnabled,
        },
      },
    });

    return config;
  });

  return updatedConfig;
}
