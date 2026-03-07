import { z } from "zod";

export const adminQueueNameSchema = z.enum(["rss-fetch", "content-extract"]);
export const adminQueueJobStateSchema = z.enum([
  "waiting",
  "active",
  "failed",
  "delayed",
  "completed",
]);

export const adminSystemOpsOverviewSchema = z.object({});

export const adminHeartbeatStateSchema = z.enum([
  "healthy",
  "stale",
  "offline",
  "unknown",
]);

export const adminHeartbeatSummarySchema = z.object({
  state: adminHeartbeatStateSchema,
  lastSeenAt: z.date().nullable(),
  ageMs: z.number().int().nullable(),
});

export const adminQueueCountSchema = z.object({
  queueName: adminQueueNameSchema,
  waiting: z.number().int(),
  active: z.number().int(),
  failed: z.number().int(),
  delayed: z.number().int(),
  completed: z.number().int(),
});

export const adminQueueJobPayloadSchema = z.object({
  feedSourceId: z.string().optional(),
  sourceArticleId: z.string().optional(),
  url: z.string().optional(),
  force: z.boolean().optional(),
});

export const adminQueueJobSchema = z.object({
  jobId: z.string(),
  queueName: adminQueueNameSchema,
  name: z.string(),
  state: adminQueueJobStateSchema,
  attemptsMade: z.number().int(),
  maxAttempts: z.number().int().nullable(),
  failedReason: z.string().nullable(),
  timestamp: z.date(),
  processedOn: z.date().nullable(),
  finishedOn: z.date().nullable(),
  payload: adminQueueJobPayloadSchema.nullable(),
});

export const adminSystemOpsOverviewOutputSchema = z.object({
  runtime: z.object({
    worker: adminHeartbeatSummarySchema,
    rssScheduler: adminHeartbeatSummarySchema,
    contentScheduler: adminHeartbeatSummarySchema,
  }),
  queues: z.array(adminQueueCountSchema),
  failedJobCount: z.number().int(),
  staleFeedCount: z.number().int(),
  extractionBacklogCount: z.number().int(),
  recentFailedJobs: z.array(adminQueueJobSchema),
});

export const listAdminQueueJobsSchema = z.object({
  queueName: adminQueueNameSchema.optional(),
  states: z.array(adminQueueJobStateSchema).min(1).max(5).default(["failed"]),
  limit: z.number().int().min(1).max(100).default(30),
});

export const adminQueueJobsOutputSchema = z.object({
  items: z.array(adminQueueJobSchema),
});

export const retryAdminQueueJobSchema = z.object({
  queueName: adminQueueNameSchema,
  jobId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const retryAdminQueueJobOutputSchema = z.object({
  queued: z.boolean(),
  queueName: adminQueueNameSchema,
  jobId: z.string(),
});

export const triggerAdminFeedFetchSchema = z.object({
  feedSourceId: z.string(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const triggerAdminContentExtractSchema = z.object({
  sourceArticleId: z.string(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const adminOpsActionOutputSchema = z.object({
  queued: z.boolean(),
  queueName: adminQueueNameSchema,
  jobId: z.string(),
});

export type AdminQueueName = z.infer<typeof adminQueueNameSchema>;
export type AdminQueueJobState = z.infer<typeof adminQueueJobStateSchema>;
export type ListAdminQueueJobsInput = z.infer<typeof listAdminQueueJobsSchema>;
export type RetryAdminQueueJobInput = z.infer<typeof retryAdminQueueJobSchema>;
export type TriggerAdminFeedFetchInput = z.infer<typeof triggerAdminFeedFetchSchema>;
export type TriggerAdminContentExtractInput = z.infer<
  typeof triggerAdminContentExtractSchema
>;
