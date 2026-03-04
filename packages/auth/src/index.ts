import prisma from "@NewsFlow/db";
import { env } from "@NewsFlow/env/server";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import Stripe from "stripe";

const isProduction = env.NODE_ENV === "production";
const STRIPE_TRIAL_DAYS = 7;

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

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
  plugins: [
    stripe({
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "basic",
            priceId: env.STRIPE_PRICE_BASIC_MONTHLY,
            annualDiscountPriceId: env.STRIPE_PRICE_BASIC_YEARLY,
            freeTrial: { days: STRIPE_TRIAL_DAYS },
          },
          {
            name: "pro",
            priceId: env.STRIPE_PRICE_PRO_MONTHLY,
            annualDiscountPriceId: env.STRIPE_PRICE_PRO_YEARLY,
            freeTrial: { days: STRIPE_TRIAL_DAYS },
          },
          {
            name: "max",
            priceId: env.STRIPE_PRICE_MAX_MONTHLY,
            annualDiscountPriceId: env.STRIPE_PRICE_MAX_YEARLY,
            freeTrial: { days: STRIPE_TRIAL_DAYS },
          },
        ],
      },
      schema: {
        user: {
          modelName: "user",
          fields: {
            stripeCustomerId: "stripeCustomerId",
          },
        },
        subscription: {
          modelName: "subscription",
          fields: {
            plan: "tier",
            referenceId: "userId",
            stripeCustomerId: "stripeCustomerId",
            stripeSubscriptionId: "stripeSubscriptionId",
            status: "status",
            periodStart: "currentPeriodStart",
            periodEnd: "currentPeriodEnd",
            trialStart: "trialStart",
            trialEnd: "trialEnd",
            cancelAtPeriodEnd: "cancelAtPeriodEnd",
            cancelAt: "cancelAt",
            canceledAt: "canceledAt",
            endedAt: "endedAt",
            seats: "seats",
          },
        },
      },
    }),
  ],
});
