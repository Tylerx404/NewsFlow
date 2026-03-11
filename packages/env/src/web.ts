import { createEnv } from "@t3-oss/env-nuxt";
import { z } from "zod";

/**
 * Nuxt env validation - validates at build time when imported in nuxt.config.ts
 * For runtime access in components/plugins, use useRuntimeConfig() instead:
 *   const config = useRuntimeConfig()
 *   config.public.serverUrl (NUXT_PUBLIC_SERVER_URL maps to serverUrl)
 */
if (process.env.NODE_ENV !== "production") {
  process.env.NUXT_PUBLIC_SITE_URL ??= "http://localhost:3001";
  process.env.NUXT_PUBLIC_SERVER_URL ??= "http://localhost:3000";
}

export const env = createEnv({
  client: {
    NUXT_PUBLIC_SITE_URL: z.url(),
    NUXT_PUBLIC_SERVER_URL: z.url(),
  },
  emptyStringAsUndefined: true,
});
