import prisma from "@NewsFlow/db";

import {
  subscriptionBillingIntervalSchema,
  subscriptionTierSchema,
} from "./subscription.schema";

type PrismaClient = typeof prisma;

function normalizeSubscription<T extends {
  tier: string;
  billingInterval: string | null;
  expiresAt: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  endedAt: Date | null;
}>(subscription: T) {
  const tierResult = subscriptionTierSchema.safeParse(subscription.tier);
  const billingIntervalResult = subscriptionBillingIntervalSchema.safeParse(
    subscription.billingInterval
  );
  const resolvedExpiresAt =
    subscription.expiresAt ??
    subscription.currentPeriodEnd ??
    subscription.trialEnd ??
    subscription.endedAt ??
    null;

  return {
    ...subscription,
    tier: tierResult.success ? tierResult.data : "free",
    billingInterval: billingIntervalResult.success
      ? billingIntervalResult.data
      : null,
    expiresAt: resolvedExpiresAt,
  };
}

export async function getOrCreateSubscription(
  db: PrismaClient,
  userId: string
) {
  const existing = await db.subscription.findUnique({
    where: { userId },
  });

  if (existing) {
    return normalizeSubscription(existing);
  }

  const created = await db.subscription.create({
    data: {
      userId,
      tier: "free",
      status: "active",
    },
  });

  return normalizeSubscription(created);
}
