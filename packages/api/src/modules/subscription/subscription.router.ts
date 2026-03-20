import prisma from "@NewsFlow/db";

import { protectedProcedure } from "../../index";
import {
  subscriptionBillingHistoryInputSchema,
  subscriptionBillingHistoryOutputSchema,
  subscriptionSchema,
} from "./subscription.schema";
import {
  getOrCreateSubscription,
  listSubscriptionBillingHistory,
} from "./subscription.service";

export const subscriptionRouter = {
  getCurrent: protectedProcedure
    .output(subscriptionSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      return getOrCreateSubscription(prisma, userId);
    }),
  listBillingHistory: protectedProcedure
    .input(subscriptionBillingHistoryInputSchema)
    .output(subscriptionBillingHistoryOutputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      return listSubscriptionBillingHistory(prisma, userId, input);
    }),
};
