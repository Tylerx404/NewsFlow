import prisma from "@NewsFlow/db";

import { protectedProcedure } from "../../index";
import { subscriptionSchema } from "./subscription.schema";
import { getOrCreateSubscription } from "./subscription.service";

export const subscriptionRouter = {
  getCurrent: protectedProcedure
    .output(subscriptionSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      return getOrCreateSubscription(prisma, userId);
    }),
};
