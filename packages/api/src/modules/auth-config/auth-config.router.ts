import prisma from "@NewsFlow/db";

import { publicProcedure } from "../../index";
import { authConfigSchema } from "./auth-config.schema";
import { getPublicAuthConfig } from "./auth-config.service";

export const authConfigRouter = {
  get: publicProcedure.output(authConfigSchema).handler(async () => {
    return getPublicAuthConfig(prisma);
  }),
};
