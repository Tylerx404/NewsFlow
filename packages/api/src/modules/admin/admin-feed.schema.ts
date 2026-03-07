import { z } from "zod";

export const adminFeedCursorSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
});

export const listAdminFeedsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  isEnabled: z.boolean().optional(),
  hasErrors: z.boolean().optional(),
  isStale: z.boolean().optional(),
  hasExtractionFailures: z.boolean().optional(),
  cursor: adminFeedCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const adminFeedListItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  normalizedUrl: z.string(),
  siteUrl: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  iconUrl: z.string().nullable(),
  language: z.string().nullable(),
  isEnabled: z.boolean(),
  errorCount: z.number().int(),
  lastError: z.string().nullable(),
  lastFetched: z.date().nullable(),
  nextFetchAt: z.date().nullable(),
  subscriptionCount: z.number().int(),
  articleCount: z.number().int(),
  extractionFailureCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const adminFeedListOutputSchema = z.object({
  items: z.array(adminFeedListItemSchema),
  nextCursor: adminFeedCursorSchema.optional(),
});

export const adminFeedArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string(),
  pubDate: z.date(),
  contentExtracted: z.boolean(),
  extractionAttempts: z.number().int(),
  lastExtractionError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const adminFeedFailureSchema = z.object({
  sourceArticleId: z.string(),
  title: z.string(),
  extractionAttempts: z.number().int(),
  lastExtractionError: z.string(),
  updatedAt: z.date(),
});

export const adminFeedDetailSchema = adminFeedListItemSchema.extend({
  recentArticles: z.array(adminFeedArticleSchema),
  recentFailures: z.array(adminFeedFailureSchema),
});

export const adminFeedIdSchema = z.object({
  feedSourceId: z.string(),
});

export const updateAdminFeedEnabledSchema = z.object({
  feedSourceId: z.string(),
  isEnabled: z.boolean(),
});

export const retryAdminFeedFetchOutputSchema = z.object({
  queued: z.boolean(),
  feedSourceId: z.string(),
});

export const retryAdminFeedExtractionOutputSchema = z.object({
  queued: z.boolean(),
  feedSourceId: z.string(),
  queuedCount: z.number().int(),
});

export const retryAdminArticleExtractionSchema = z.object({
  sourceArticleId: z.string(),
});

export const retryAdminArticleExtractionOutputSchema = z.object({
  queued: z.boolean(),
  feedSourceId: z.string(),
  sourceArticleId: z.string(),
});

export type ListAdminFeedsInput = z.infer<typeof listAdminFeedsSchema>;
