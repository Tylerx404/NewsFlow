import { z } from "zod";

export const createFeedSchema = z.object({
  url: z.string().url(),
});

export const feedIdSchema = z.object({
  id: z.string(),
});

export const updateFeedSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listFeedsSchema = z.object({
  category: z.string().optional(),
});

export const listSidebarFeedsSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export const discoverFeedsSchema = z.object({
  category: z.string().optional(),
});

export const refreshFeedSchema = z.object({
  id: z.string(),
});

export const feedSchema = z.object({
  id: z.string(),
  userId: z.string(),
  url: z.string(),
  siteUrl: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  iconUrl: z.string().nullable(),
  language: z.string().nullable(),
  isActive: z.boolean(),
  lastFetched: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const sidebarFeedSchema = feedSchema.extend({
  unreadCount: z.number().int(),
  lastError: z.string().nullable(),
  errorCount: z.number().int(),
  nextFetchAt: z.date().nullable(),
});

export const discoverFeedItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  language: z.string().nullable(),
  siteUrl: z.string().nullable(),
});
