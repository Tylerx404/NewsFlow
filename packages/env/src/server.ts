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
    STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, "Invalid Stripe secret key format"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "Invalid Stripe webhook secret format"),
    STRIPE_PRICE_BASIC_MONTHLY: z.string().startsWith("price_", "Invalid Stripe price id format"),
    STRIPE_PRICE_BASIC_YEARLY: z.string().startsWith("price_", "Invalid Stripe price id format"),
    STRIPE_PRICE_PRO_MONTHLY: z.string().startsWith("price_", "Invalid Stripe price id format"),
    STRIPE_PRICE_PRO_YEARLY: z.string().startsWith("price_", "Invalid Stripe price id format"),
    STRIPE_PRICE_MAX_MONTHLY: z.string().startsWith("price_", "Invalid Stripe price id format"),
    STRIPE_PRICE_MAX_YEARLY: z.string().startsWith("price_", "Invalid Stripe price id format"),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: {
    ...process.env,
    // Backward compatibility: accept old single-price keys as monthly if still present.
    STRIPE_PRICE_BASIC_MONTHLY:
      process.env.STRIPE_PRICE_BASIC_MONTHLY ?? process.env.STRIPE_PRICE_BASIC,
    STRIPE_PRICE_PRO_MONTHLY:
      process.env.STRIPE_PRICE_PRO_MONTHLY ?? process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_MAX_MONTHLY:
      process.env.STRIPE_PRICE_MAX_MONTHLY ?? process.env.STRIPE_PRICE_MAX,
  },
  emptyStringAsUndefined: true,
});
