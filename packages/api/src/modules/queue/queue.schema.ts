import { z } from "zod";

export const queueNamesSchema = z.enum(["rss-fetch", "content-extract"]);

export const rssFetchJobSchema = z.object({
  feedId: z.string(),
  userId: z.string(),
});

export const contentExtractJobSchema = z.object({
  articleId: z.string(),
  url: z.string().url(),
});

export const jobStatusSchema = z.object({
  running: z.boolean(),
  timestamp: z.string().datetime(),
});
