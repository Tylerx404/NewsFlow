import { z } from "zod";

export const adminAiUsageStatusSchema = z.enum(["SUCCESS", "FAILED"]);

export const adminAiUsageOverviewSchema = z.object({
  days: z.number().int().min(1).max(90).default(7),
});

export const listAdminAiUsageEventsSchema = z.object({
  provider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  userQuery: z.string().trim().min(1).optional(),
  status: adminAiUsageStatusSchema.optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const adminAiUsageEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  provider: z.string(),
  model: z.string(),
  tokens: z.number().int(),
  action: z.string(),
  status: adminAiUsageStatusSchema,
  durationMs: z.number().int().nullable(),
  errorSummary: z.string().nullable(),
  createdAt: z.date(),
});

export const adminAiUsageEventsOutputSchema = z.object({
  items: z.array(adminAiUsageEventSchema),
});

export const adminAiUsageTopUserSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  tokens: z.number().int(),
  requestCount: z.number().int(),
  failureCount: z.number().int(),
});

export const adminAiUsageProviderModelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  tokens: z.number().int(),
  requestCount: z.number().int(),
  failureCount: z.number().int(),
});

export const adminAiUsageFailureSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  provider: z.string(),
  model: z.string(),
  errorSummary: z.string(),
  createdAt: z.date(),
});

export const adminAiUsageOverviewOutputSchema = z.object({
  periodDays: z.number().int(),
  totalTokens: z.number().int(),
  totalRequests: z.number().int(),
  failureCount: z.number().int(),
  topUsers: z.array(adminAiUsageTopUserSchema),
  providerModelBreakdown: z.array(adminAiUsageProviderModelSchema),
  recentFailures: z.array(adminAiUsageFailureSchema),
});

export const adminAiUsageUserUsageSchema = z.object({
  userId: z.string(),
  days: z.number().int().min(1).max(180).default(30),
});

export const adminAiUsageUserUsageOutputSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  periodDays: z.number().int(),
  totalTokens: z.number().int(),
  totalRequests: z.number().int(),
  failureCount: z.number().int(),
  providerModelBreakdown: z.array(adminAiUsageProviderModelSchema),
  recentEvents: z.array(adminAiUsageEventSchema),
});

export const updateAdminAiConfigEnabledSchema = z.object({
  aiConfigId: z.string(),
  isEnabled: z.boolean(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const adminAiConfigSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  baseUrl: z.string().nullable(),
  isDefault: z.boolean(),
  isEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AdminAiUsageStatus = z.infer<typeof adminAiUsageStatusSchema>;
export type ListAdminAiUsageEventsInput = z.infer<typeof listAdminAiUsageEventsSchema>;
export type AdminAiUsageOverviewInput = z.infer<typeof adminAiUsageOverviewSchema>;
export type AdminAiUsageUserUsageInput = z.infer<typeof adminAiUsageUserUsageSchema>;
export type UpdateAdminAiConfigEnabledInput = z.infer<
  typeof updateAdminAiConfigEnabledSchema
>;
