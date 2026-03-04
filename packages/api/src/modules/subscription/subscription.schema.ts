import { z } from "zod";

export const subscriptionTierSchema = z.enum(["free", "basic", "pro", "max"]);
export const subscriptionBillingIntervalSchema = z.enum(["monthly", "yearly"]);

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tier: subscriptionTierSchema,
  status: z.string(),
  billingInterval: subscriptionBillingIntervalSchema.nullable(),
  stripePriceId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  trialStart: z.date().nullable(),
  trialEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  cancelAt: z.date().nullable(),
  canceledAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  seats: z.number().int().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
