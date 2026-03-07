import { z } from "zod";

import {
  subscriptionBillingIntervalSchema,
  subscriptionTierSchema,
} from "../subscription/subscription.schema";

export const adminUserRoleSchema = z.enum(["USER", "ADMIN"]);
export const adminUserStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

export const adminUserIdSchema = z.object({
  userId: z.string(),
});

export const adminUserListCursorSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
});

export const listAdminUsersSchema = z.object({
  query: z.string().trim().min(1).optional(),
  role: adminUserRoleSchema.optional(),
  status: adminUserStatusSchema.optional(),
  tier: subscriptionTierSchema.optional(),
  cursor: adminUserListCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const adminUserSubscriptionSummarySchema = z.object({
  tier: subscriptionTierSchema,
  status: z.string(),
  billingInterval: subscriptionBillingIntervalSchema.nullable(),
  expiresAt: z.date().nullable(),
});

export const adminUserListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role: adminUserRoleSchema,
  status: adminUserStatusSchema,
  createdAt: z.date(),
  feedCount: z.number().int(),
  subscription: adminUserSubscriptionSummarySchema,
});

export const adminUserListOutputSchema = z.object({
  items: z.array(adminUserListItemSchema),
  nextCursor: adminUserListCursorSchema.optional(),
});

export const adminUserDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role: adminUserRoleSchema,
  status: adminUserStatusSchema,
  suspendedAt: z.date().nullable(),
  suspendedReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  feedCount: z.number().int(),
  subscription: adminUserSubscriptionSummarySchema,
});

export const suspendAdminUserSchema = z.object({
  userId: z.string(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const reactivateAdminUserSchema = z.object({
  userId: z.string(),
});

export type ListAdminUsersInput = z.infer<typeof listAdminUsersSchema>;
export type SuspendAdminUserInput = z.infer<typeof suspendAdminUserSchema>;
export type ReactivateAdminUserInput = z.infer<typeof reactivateAdminUserSchema>;
