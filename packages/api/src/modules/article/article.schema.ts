import { z } from "zod";

export const articleIdSchema = z.object({
  id: z.string(),
});

export const listArticlesSchema = z.object({
  feedId: z.string().optional(),
  saved: z.boolean().optional(),
  read: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export const articleListOutputSchema = z.object({
  items: z.array(z.any()), // Will use Prisma type
  nextCursor: z.string().optional(),
});
