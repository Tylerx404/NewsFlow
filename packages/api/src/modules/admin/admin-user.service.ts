import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

import { createAdminAuditLog } from "./admin-audit.service";
import {
  subscriptionBillingIntervalSchema,
  subscriptionTierSchema,
} from "../subscription/subscription.schema";
import type {
  ListAdminUsersInput,
  ReactivateAdminUserInput,
  SuspendAdminUserInput,
} from "./admin-user.schema";

type PrismaClient = typeof prisma;

type SubscriptionSummarySource = {
  tier: string;
  status: string;
  billingInterval: string | null;
  expiresAt: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  endedAt: Date | null;
} | null;

const adminUserListSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  status: true,
  createdAt: true,
  subscription: {
    select: {
      tier: true,
      status: true,
      billingInterval: true,
      expiresAt: true,
      currentPeriodEnd: true,
      trialEnd: true,
      endedAt: true,
    },
  },
  _count: {
    select: {
      feedSubscriptions: true,
    },
  },
} satisfies Prisma.UserSelect;

const adminUserDetailSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  status: true,
  suspendedAt: true,
  suspendedReason: true,
  createdAt: true,
  updatedAt: true,
  subscription: {
    select: {
      tier: true,
      status: true,
      billingInterval: true,
      expiresAt: true,
      currentPeriodEnd: true,
      trialEnd: true,
      endedAt: true,
    },
  },
  _count: {
    select: {
      feedSubscriptions: true,
    },
  },
} satisfies Prisma.UserSelect;

type AdminUserListRecord = Prisma.UserGetPayload<{
  select: typeof adminUserListSelect;
}>;

type AdminUserDetailRecord = Prisma.UserGetPayload<{
  select: typeof adminUserDetailSelect;
}>;

function normalizeSubscriptionSummary(subscription: SubscriptionSummarySource) {
  const tierResult = subscriptionTierSchema.safeParse(subscription?.tier ?? "free");
  const billingIntervalResult = subscriptionBillingIntervalSchema.safeParse(
    subscription?.billingInterval ?? null
  );

  return {
    tier: tierResult.success ? tierResult.data : "free",
    status: subscription?.status ?? "active",
    billingInterval: billingIntervalResult.success ? billingIntervalResult.data : null,
    expiresAt:
      subscription?.expiresAt ??
      subscription?.currentPeriodEnd ??
      subscription?.trialEnd ??
      subscription?.endedAt ??
      null,
  };
}

function mapAdminUserListItem(user: AdminUserListRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    feedCount: user._count.feedSubscriptions,
    subscription: normalizeSubscriptionSummary(user.subscription),
  };
}

function mapAdminUserDetail(user: AdminUserDetailRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    status: user.status,
    suspendedAt: user.suspendedAt,
    suspendedReason: user.suspendedReason,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    feedCount: user._count.feedSubscriptions,
    subscription: normalizeSubscriptionSummary(user.subscription),
  };
}

export async function listAdminUsers(db: PrismaClient, input: ListAdminUsersInput) {
  const where: Prisma.UserWhereInput = {};
  const andFilters: Prisma.UserWhereInput[] = [];

  if (input.query) {
    andFilters.push({
      OR: [
        { name: { contains: input.query, mode: "insensitive" } },
        { email: { contains: input.query, mode: "insensitive" } },
      ],
    });
  }

  if (input.role) {
    andFilters.push({ role: input.role });
  }

  if (input.status) {
    andFilters.push({ status: input.status });
  }

  if (input.tier) {
    if (input.tier === "free") {
      andFilters.push({
        OR: [
          { subscription: { is: null } },
          { subscription: { is: { tier: input.tier } } },
        ],
      });
    } else {
      andFilters.push({
        subscription: {
          is: { tier: input.tier },
        },
      });
    }
  }

  if (input.cursor) {
    const cursorCreatedAt = new Date(input.cursor.createdAt);

    andFilters.push({
      OR: [
        { createdAt: { lt: cursorCreatedAt } },
        {
          createdAt: cursorCreatedAt,
          id: { lt: input.cursor.id },
        },
      ],
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const users = await db.user.findMany({
    where,
    take: input.limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: adminUserListSelect,
  });

  let nextCursor:
    | {
        id: string;
        createdAt: string;
      }
    | undefined;

  if (users.length > input.limit) {
    const nextItem = users.pop();

    if (nextItem) {
      nextCursor = {
        id: nextItem.id,
        createdAt: nextItem.createdAt.toISOString(),
      };
    }
  }

  return {
    items: users.map(mapAdminUserListItem),
    nextCursor,
  };
}

export async function getAdminUserDetail(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: adminUserDetailSelect,
  });

  if (!user) {
    return null;
  }

  return mapAdminUserDetail(user);
}

interface SuspendAdminUserParams extends SuspendAdminUserInput {
  adminUserId: string;
}

interface ReactivateAdminUserParams extends ReactivateAdminUserInput {
  adminUserId: string;
}

export async function suspendAdminUser(
  db: PrismaClient,
  input: SuspendAdminUserParams
) {
  const existingUser = await db.user.findUnique({
    where: { id: input.userId },
    select: adminUserDetailSelect,
  });

  if (!existingUser) {
    return null;
  }

  if (existingUser.status === "SUSPENDED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "User account is already suspended.",
    });
  }

  const updatedUser = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspendedReason: input.reason ?? null,
      },
      select: adminUserDetailSelect,
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "USER_SUSPENDED",
      targetType: "USER",
      targetId: input.userId,
      metadata: {
        reason: input.reason ?? null,
        previous: {
          status: existingUser.status,
        },
        next: {
          status: "SUSPENDED",
        },
      },
    });

    return user;
  });

  return mapAdminUserDetail(updatedUser);
}

export async function reactivateAdminUser(
  db: PrismaClient,
  input: ReactivateAdminUserParams
) {
  const existingUser = await db.user.findUnique({
    where: { id: input.userId },
    select: adminUserDetailSelect,
  });

  if (!existingUser) {
    return null;
  }

  if (existingUser.status === "ACTIVE") {
    throw new ORPCError("BAD_REQUEST", {
      message: "User account is already active.",
    });
  }

  const updatedUser = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        suspendedReason: null,
      },
      select: adminUserDetailSelect,
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "USER_REACTIVATED",
      targetType: "USER",
      targetId: input.userId,
      metadata: {
        previous: {
          status: existingUser.status,
        },
        next: {
          status: "ACTIVE",
        },
      },
    });

    return user;
  });

  return mapAdminUserDetail(updatedUser);
}
