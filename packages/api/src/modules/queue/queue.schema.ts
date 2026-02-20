import { z } from "zod";

// Job definitions and data types
export interface RssFetchJobData {
  feedId: string;
  userId: string;
  force?: boolean;
}

export interface ContentExtractJobData {
  articleId: string;
  url: string;
}

// Job constants
export const RSS_FETCH_JOB = 'rss-fetch';
export const CONTENT_EXTRACT_JOB = 'content-extract';

// Zod schemas
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
