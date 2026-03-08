import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";

import { adminProcedure } from "../../index";
import {
  adminOpsActionOutputSchema,
  adminQueueJobsOutputSchema,
  adminStripeConfigSchema,
  adminStripeConfigUpdateSchema,
  adminSystemOpsOverviewOutputSchema,
  adminSystemOpsOverviewSchema,
  listAdminQueueJobsSchema,
  retryAdminQueueJobOutputSchema,
  retryAdminQueueJobSchema,
  triggerAdminContentExtractSchema,
  triggerAdminFeedFetchSchema,
} from "./admin-system-ops.schema";
import {
  getAdminStripeConfig,
  getAdminSystemOpsOverview,
  listAdminQueueJobs,
  retryAdminQueueJob,
  triggerAdminContentExtract,
  triggerAdminFeedFetch,
  updateAdminStripeConfig,
} from "./admin-system-ops.service";

export const adminSystemOpsRouter = {
  overview: adminProcedure
    .input(adminSystemOpsOverviewSchema)
    .output(adminSystemOpsOverviewOutputSchema)
    .handler(async () => {
      return getAdminSystemOpsOverview(prisma);
    }),

  getStripeConfig: adminProcedure
    .output(adminStripeConfigSchema)
    .handler(async () => {
      return getAdminStripeConfig(prisma);
    }),

  updateStripeConfig: adminProcedure
    .input(adminStripeConfigUpdateSchema)
    .output(adminStripeConfigSchema)
    .handler(async ({ input, context }) => {
      return updateAdminStripeConfig(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });
    }),

  listQueueJobs: adminProcedure
    .input(listAdminQueueJobsSchema)
    .output(adminQueueJobsOutputSchema)
    .handler(async ({ input }) => {
      return listAdminQueueJobs(prisma, input);
    }),

  retryJob: adminProcedure
    .input(retryAdminQueueJobSchema)
    .output(retryAdminQueueJobOutputSchema)
    .handler(async ({ input, context }) => {
      const result = await retryAdminQueueJob(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!result) {
        throw new ORPCError("NOT_FOUND", {
          message: "Queue job not found",
        });
      }

      return result;
    }),

  triggerFeedFetch: adminProcedure
    .input(triggerAdminFeedFetchSchema)
    .output(adminOpsActionOutputSchema)
    .handler(async ({ input, context }) => {
      const result = await triggerAdminFeedFetch(prisma, {
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

  triggerContentExtract: adminProcedure
    .input(triggerAdminContentExtractSchema)
    .output(adminOpsActionOutputSchema)
    .handler(async ({ input, context }) => {
      const result = await triggerAdminContentExtract(prisma, {
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
