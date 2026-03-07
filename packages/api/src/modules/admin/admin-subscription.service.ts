import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

import { createAdminAuditLog } from "./admin-audit.service";
import {
  subscriptionBillingIntervalSchema,
  subscriptionTierSchema,
} from "../subscription/subscription.schema";
import type {
  ListAdminSubscriptionsInput,
  UpdateAdminSubscriptionCancelAtPeriodEndInput,
  UpdateAdminSubscriptionExpiresAtInput,
  UpdateAdminSubscriptionTierInput,
} from "./admin-subscription.schema";

type PrismaClient = typeof prisma;

type SubscriptionRecord = {
  id: string;
  tier: string;
  status: string;
  billingInterval: string | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  endedAt: Date | null;
  stripePriceId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null;

const adminSubscriptionUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  subscription: {
    select: {
      id: true,
      tier: true,
      status: true,
      billingInterval: true,
      cancelAtPeriodEnd: true,
      expiresAt: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      trialEnd: true,
      endedAt: true,
      stripePriceId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

type AdminSubscriptionUserRecord = Prisma.UserGetPayload<{
  select: typeof adminSubscriptionUserSelect;
}>;

function normalizeAdminSubscription(subscription: SubscriptionRecord) {
  const tierResult = subscriptionTierSchema.safeParse(subscription?.tier ?? "free");
  const billingIntervalResult = subscriptionBillingIntervalSchema.safeParse(
    subscription?.billingInterval ?? null
  );

  return {
    subscriptionId: subscription?.id ?? null,
    tier: tierResult.success ? tierResult.data : "free",
    status: subscription?.status ?? "active",
    billingInterval: billingIntervalResult.success ? billingIntervalResult.data : null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    expiresAt:
      subscription?.expiresAt ??
      subscription?.currentPeriodEnd ??
      subscription?.trialEnd ??
      subscription?.endedAt ??
      null,
    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    stripePriceId: subscription?.stripePriceId ?? null,
    stripeCustomerId: subscription?.stripeCustomerId ?? null,
    stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
    updatedAt: subscription?.updatedAt ?? null,
  };
}

function mapAdminSubscriptionRow(user: AdminSubscriptionUserRecord) {
  const normalized = normalizeAdminSubscription(user.subscription);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    ...normalized,
  };
}

async function getAdminSubscriptionUser(
  db: Pick<PrismaClient, "user">,
  userId: string
) {
  return db.user.findUnique({
    where: { id: userId },
    select: adminSubscriptionUserSelect,
  });
}

function buildSubscriptionListWhere(
  input: ListAdminSubscriptionsInput
): Prisma.UserWhereInput {
  const andFilters: Prisma.UserWhereInput[] = [];

  if (input.query) {
    andFilters.push({
      OR: [
        { name: { contains: input.query, mode: "insensitive" } },
        { email: { contains: input.query, mode: "insensitive" } },
      ],
    });
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

  if (input.status) {
    if (input.status === "active") {
      andFilters.push({
        OR: [
          { subscription: { is: null } },
          { subscription: { is: { status: input.status } } },
        ],
      });
    } else {
      andFilters.push({
        subscription: {
          is: { status: input.status },
        },
      });
    }
  }

  if (input.billingInterval) {
    andFilters.push({
      subscription: {
        is: {
          billingInterval: input.billingInterval,
        },
      },
    });
  }

  if (input.cancelAtPeriodEnd !== undefined) {
    if (input.cancelAtPeriodEnd) {
      andFilters.push({
        subscription: {
          is: {
            cancelAtPeriodEnd: true,
          },
        },
      });
    } else {
      andFilters.push({
        OR: [
          { subscription: { is: null } },
          {
            subscription: {
              is: {
                cancelAtPeriodEnd: false,
              },
            },
          },
        ],
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

  if (andFilters.length === 0) {
    return {};
  }

  return {
    AND: andFilters,
  };
}

export async function listAdminSubscriptions(
  db: PrismaClient,
  input: ListAdminSubscriptionsInput
) {
  const users = await db.user.findMany({
    where: buildSubscriptionListWhere(input),
    take: input.limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: adminSubscriptionUserSelect,
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
    items: users.map(mapAdminSubscriptionRow),
    nextCursor,
  };
}

interface AdminSubscriptionMutationContext {
  adminUserId: string;
  userId: string;
}

interface UpdateAdminSubscriptionTierParams
  extends AdminSubscriptionMutationContext,
    UpdateAdminSubscriptionTierInput {}

interface UpdateAdminSubscriptionExpiresAtParams
  extends AdminSubscriptionMutationContext,
    UpdateAdminSubscriptionExpiresAtInput {}

interface UpdateAdminSubscriptionCancelAtPeriodEndParams
  extends AdminSubscriptionMutationContext,
    UpdateAdminSubscriptionCancelAtPeriodEndInput {}

export async function updateAdminSubscriptionTier(
  db: PrismaClient,
  input: UpdateAdminSubscriptionTierParams
) {
  const existingUser = await getAdminSubscriptionUser(db, input.userId);

  if (!existingUser) {
    return null;
  }

  const previous = normalizeAdminSubscription(existingUser.subscription);

  const updatedUser = await db.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: {
        userId: input.userId,
      },
      update: {
        tier: input.tier,
      },
      create: {
        userId: input.userId,
        tier: input.tier,
        status: "active",
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SUBSCRIPTION_TIER_UPDATED",
      targetType: "SUBSCRIPTION",
      targetId: existingUser.subscription?.id ?? input.userId,
      metadata: {
        previous: {
          tier: previous.tier,
        },
        next: {
          tier: input.tier,
        },
      },
    });

    return getAdminSubscriptionUser(tx, input.userId);
  });

  if (!updatedUser) {
    return null;
  }

  return mapAdminSubscriptionRow(updatedUser);
}

export async function updateAdminSubscriptionExpiresAt(
  db: PrismaClient,
  input: UpdateAdminSubscriptionExpiresAtParams
) {
  const existingUser = await getAdminSubscriptionUser(db, input.userId);

  if (!existingUser) {
    return null;
  }

  const previous = normalizeAdminSubscription(existingUser.subscription);
  const nextExpiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  const updatedUser = await db.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: {
        userId: input.userId,
      },
      update: {
        expiresAt: nextExpiresAt,
      },
      create: {
        userId: input.userId,
        tier: "free",
        status: "active",
        expiresAt: nextExpiresAt,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SUBSCRIPTION_EXPIRES_AT_UPDATED",
      targetType: "SUBSCRIPTION",
      targetId: existingUser.subscription?.id ?? input.userId,
      metadata: {
        previous: {
          expiresAt: previous.expiresAt?.toISOString(),
        },
        next: {
          expiresAt: nextExpiresAt?.toISOString(),
        },
      },
    });

    return getAdminSubscriptionUser(tx, input.userId);
  });

  if (!updatedUser) {
    return null;
  }

  return mapAdminSubscriptionRow(updatedUser);
}

export async function updateAdminSubscriptionCancelAtPeriodEnd(
  db: PrismaClient,
  input: UpdateAdminSubscriptionCancelAtPeriodEndParams
) {
  const existingUser = await getAdminSubscriptionUser(db, input.userId);

  if (!existingUser) {
    return null;
  }

  const previous = normalizeAdminSubscription(existingUser.subscription);

  const updatedUser = await db.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: {
        userId: input.userId,
      },
      update: {
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        cancelAt: input.cancelAtPeriodEnd
          ? existingUser.subscription?.currentPeriodEnd ?? null
          : null,
      },
      create: {
        userId: input.userId,
        tier: "free",
        status: "active",
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        cancelAt: null,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SUBSCRIPTION_CANCEL_AT_PERIOD_END_UPDATED",
      targetType: "SUBSCRIPTION",
      targetId: existingUser.subscription?.id ?? input.userId,
      metadata: {
        previous: {
          cancelAtPeriodEnd: previous.cancelAtPeriodEnd,
        },
        next: {
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        },
      },
    });

    return getAdminSubscriptionUser(tx, input.userId);
  });

  if (!updatedUser) {
    return null;
  }

  return mapAdminSubscriptionRow(updatedUser);
}
