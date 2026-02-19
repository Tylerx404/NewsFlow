import { z } from "zod";

export const summarizeSchema = z.object({
  articleId: z.string(),
  aiConfigId: z.string().optional(),
});

export const summarizeOutputSchema = z.object({
  summary: z.string(),
  tokens: z.number(),
});
