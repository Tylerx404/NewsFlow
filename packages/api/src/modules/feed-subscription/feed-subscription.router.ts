import prisma from "@NewsFlow/db";
import { QUEUES, createQueue, type RssFetchJobData } from "@NewsFlow/queue";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../index";
import { DISCOVER_FEEDS } from "./feed-subscription.discover";
import {
  createFeedSubscriptionSchema,
  discoverFeedSubscriptionItemSchema,
  discoverFeedSubscriptionsSchema,
  feedSubscriptionIdSchema,
  listFeedSubscriptionsSchema,
  listSidebarFeedSubscriptionsSchema,
  refreshFeedSubscriptionSchema,
  sidebarFeedSubscriptionSchema,
  updateFeedSubscriptionSchema,
} from "./feed-subscription.schema";
import {
  createFeedSubscriptionWithInitialArticles,
  mapFeedSubscription,
} from "./feed-subscription.service";

const rssQueue = createQueue<RssFetchJobData>(QUEUES.RSS_FETCH);

export const feedSubscriptionRouter = {
  create: protectedProcedure
    .input(createFeedSubscriptionSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const subscription = await createFeedSubscriptionWithInitialArticles(
        prisma,
        userId,
        input.url
      );
      return mapFeedSubscription(subscription);
    }),

  list: protectedProcedure
    .input(listFeedSubscriptionsSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const subscriptions = await prisma.feedSubscription.findMany({
        where: {
          userId,
          ...(input.category ? { category: input.category } : {}),
        },
        include: {
          feedSource: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return subscriptions.map(mapFeedSubscription);
    }),

  listSidebar: protectedProcedure
    .input(listSidebarFeedSubscriptionsSchema)
    .output(sidebarFeedSubscriptionSchema.array())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const subscriptions = await prisma.feedSubscription.findMany({
        where: {
          userId,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        include: {
          feedSource: true,
        },
      });

      if (subscriptions.length === 0) {
        return [];
      }

      const sourceIds = subscriptions.map((subscription) => subscription.feedSourceId);

      const [articleCounts, readStates] = await Promise.all([
        prisma.sourceArticle.groupBy({
          by: ["feedSourceId"],
          where: { feedSourceId: { in: sourceIds } },
          _count: { _all: true },
        }),
        prisma.userArticleState.findMany({
          where: {
            userId,
            read: true,
            sourceArticle: {
              feedSourceId: { in: sourceIds },
            },
          },
          select: {
            sourceArticle: {
              select: {
                feedSourceId: true,
              },
            },
          },
        }),
      ]);

      const totalBySource = new Map(
        articleCounts.map((item) => [item.feedSourceId, item._count._all])
      );

      const readBySource = new Map<string, number>();
      for (const state of readStates) {
        const sourceId = state.sourceArticle.feedSourceId;
        readBySource.set(sourceId, (readBySource.get(sourceId) ?? 0) + 1);
      }

      return subscriptions
        .map((subscription) => {
          const mapped = mapFeedSubscription(subscription);
          const total = totalBySource.get(subscription.feedSourceId) ?? 0;
          const read = readBySource.get(subscription.feedSourceId) ?? 0;
          return {
            ...mapped,
            unreadCount: Math.max(total - read, 0),
          };
        })
        .sort((left, right) => {
          if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1;
          }
          return left.title.localeCompare(right.title);
        });
    }),

  discover: protectedProcedure
    .input(discoverFeedSubscriptionsSchema)
    .output(discoverFeedSubscriptionItemSchema.array())
    .handler(async ({ input }) => {
      if (!input.category) {
        return DISCOVER_FEEDS;
      }

      return DISCOVER_FEEDS.filter(
        (item) => item.category?.toLowerCase() === input.category?.toLowerCase()
      );
    }),

  update: protectedProcedure
    .input(updateFeedSubscriptionSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { id, ...data } = input;

      const existing = await prisma.feedSubscription.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Feed subscription not found" });
      }

      const updated = await prisma.feedSubscription.update({
        where: { id },
        data,
        include: {
          feedSource: true,
        },
      });

      return mapFeedSubscription(updated);
    }),

  delete: protectedProcedure
    .input(feedSubscriptionIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.feedSubscription.findFirst({
        where: { id: input.id, userId },
        select: {
          id: true,
          feedSourceId: true,
        },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Feed subscription not found" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.feedSubscription.delete({ where: { id: existing.id } });

        const remainingSubscriptions = await tx.feedSubscription.count({
          where: { feedSourceId: existing.feedSourceId },
        });

        if (remainingSubscriptions === 0) {
          await tx.feedSource.delete({ where: { id: existing.feedSourceId } });
        }
      });
    }),

  refresh: protectedProcedure
    .input(refreshFeedSubscriptionSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.feedSubscription.findFirst({
        where: { id: input.id, userId },
        select: { id: true, feedSourceId: true },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", {
          message: "Feed subscription not found",
        });
      }

      await rssQueue.add(
        "rss-fetch",
        {
          feedSourceId: existing.feedSourceId,
          force: true,
        },
        {
          jobId: `rss-fetch:${existing.feedSourceId}`,
        }
      );

      await prisma.feedSource.update({
        where: { id: existing.feedSourceId },
        data: {
          nextFetchAt: new Date(),
        },
      });

      return {
        queued: true,
        feedSourceId: existing.feedSourceId,
      };
    }),
};
