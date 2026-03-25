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

const nullableTrimmedStringSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const optionalSecretStringSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

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

export const adminStripeConfigSchema = z.object({
  publishableKey: z.string().nullable(),
  secretKeyMasked: z.string().nullable(),
  webhookSecretMasked: z.string().nullable(),
  hasSecretKey: z.boolean(),
  hasWebhookSecret: z.boolean(),
  priceBasicMonthly: z.string().nullable(),
  priceBasicYearly: z.string().nullable(),
  priceProMonthly: z.string().nullable(),
  priceProYearly: z.string().nullable(),
  priceMaxMonthly: z.string().nullable(),
  priceMaxYearly: z.string().nullable(),
  isConfigured: z.boolean(),
  updatedByUserId: z.string().nullable(),
  updatedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
});

export const adminStripeConfigUpdateSchema = z.object({
  publishableKey: nullableTrimmedStringSchema.optional(),
  secretKey: optionalSecretStringSchema,
  webhookSecret: optionalSecretStringSchema,
  priceBasicMonthly: nullableTrimmedStringSchema.optional(),
  priceBasicYearly: nullableTrimmedStringSchema.optional(),
  priceProMonthly: nullableTrimmedStringSchema.optional(),
  priceProYearly: nullableTrimmedStringSchema.optional(),
  priceMaxMonthly: nullableTrimmedStringSchema.optional(),
  priceMaxYearly: nullableTrimmedStringSchema.optional(),
});

export const adminOAuthConfigSchema = z.object({
  googleClientId: z.string().nullable(),
  googleClientSecretMasked: z.string().nullable(),
  hasGoogleClientSecret: z.boolean(),
  appleClientId: z.string().nullable(),
  appleClientSecretMasked: z.string().nullable(),
  hasAppleClientSecret: z.boolean(),
  appleAppBundleIdentifier: z.string().nullable(),
  isGoogleConfigured: z.boolean(),
  isAppleConfigured: z.boolean(),
  updatedByUserId: z.string().nullable(),
  updatedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
});

export const adminOAuthConfigUpdateSchema = z.object({
  googleClientId: nullableTrimmedStringSchema.optional(),
  googleClientSecret: optionalSecretStringSchema,
  appleClientId: nullableTrimmedStringSchema.optional(),
  appleClientSecret: optionalSecretStringSchema,
  appleAppBundleIdentifier: nullableTrimmedStringSchema.optional(),
});

export const adminSmtpConfigSchema = z.object({
  host: z.string().nullable(),
  port: z.number().int().nullable(),
  secure: z.boolean(),
  username: z.string().nullable(),
  passwordMasked: z.string().nullable(),
  hasPassword: z.boolean(),
  fromEmail: z.string().nullable(),
  fromName: z.string().nullable(),
  isConfigured: z.boolean(),
  updatedByUserId: z.string().nullable(),
  updatedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
});

export const adminSmtpConfigUpdateSchema = z.object({
  host: nullableTrimmedStringSchema.optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  secure: z.boolean().optional(),
  username: nullableTrimmedStringSchema.optional(),
  password: optionalSecretStringSchema,
  fromEmail: nullableTrimmedStringSchema.optional(),
  fromName: nullableTrimmedStringSchema.optional(),
});

export const sendAdminSmtpTestEmailSchema = z.object({
  toEmail: z.email(),
});

export const sendAdminSmtpTestEmailOutputSchema = z.object({
  sent: z.boolean(),
  toEmail: z.email(),
});

export const adminAuthSigningKeyConfigSchema = z.object({
  algorithm: z.string(),
  publicKeyPem: z.string().nullable(),
  publicKeyFingerprint: z.string().nullable(),
  privateKeyMasked: z.string().nullable(),
  hasPrivateKey: z.boolean(),
  isConfigured: z.boolean(),
  updatedByUserId: z.string().nullable(),
  updatedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
});

export const adminAuthSigningKeyConfigUpdateSchema = z.object({
  publicKeyPem: nullableTrimmedStringSchema.optional(),
  privateKeyPem: optionalSecretStringSchema,
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
export type UpdateAdminStripeConfigInput = z.infer<
  typeof adminStripeConfigUpdateSchema
>;
export type UpdateAdminOAuthConfigInput = z.infer<
  typeof adminOAuthConfigUpdateSchema
>;
export type UpdateAdminSmtpConfigInput = z.infer<
  typeof adminSmtpConfigUpdateSchema
>;
export type SendAdminSmtpTestEmailInput = z.infer<
  typeof sendAdminSmtpTestEmailSchema
>;
export type UpdateAdminAuthSigningKeyConfigInput = z.infer<
  typeof adminAuthSigningKeyConfigUpdateSchema
>;
