import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { adminFeedRouter } from "../modules/admin/admin-feed.router";
import { adminSubscriptionRouter } from "../modules/admin/admin-subscription.router";
import { adminUserRouter } from "../modules/admin/admin-user.router";
import { aiConfigRouter } from "../modules/ai-config/ai-config.router";
import { aiRouter } from "../modules/ai/ai.router";
import { articleRouter } from "../modules/article/article.router";
import { feedSubscriptionRouter } from "../modules/feed-subscription/feed-subscription.router";
import { subscriptionRouter } from "../modules/subscription/subscription.router";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  aiConfig: aiConfigRouter,
  feedSubscription: feedSubscriptionRouter,
  article: articleRouter,
  ai: aiRouter,
  subscription: subscriptionRouter,
  admin: {
    user: adminUserRouter,
    subscription: adminSubscriptionRouter,
    feed: adminFeedRouter,
  },
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
