import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import { adminProcedure } from "../../index";
import {
  adminFeedDetailSchema,
  adminFeedIdSchema,
  adminFeedListOutputSchema,
  listAdminFeedsSchema,
  retryAdminArticleExtractionOutputSchema,
  retryAdminArticleExtractionSchema,
  retryAdminFeedExtractionOutputSchema,
  retryAdminFeedFetchOutputSchema,
  updateAdminFeedEnabledSchema,
} from "./admin-feed.schema";
import {
  getAdminFeedDetail,
  listAdminFeeds,
  retryAdminArticleExtraction,
  retryAdminFeedExtraction,
  retryAdminFeedFetch,
  updateAdminFeedEnabled,
} from "./admin-feed.service";

export const adminFeedRouter = {
  list: adminProcedure
    .input(listAdminFeedsSchema)
    .output(adminFeedListOutputSchema)
    .handler(async ({ input }) => {
      return listAdminFeeds(prisma, input);
    }),

  detail: adminProcedure
    .input(adminFeedIdSchema)
    .output(adminFeedDetailSchema)
    .handler(async ({ input }) => {
      const feed = await getAdminFeedDetail(prisma, input.feedSourceId);

      if (!feed) {
        throw new ORPCError("NOT_FOUND", {
          message: "Feed source not found",
        });
      }

      return feed;
    }),

  updateEnabled: adminProcedure
    .input(updateAdminFeedEnabledSchema)
    .output(adminFeedDetailSchema)
    .handler(async ({ input, context }) => {
      const feed = await updateAdminFeedEnabled(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!feed) {
        throw new ORPCError("NOT_FOUND", {
          message: "Feed source not found",
        });
      }

      return feed;
    }),

  retryFetch: adminProcedure
    .input(adminFeedIdSchema)
    .output(retryAdminFeedFetchOutputSchema)
    .handler(async ({ input, context }) => {
      const result = await retryAdminFeedFetch(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!result) {
        throw new ORPCError("NOT_FOUND", {
          message: "Feed source not found",
        });
      }

      return result;
    }),

  retryFeedExtraction: adminProcedure
    .input(adminFeedIdSchema)
    .output(retryAdminFeedExtractionOutputSchema)
    .handler(async ({ input, context }) => {
      const result = await retryAdminFeedExtraction(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!result) {
        throw new ORPCError("NOT_FOUND", {
          message: "Feed source not found",
        });
      }

      return result;
    }),

  retryArticleExtraction: adminProcedure
    .input(retryAdminArticleExtractionSchema)
    .output(retryAdminArticleExtractionOutputSchema)
    .handler(async ({ input, context }) => {
      const result = await retryAdminArticleExtraction(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!result) {
        throw new ORPCError("NOT_FOUND", {
          message: "Source article not found",
        });
      }

      return result;
    }),
};
