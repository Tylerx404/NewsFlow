import prisma from "@NewsFlow/db";
import { QUEUES, createQueue, type RssFetchJobData } from "@NewsFlow/queue";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../index";
import { DISCOVER_FEEDS } from "./feed.discover";
import {
  createFeedSchema,
  discoverFeedsSchema,
  discoverFeedItemSchema,
  feedIdSchema,
  listSidebarFeedsSchema,
  refreshFeedSchema,
  sidebarFeedSchema,
  listFeedsSchema,
  updateFeedSchema,
} from "./feed.schema";
import { createFeedWithArticles } from "./feed.service";

const rssQueue = createQueue<RssFetchJobData>(QUEUES.RSS_FETCH);

export const feedRouter = {
  create: protectedProcedure
    .input(createFeedSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const feed = await createFeedWithArticles(prisma, userId, input.url);
      return feed;
    }),

  list: protectedProcedure
    .input(listFeedsSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const feeds = await prisma.feed.findMany({
        where: {
          userId,
          ...(input.category ? { category: input.category } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      return feeds;
    }),

  listSidebar: protectedProcedure
    .input(listSidebarFeedsSchema)
    .output(sidebarFeedSchema.array())
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const feeds = await prisma.feed.findMany({
        where: {
          userId,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        orderBy: [{ isActive: "desc" }, { title: "asc" }],
      });

      if (feeds.length === 0) {
        return [];
      }

      const unreadCounts = await prisma.article.groupBy({
        by: ["feedId"],
        where: {
          feedId: { in: feeds.map((feed) => feed.id) },
          read: false,
        },
        _count: { _all: true },
      });

      const unreadByFeed = new Map(
        unreadCounts.map((item) => [item.feedId, item._count._all])
      );

      return feeds.map((feed) => ({
        ...feed,
        unreadCount: unreadByFeed.get(feed.id) ?? 0,
      }));
    }),

  discover: protectedProcedure
    .input(discoverFeedsSchema)
    .output(discoverFeedItemSchema.array())
    .handler(async ({ input }) => {
      if (!input.category) {
        return DISCOVER_FEEDS;
      }

      return DISCOVER_FEEDS.filter(
        (item) => item.category?.toLowerCase() === input.category?.toLowerCase()
      );
    }),

  update: protectedProcedure
    .input(updateFeedSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { id, ...data } = input;

      const existing = await prisma.feed.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Feed not found" });
      }

      const updated = await prisma.feed.update({
        where: { id },
        data,
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(feedIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.feed.findFirst({
        where: { id: input.id, userId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Feed not found" });
      }

      await prisma.feed.delete({ where: { id: input.id } });
    }),

  refresh: protectedProcedure
    .input(refreshFeedSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.feed.findFirst({
        where: { id: input.id, userId },
        select: { id: true, userId: true },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Feed not found" });
      }

      await rssQueue.add("rss-fetch", {
        feedId: existing.id,
        userId: existing.userId,
        force: true,
      });

      await prisma.feed.update({
        where: { id: existing.id },
        data: {
          nextFetchAt: new Date(),
        },
      });

      return {
        queued: true,
        feedId: existing.id,
      };
    }),
};
