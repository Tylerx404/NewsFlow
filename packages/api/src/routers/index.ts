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
  aiConfig: aiConfigRouter,
  feed: feedRouter,
  article: articleRouter,
  ai: aiRouter,
  // Temporary compatibility layer for legacy flat clients.
  create: feedRouter.create,
  list: articleRouter.list,
  update: feedRouter.update,
  delete: feedRouter.delete,
  get: articleRouter.get,
  markRead: articleRouter.markRead,
  toggleSaved: articleRouter.toggleSaved,
  summarize: aiRouter.summarize,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
