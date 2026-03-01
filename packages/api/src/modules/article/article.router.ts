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

type UserSubscription = {
  id: string;
  feedSourceId: string;
  customTitle: string | null;
  feedSource: {
    title: string;
    iconUrl: string | null;
  };
};

const resolveUserSubscriptions = async (
  userId: string,
  feedSubscriptionId?: string
): Promise<UserSubscription[]> => {
  if (feedSubscriptionId) {
    const subscription = await prisma.feedSubscription.findFirst({
      where: {
        id: feedSubscriptionId,
        userId,
      },
      select: {
        id: true,
        feedSourceId: true,
        customTitle: true,
        feedSource: {
          select: {
            title: true,
            iconUrl: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new ORPCError("NOT_FOUND", {
        message: "Feed subscription not found",
      });
    }

    return [subscription];
  }

  return prisma.feedSubscription.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      feedSourceId: true,
      customTitle: true,
      feedSource: {
        select: {
          title: true,
          iconUrl: true,
        },
      },
    },
  });
};

export const articleRouter = {
  list: protectedProcedure
    .input(listArticlesSchema)
    .output(articleListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const subscriptions = await resolveUserSubscriptions(
        userId,
        input.feedSubscriptionId
      );

      if (subscriptions.length === 0) {
        return {
          items: [],
        };
      }

      const sourceIds = subscriptions.map((subscription) => subscription.feedSourceId);
      const subscriptionBySourceId = new Map(
        subscriptions.map((subscription) => [subscription.feedSourceId, subscription])
      );

      const where: Prisma.SourceArticleWhereInput = {
        feedSourceId: { in: sourceIds },
      };

      const andFilters: Prisma.SourceArticleWhereInput[] = [];

      if (input.read !== undefined) {
        andFilters.push({
          userStates: input.read
            ? {
                some: {
                  userId,
                  read: true,
                },
              }
            : {
                none: {
                  userId,
                  read: true,
                },
              },
        });
      }

      if (input.saved !== undefined) {
        andFilters.push({
          userStates: input.saved
            ? {
                some: {
                  userId,
                  saved: true,
                },
              }
            : {
                none: {
                  userId,
                  saved: true,
                },
              },
        });
      }

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

      const sourceArticles = await prisma.sourceArticle.findMany({
        where,
        take: input.limit + 1,
        orderBy: [{ pubDate: "desc" }, { id: "desc" }],
        include: {
          feedSource: {
            select: {
              id: true,
              title: true,
              iconUrl: true,
            },
          },
          userStates: {
            where: { userId },
            select: {
              read: true,
              saved: true,
            },
            take: 1,
          },
        },
      });

      let nextCursor:
        | {
            id: string;
            pubDate: string;
          }
        | undefined;

      if (sourceArticles.length > input.limit) {
        const nextItem = sourceArticles.pop();
        if (nextItem) {
          nextCursor = {
            id: nextItem.id,
            pubDate: nextItem.pubDate.toISOString(),
          };
        }
      }

      const items = sourceArticles.map((article) => {
        const subscription = subscriptionBySourceId.get(article.feedSourceId);
        const state = article.userStates[0];

        if (!subscription) {
          throw new ORPCError("NOT_FOUND", {
            message: "Feed subscription not found",
          });
        }

        return {
          id: article.id,
          feedSourceId: article.feedSourceId,
          feedSubscriptionId: subscription.id,
          articleKey: article.articleKey,
          guid: article.guid,
          title: article.title,
          link: article.link,
          author: article.author,
          pubDate: article.pubDate,
          content: article.content,
          excerpt: article.excerpt,
          image: article.image,
          categories: article.categories,
          read: state?.read ?? false,
          saved: state?.saved ?? false,
          contentExtracted: article.contentExtracted,
          extractionAttempts: article.extractionAttempts,
          lastExtractionError: article.lastExtractionError,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          feed: {
            title: subscription.customTitle || article.feedSource.title,
            iconUrl: article.feedSource.iconUrl,
          },
        };
      });

      return {
        items,
        nextCursor,
      };
    }),

  stats: protectedProcedure
    .input(articleStatsSchema)
    .output(articleStatsOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const subscriptions = await resolveUserSubscriptions(
        userId,
        input.feedSubscriptionId
      );

      if (subscriptions.length === 0) {
        return {
          all: 0,
          unread: 0,
          saved: 0,
        };
      }

      const sourceIds = subscriptions.map((subscription) => subscription.feedSourceId);

      const baseWhere: Prisma.SourceArticleWhereInput = {
        feedSourceId: {
          in: sourceIds,
        },
      };

      const [all, unread, saved] = await Promise.all([
        prisma.sourceArticle.count({ where: baseWhere }),
        prisma.sourceArticle.count({
          where: {
            ...baseWhere,
            userStates: {
              none: {
                userId,
                read: true,
              },
            },
          },
        }),
        prisma.sourceArticle.count({
          where: {
            ...baseWhere,
            userStates: {
              some: {
                userId,
                saved: true,
              },
            },
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

      const [subscription, state] = await Promise.all([
        prisma.feedSubscription.findFirst({
          where: {
            userId,
            feedSourceId: article.feedSourceId,
          },
          select: {
            id: true,
            customTitle: true,
          },
        }),
        prisma.userArticleState.findUnique({
          where: {
            userId_sourceArticleId: {
              userId,
              sourceArticleId: article.id,
            },
          },
          select: {
            read: true,
            saved: true,
          },
        }),
      ]);

      if (!subscription) {
        throw new ORPCError("NOT_FOUND", { message: "Feed subscription not found" });
      }

      return {
        id: article.id,
        feedSourceId: article.feedSourceId,
        feedSubscriptionId: subscription.id,
        articleKey: article.articleKey,
        guid: article.guid,
        title: article.title,
        link: article.link,
        author: article.author,
        pubDate: article.pubDate,
        content: article.content,
        excerpt: article.excerpt,
        image: article.image,
        categories: article.categories,
        read: state?.read ?? false,
        saved: state?.saved ?? false,
        contentExtracted: article.contentExtracted,
        extractionAttempts: article.extractionAttempts,
        lastExtractionError: article.lastExtractionError,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        feed: {
          title: subscription.customTitle || article.feedSource.title,
          iconUrl: article.feedSource.iconUrl,
        },
      };
    }),

  markRead: protectedProcedure
    .input(articleIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.sourceArticle.findFirst({
        where: {
          id: input.id,
          feedSource: {
            subscriptions: {
              some: { userId },
            },
          },
        },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Article not found" });
      }

      const updated = await prisma.userArticleState.upsert({
        where: {
          userId_sourceArticleId: {
            userId,
            sourceArticleId: existing.id,
          },
        },
        create: {
          userId,
          sourceArticleId: existing.id,
          read: true,
          readAt: new Date(),
          saved: false,
          savedAt: null,
        },
        update: {
          read: true,
          readAt: new Date(),
        },
      });

      return {
        id: existing.id,
        read: updated.read,
        saved: updated.saved,
      };
    }),

  toggleSaved: protectedProcedure
    .input(articleIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.sourceArticle.findFirst({
        where: {
          id: input.id,
          feedSource: {
            subscriptions: {
              some: { userId },
            },
          },
        },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Article not found" });
      }

      const currentState = await prisma.userArticleState.findUnique({
        where: {
          userId_sourceArticleId: {
            userId,
            sourceArticleId: existing.id,
          },
        },
      });

      const nextSaved = !(currentState?.saved ?? false);
      const nextRead = currentState?.read ?? false;

      const updated = await prisma.userArticleState.upsert({
        where: {
          userId_sourceArticleId: {
            userId,
            sourceArticleId: existing.id,
          },
        },
        create: {
          userId,
          sourceArticleId: existing.id,
          read: nextRead,
          readAt: currentState?.readAt ?? null,
          saved: nextSaved,
          savedAt: nextSaved ? new Date() : null,
        },
        update: {
          saved: nextSaved,
          savedAt: nextSaved ? new Date() : null,
        },
      });

      return {
        id: existing.id,
        read: updated.read,
        saved: updated.saved,
      };
    }),
};
