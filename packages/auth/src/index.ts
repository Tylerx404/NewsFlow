import prisma from "@NewsFlow/db";
import { env } from "@NewsFlow/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const isProduction = env.NODE_ENV === "production";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
      },
      countryCode: {
        type: "string",
        required: false,
        input: false,
      },
      countrySource: {
        type: ["PHONE", "IP", "ACCEPT_LANGUAGE", "DEFAULT"],
        required: false,
        input: false,
      },
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

  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      httpOnly: true,
    },
  },
});
