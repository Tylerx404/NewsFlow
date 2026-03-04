import prisma from "@NewsFlow/db";

import {
  subscriptionBillingIntervalSchema,
  subscriptionTierSchema,
} from "./subscription.schema";

type PrismaClient = typeof prisma;

function normalizeSubscription<T extends {
  tier: string;
  billingInterval: string | null;
}>(subscription: T) {
  const tierResult = subscriptionTierSchema.safeParse(subscription.tier);
  const billingIntervalResult = subscriptionBillingIntervalSchema.safeParse(
    subscription.billingInterval
  );

  return {
    ...subscription,
    tier: tierResult.success ? tierResult.data : "free",
    billingInterval: billingIntervalResult.success
      ? billingIntervalResult.data
      : null,
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
