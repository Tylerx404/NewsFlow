import { z } from "zod";

export const createFeedSubscriptionSchema = z.object({
  url: z.string().url(),
});

export const feedSubscriptionIdSchema = z.object({
  id: z.string(),
});

export const updateFeedSubscriptionSchema = z.object({
  id: z.string(),
  customTitle: z.string().trim().min(1).optional().nullable(),
  category: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listFeedSubscriptionsSchema = z.object({
  category: z.string().optional(),
});

export const listSidebarFeedSubscriptionsSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export const discoverFeedSubscriptionsSchema = z.object({
  category: z.string().optional(),
});

export const refreshFeedSubscriptionSchema = z.object({
  id: z.string(),
});

export const feedSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  feedSourceId: z.string(),
  customTitle: z.string().nullable(),
  sourceTitle: z.string(),
  title: z.string(),
  url: z.string(),
  normalizedUrl: z.string(),
  siteUrl: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  iconUrl: z.string().nullable(),
  language: z.string().nullable(),
  isActive: z.boolean(),
  lastFetched: z.date().nullable(),
  lastError: z.string().nullable(),
  errorCount: z.number().int(),
  nextFetchAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const sidebarFeedSubscriptionSchema = feedSubscriptionSchema.extend({
  unreadCount: z.number().int(),
});

export const discoverFeedSubscriptionItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  language: z.string().nullable(),
  siteUrl: z.string().nullable(),
});
