import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";

import { adminProcedure } from "../../index";
import {
  adminAuthSigningKeyConfigSchema,
  adminAuthSigningKeyConfigUpdateSchema,
  adminOpsActionOutputSchema,
  adminSmtpConfigSchema,
  adminSmtpConfigUpdateSchema,
  adminQueueJobsOutputSchema,
  adminOAuthConfigSchema,
  adminOAuthConfigUpdateSchema,
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
  getAdminAuthSigningKeyConfig,
  getAdminSmtpConfig,
  getAdminStripeConfig,
  getAdminSystemOpsOverview,
  getAdminOAuthConfig,
  listAdminQueueJobs,
  retryAdminQueueJob,
  triggerAdminContentExtract,
  triggerAdminFeedFetch,
  updateAdminAuthSigningKeyConfig,
  updateAdminOAuthConfig,
  updateAdminSmtpConfig,
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

  getOAuthConfig: adminProcedure
    .output(adminOAuthConfigSchema)
    .handler(async () => {
      return getAdminOAuthConfig(prisma);
    }),

  getSmtpConfig: adminProcedure
    .output(adminSmtpConfigSchema)
    .handler(async () => {
      return getAdminSmtpConfig(prisma);
    }),

  getAuthSigningKeyConfig: adminProcedure
    .output(adminAuthSigningKeyConfigSchema)
    .handler(async () => {
      return getAdminAuthSigningKeyConfig(prisma);
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

  updateOAuthConfig: adminProcedure
    .input(adminOAuthConfigUpdateSchema)
    .output(adminOAuthConfigSchema)
    .handler(async ({ input, context }) => {
      return updateAdminOAuthConfig(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });
    }),

  updateSmtpConfig: adminProcedure
    .input(adminSmtpConfigUpdateSchema)
    .output(adminSmtpConfigSchema)
    .handler(async ({ input, context }) => {
      return updateAdminSmtpConfig(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });
    }),

  updateAuthSigningKeyConfig: adminProcedure
    .input(adminAuthSigningKeyConfigUpdateSchema)
    .output(adminAuthSigningKeyConfigSchema)
    .handler(async ({ input, context }) => {
      return updateAdminAuthSigningKeyConfig(prisma, {
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
