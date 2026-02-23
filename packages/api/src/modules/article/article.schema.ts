import { z } from "zod";

export const articleIdSchema = z.object({
  id: z.string(),
});

export const listArticlesSchema = z.object({
  feedId: z.string().optional(),
  saved: z.boolean().optional(),
  read: z.boolean().optional(),
  query: z.string().trim().min(1).optional(),
  cursor: z
    .object({
      id: z.string(),
      pubDate: z.string().datetime(),
    })
    .optional(),
  limit: z.number().min(1).max(50).default(20),
});

export const articleListItemSchema = z.object({
  id: z.string(),
  feedId: z.string(),
  guid: z.string(),
  title: z.string(),
  link: z.string(),
  author: z.string().nullable(),
  pubDate: z.date(),
  content: z.string().nullable(),
  excerpt: z.string().nullable(),
  image: z.string().nullable(),
  categories: z.array(z.string()),
  read: z.boolean(),
  saved: z.boolean(),
  contentExtracted: z.boolean(),
  extractionAttempts: z.number().int(),
  lastExtractionError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  feed: z.object({
    title: z.string(),
    iconUrl: z.string().nullable(),
  }),
});

export const articleListOutputSchema = z.object({
  items: z.array(articleListItemSchema),
  nextCursor: z
    .object({
      id: z.string(),
      pubDate: z.string().datetime(),
    })
    .optional(),
});

export const articleStatsSchema = z.object({
  feedId: z.string().optional(),
});

export const articleStatsOutputSchema = z.object({
  all: z.number().int(),
  unread: z.number().int(),
  saved: z.number().int(),
});
