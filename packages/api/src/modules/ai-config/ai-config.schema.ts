import { z } from "zod";

export const ProviderEnum = z.enum([
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "groq",
  "ollama",
]);

export const createAiConfigSchema = z.object({
  name: z.string().min(1).max(100),
  provider: ProviderEnum,
  model: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

export const updateAiConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  provider: ProviderEnum.optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const aiConfigIdSchema = z.object({
  id: z.string(),
});

export const fetchModelsSchema = z
  .object({
    aiConfigId: z.string().optional(),
    provider: ProviderEnum.optional(),
    apiKey: z.string().min(1).optional(),
    baseUrl: z.string().url().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.aiConfigId) {
      return;
    }

    if (!value.provider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provider"],
        message: "Provider is required when aiConfigId is not provided.",
      });
      return;
    }

    if (value.provider !== "ollama" && !value.apiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apiKey"],
        message: "API key is required for this provider.",
      });
    }
  });

export const fetchModelsOutputSchema = z.object({
  models: z.array(z.string()),
});

export const maskedAiConfigSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  apiKey: z.string(), // masked
  baseUrl: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateAiConfigInput = z.infer<typeof createAiConfigSchema>;
export type UpdateAiConfigInput = z.infer<typeof updateAiConfigSchema>;
export type Provider = z.infer<typeof ProviderEnum>;
