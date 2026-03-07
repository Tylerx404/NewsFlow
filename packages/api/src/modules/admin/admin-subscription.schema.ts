import { z } from "zod";

import {
  subscriptionBillingIntervalSchema,
  subscriptionTierSchema,
} from "../subscription/subscription.schema";

export const adminSubscriptionStatusFilterSchema = z.string().trim().min(1);

export const adminSubscriptionCursorSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
});

export const listAdminSubscriptionsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  tier: subscriptionTierSchema.optional(),
  status: adminSubscriptionStatusFilterSchema.optional(),
  billingInterval: subscriptionBillingIntervalSchema.optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  cursor: adminSubscriptionCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const adminSubscriptionRowSchema = z.object({
  userId: z.string(),
  subscriptionId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  tier: subscriptionTierSchema,
  status: z.string(),
  billingInterval: subscriptionBillingIntervalSchema.nullable(),
  cancelAtPeriodEnd: z.boolean(),
  expiresAt: z.date().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  stripePriceId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export const adminSubscriptionListOutputSchema = z.object({
  items: z.array(adminSubscriptionRowSchema),
  nextCursor: adminSubscriptionCursorSchema.optional(),
});

export const adminSubscriptionUserIdSchema = z.object({
  userId: z.string(),
});

export const updateAdminSubscriptionTierSchema = z.object({
  userId: z.string(),
  tier: subscriptionTierSchema,
});

export const updateAdminSubscriptionExpiresAtSchema = z.object({
  userId: z.string(),
  expiresAt: z.string().datetime().nullable(),
});

export const updateAdminSubscriptionCancelAtPeriodEndSchema = z.object({
  userId: z.string(),
  cancelAtPeriodEnd: z.boolean(),
});

export type ListAdminSubscriptionsInput = z.infer<typeof listAdminSubscriptionsSchema>;
export type UpdateAdminSubscriptionTierInput = z.infer<
  typeof updateAdminSubscriptionTierSchema
>;
export type UpdateAdminSubscriptionExpiresAtInput = z.infer<
  typeof updateAdminSubscriptionExpiresAtSchema
>;
export type UpdateAdminSubscriptionCancelAtPeriodEndInput = z.infer<
  typeof updateAdminSubscriptionCancelAtPeriodEndSchema
>;
