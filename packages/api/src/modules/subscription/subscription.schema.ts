import { z } from "zod";

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tier: z.string(),
  status: z.string(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
