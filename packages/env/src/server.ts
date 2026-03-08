import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    SHADOW_DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    AI_KEY_ENCRYPTION_SECRET: z.string().min(32),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: {
    ...process.env,
  },
  emptyStringAsUndefined: true,
});
