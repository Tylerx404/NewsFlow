import { z } from "zod";

export const authConfigSchema = z.object({
  appleEnabled: z.boolean(),
  googleEnabled: z.boolean(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
