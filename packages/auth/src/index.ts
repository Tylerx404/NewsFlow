import prisma from "@NewsFlow/db";
import { env } from "@NewsFlow/env/server";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import Stripe from "stripe";

const isProduction = env.NODE_ENV === "production";

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
          },
          {
            name: "pro",
            priceId: env.STRIPE_PRICE_PRO_MONTHLY,
            annualDiscountPriceId: env.STRIPE_PRICE_PRO_YEARLY,
          },
          {
            name: "max",
            priceId: env.STRIPE_PRICE_MAX_MONTHLY,
            annualDiscountPriceId: env.STRIPE_PRICE_MAX_YEARLY,
          },
        ],
        getCheckoutSessionParams: async (_data, req) => {
          const rawPromotionCode = req?.headers
            ?.get("x-newsflow-promo-code")
            ?.trim();

          if (!rawPromotionCode) {
            return {
              params: {
                allow_promotion_codes: true,
              },
            };
          }

          const normalizedPromotionCode = rawPromotionCode.toUpperCase();

          try {
            const promotionCodeList = await stripeClient.promotionCodes.list({
              code: normalizedPromotionCode,
              active: true,
              limit: 10,
            });
            const matchedPromotionCode = promotionCodeList.data.find(
              (promotionCode) =>
                promotionCode.code?.toUpperCase() === normalizedPromotionCode
            );

            if (!matchedPromotionCode) {
              return {
                params: {
                  allow_promotion_codes: true,
                },
              };
            }

            return {
              params: {
                discounts: [{ promotion_code: matchedPromotionCode.id }],
              },
            };
          } catch {
            return {
              params: {
                allow_promotion_codes: true,
              },
            };
          }
        },
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
