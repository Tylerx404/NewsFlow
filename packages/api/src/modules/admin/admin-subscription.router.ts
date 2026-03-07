import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import { adminProcedure } from "../../index";
import {
  adminSubscriptionListOutputSchema,
  adminSubscriptionRowSchema,
  listAdminSubscriptionsSchema,
  updateAdminSubscriptionCancelAtPeriodEndSchema,
  updateAdminSubscriptionExpiresAtSchema,
  updateAdminSubscriptionTierSchema,
} from "./admin-subscription.schema";
import {
  listAdminSubscriptions,
  updateAdminSubscriptionCancelAtPeriodEnd,
  updateAdminSubscriptionExpiresAt,
  updateAdminSubscriptionTier,
} from "./admin-subscription.service";

export const adminSubscriptionRouter = {
  list: adminProcedure
    .input(listAdminSubscriptionsSchema)
    .output(adminSubscriptionListOutputSchema)
    .handler(async ({ input }) => {
      return listAdminSubscriptions(prisma, input);
    }),

  updateTier: adminProcedure
    .input(updateAdminSubscriptionTierSchema)
    .output(adminSubscriptionRowSchema)
    .handler(async ({ input, context }) => {
      const subscription = await updateAdminSubscriptionTier(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!subscription) {
        throw new ORPCError("NOT_FOUND", {
          message: "Subscription user not found",
        });
      }

      return subscription;
    }),

  updateExpiresAt: adminProcedure
    .input(updateAdminSubscriptionExpiresAtSchema)
    .output(adminSubscriptionRowSchema)
    .handler(async ({ input, context }) => {
      const subscription = await updateAdminSubscriptionExpiresAt(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!subscription) {
        throw new ORPCError("NOT_FOUND", {
          message: "Subscription user not found",
        });
      }

      return subscription;
    }),

  updateCancelAtPeriodEnd: adminProcedure
    .input(updateAdminSubscriptionCancelAtPeriodEndSchema)
    .output(adminSubscriptionRowSchema)
    .handler(async ({ input, context }) => {
      const subscription = await updateAdminSubscriptionCancelAtPeriodEnd(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!subscription) {
        throw new ORPCError("NOT_FOUND", {
          message: "Subscription user not found",
        });
      }

      return subscription;
    }),
};
