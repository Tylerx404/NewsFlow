import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { aiConfigRouter } from "../modules/ai-config/ai-config.router";
import { aiRouter } from "../modules/ai/ai.router";
import { articleRouter } from "../modules/article/article.router";
import { feedRouter } from "../modules/feed/feed.router";

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
  ...aiConfigRouter,
  ...feedRouter,
  ...articleRouter,
  ...aiRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
