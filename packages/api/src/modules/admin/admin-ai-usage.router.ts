import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";

import { adminProcedure } from "../../index";
import {
  adminAiConfigSchema,
  adminAiUsageEventsOutputSchema,
  adminAiUsageOverviewOutputSchema,
  adminAiUsageOverviewSchema,
  adminAiUsageUserUsageOutputSchema,
  adminAiUsageUserUsageSchema,
  listAdminAiUsageEventsSchema,
  updateAdminAiConfigEnabledSchema,
} from "./admin-ai-usage.schema";
import {
  getAdminAiUsageOverview,
  getAdminAiUserUsage,
  listAdminAiUsageEvents,
  updateAdminAiConfigEnabled,
} from "./admin-ai-usage.service";

export const adminAiUsageRouter = {
  overview: adminProcedure
    .input(adminAiUsageOverviewSchema)
    .output(adminAiUsageOverviewOutputSchema)
    .handler(async ({ input }) => {
      return getAdminAiUsageOverview(prisma, input);
    }),

  listEvents: adminProcedure
    .input(listAdminAiUsageEventsSchema)
    .output(adminAiUsageEventsOutputSchema)
    .handler(async ({ input }) => {
      return listAdminAiUsageEvents(prisma, input);
    }),

  getUserUsage: adminProcedure
    .input(adminAiUsageUserUsageSchema)
    .output(adminAiUsageUserUsageOutputSchema)
    .handler(async ({ input }) => {
      const usage = await getAdminAiUserUsage(prisma, input);

      if (!usage) {
        throw new ORPCError("NOT_FOUND", {
          message: "User not found",
        });
      }

      return usage;
    }),

  updateConfigEnabled: adminProcedure
    .input(updateAdminAiConfigEnabledSchema)
    .output(adminAiConfigSchema)
    .handler(async ({ input, context }) => {
      const config = await updateAdminAiConfigEnabled(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!config) {
        throw new ORPCError("NOT_FOUND", {
          message: "AI config not found",
        });
      }

      return config;
    }),
};
