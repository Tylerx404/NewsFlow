import prisma from "@NewsFlow/db";
import { env } from "@NewsFlow/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getOAuthProviderConfig } from "./oauth-config";

const isProduction = env.NODE_ENV === "production";

const oauthProviders = await getOAuthProviderConfig(prisma);
const hasSocialProviders = Object.keys(oauthProviders).length > 0;
const trustedOrigins = [env.CORS_ORIGIN];

if (oauthProviders.apple) {
  trustedOrigins.push("https://appleid.apple.com");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN"],
        required: false,
        input: false,
      },
      status: {
        type: ["ACTIVE", "SUSPENDED"],
        required: false,
        input: false,
      },
    },
  },

  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: hasSocialProviders ? oauthProviders : undefined,
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      httpOnly: true,
    },
  },
});
