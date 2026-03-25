import prisma from "@NewsFlow/db";
import { env } from "@NewsFlow/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { adminEmailVerificationBypassPlugin } from "./admin-email-verification-bypass";
import { isEmailVerificationRequired } from "./email-verification-policy";
import { getOAuthProviderConfig } from "./oauth-config";
import { sendVerificationEmailWithSmtp } from "./smtp-mailer";

const requireEmailVerification = isEmailVerificationRequired();

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

  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification,
  },
  emailVerification: {
    sendOnSignUp: requireEmailVerification,
    sendOnSignIn: requireEmailVerification,
    autoSignInAfterVerification: false,
    async sendVerificationEmail(data) {
      await sendVerificationEmailWithSmtp(data, prisma);
    },
  },
  socialProviders: hasSocialProviders ? oauthProviders : undefined,
  plugins: [adminEmailVerificationBypassPlugin()],
  advanced: {
    defaultCookieAttributes: {
      sameSite: requireEmailVerification ? "none" : "lax",
      secure: requireEmailVerification,
      httpOnly: true,
    },
  },
});
