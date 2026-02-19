import prisma from "@NewsFlow/db";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../index";
import {
  createFeedSchema,
  feedIdSchema,
  listFeedsSchema,
  updateFeedSchema,
} from "./feed.schema";
import { createFeedWithArticles } from "./feed.service";

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
};
