import { z } from "zod";

// Job definitions and data types
export interface RssFetchJobData {
  feedSourceId: string;
  force?: boolean;
}

export interface ContentExtractJobData {
  sourceArticleId: string;
  url: string;
}

// Job constants
export const RSS_FETCH_JOB = "rss-fetch";
export const CONTENT_EXTRACT_JOB = "content-extract";

// Zod schemas
export const queueNamesSchema = z.enum(["rss-fetch", "content-extract"]);

export const rssFetchJobSchema = z.object({
  feedSourceId: z.string(),
  force: z.boolean().optional(),
});

export const contentExtractJobSchema = z.object({
  sourceArticleId: z.string(),
  url: z.string().url(),
});

export const jobStatusSchema = z.object({
  running: z.boolean(),
  timestamp: z.string().datetime(),
});
