import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";
import { protectedProcedure } from "../../index";
import {
  articleIdSchema,
  articleListOutputSchema,
  articleStatsOutputSchema,
  articleStatsSchema,
  listArticlesSchema,
} from "./article.schema";
import { extractFullContent } from "./article.service";

export const articleRouter = {
  list: protectedProcedure
    .input(listArticlesSchema)
    .output(articleListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const where: Prisma.ArticleWhereInput = {
        feed: { userId },
        ...(input.feedId ? { feedId: input.feedId } : {}),
        ...(input.saved !== undefined ? { saved: input.saved } : {}),
        ...(input.read !== undefined ? { read: input.read } : {}),
      };

      const andFilters: Prisma.ArticleWhereInput[] = [];

      if (input.query) {
        andFilters.push({
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { excerpt: { contains: input.query, mode: "insensitive" } },
            { link: { contains: input.query, mode: "insensitive" } },
          ],
        });
      }

      if (input.cursor) {
        const cursorPubDate = new Date(input.cursor.pubDate);
        andFilters.push({
          OR: [
            { pubDate: { lt: cursorPubDate } },
            {
              pubDate: cursorPubDate,
              id: { lt: input.cursor.id },
            },
          ],
        });
      }

      if (andFilters.length > 0) {
        where.AND = andFilters;
      }

      const articles = await prisma.article.findMany({
        where,
        take: input.limit + 1, // +1 to check for next cursor
        orderBy: [{ pubDate: "desc" }, { id: "desc" }],
        include: { feed: { select: { title: true, iconUrl: true } } },
      });

      let nextCursor:
        | {
            id: string;
            pubDate: string;
          }
        | undefined;

      if (articles.length > input.limit) {
        const nextItem = articles.pop();
        if (nextItem) {
          nextCursor = {
            id: nextItem.id,
            pubDate: nextItem.pubDate.toISOString(),
          };
        }
      }

      return { items: articles, nextCursor };
    }),

  stats: protectedProcedure
    .input(articleStatsSchema)
    .output(articleStatsOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const baseWhere: Prisma.ArticleWhereInput = {
        feed: { userId },
        ...(input.feedId ? { feedId: input.feedId } : {}),
      };

      const [all, unread, saved] = await Promise.all([
        prisma.article.count({ where: baseWhere }),
        prisma.article.count({
          where: {
            ...baseWhere,
            read: false,
          },
        }),
        prisma.article.count({
          where: {
            ...baseWhere,
            saved: true,
          },
        }),
      ]);

      return {
        all,
        unread,
        saved,
      };
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
