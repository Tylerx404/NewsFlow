import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import { adminProcedure } from "../../index";
import {
  adminUserDetailSchema,
  adminUserIdSchema,
  adminUserListOutputSchema,
  listAdminUsersSchema,
  reactivateAdminUserSchema,
  suspendAdminUserSchema,
} from "./admin-user.schema";
import {
  getAdminUserDetail,
  listAdminUsers,
  reactivateAdminUser,
  suspendAdminUser,
} from "./admin-user.service";

export const adminUserRouter = {
  list: adminProcedure
    .input(listAdminUsersSchema)
    .output(adminUserListOutputSchema)
    .handler(async ({ input }) => {
      return listAdminUsers(prisma, input);
    }),

  detail: adminProcedure
    .input(adminUserIdSchema)
    .output(adminUserDetailSchema)
    .handler(async ({ input }) => {
      const user = await getAdminUserDetail(prisma, input.userId);

      if (!user) {
        throw new ORPCError("NOT_FOUND", {
          message: "User not found",
        });
      }

      return user;
    }),

  suspend: adminProcedure
    .input(suspendAdminUserSchema)
    .output(adminUserDetailSchema)
    .handler(async ({ input, context }) => {
      const user = await suspendAdminUser(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!user) {
        throw new ORPCError("NOT_FOUND", {
          message: "User not found",
        });
      }

      return user;
    }),

  reactivate: adminProcedure
    .input(reactivateAdminUserSchema)
    .output(adminUserDetailSchema)
    .handler(async ({ input, context }) => {
      const user = await reactivateAdminUser(prisma, {
        ...input,
        adminUserId: context.session.user.id,
      });

      if (!user) {
        throw new ORPCError("NOT_FOUND", {
          message: "User not found",
        });
      }

      return user;
    }),
};
