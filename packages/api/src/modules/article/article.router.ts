import prisma from "@NewsFlow/db";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../index";
import {
  articleIdSchema,
  listArticlesSchema,
} from "./article.schema";
import { extractFullContent } from "./article.service";

export const articleRouter = {
  list: protectedProcedure
    .input(listArticlesSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const where: any = {
        feed: { userId },
        ...(input.feedId ? { feedId: input.feedId } : {}),
        ...(input.saved !== undefined ? { saved: input.saved } : {}),
        ...(input.read !== undefined ? { read: input.read } : {}),
        ...(input.cursor ? { id: { lt: input.cursor } } : {}),
      };

      const articles = await prisma.article.findMany({
        where,
        take: input.limit + 1, // +1 to check for next cursor
        orderBy: { pubDate: "desc" },
        include: { feed: { select: { title: true, iconUrl: true } } },
      });

      let nextCursor: string | undefined;
      if (articles.length > input.limit) {
        const nextItem = articles.pop();
        nextCursor = nextItem?.id;
      }

      return { items: articles, nextCursor };
    }),

  get: protectedProcedure
    .input(articleIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const article = await extractFullContent(prisma, input.id, userId);

      if (!article) {
        throw new ORPCError("NOT_FOUND", { message: "Article not found" });
      }

      return article;
    }),

  markRead: protectedProcedure
    .input(articleIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.article.findFirst({
        where: { id: input.id, feed: { userId } },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Article not found" });
      }

      const updated = await prisma.article.update({
        where: { id: input.id },
        data: { read: true },
      });

      return updated;
    }),

  toggleSaved: protectedProcedure
    .input(articleIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.article.findFirst({
        where: { id: input.id, feed: { userId } },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Article not found" });
      }

      const updated = await prisma.article.update({
        where: { id: input.id },
        data: { saved: !existing.saved },
      });

      return updated;
    }),
};
