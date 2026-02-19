import { ORPCError } from "@orpc/server";
import prisma from "@NewsFlow/db";
import { protectedProcedure } from "../../index";
import { EncryptionService } from "./ai-config.service";
import {
  aiConfigIdSchema,
  createAiConfigSchema,
  updateAiConfigSchema,
} from "./ai-config.schema";

const maskConfig = (config: any) => ({
  ...config,
  apiKey: EncryptionService.maskApiKey(config.apiKey),
});

export const aiConfigRouter = {
  create: protectedProcedure
    .input(createAiConfigSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const encryptedKey = await EncryptionService.encrypt(input.apiKey);

      // If first config, set as default
      const existingCount = await prisma.aiConfig.count({ where: { userId } });
      const isDefault = existingCount === 0;

      const config = await prisma.aiConfig.create({
        data: {
          ...input,
          apiKey: encryptedKey,
          userId,
          isDefault,
        },
      });

      return maskConfig(config);
    }),

  list: protectedProcedure
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      const configs = await prisma.aiConfig.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return configs.map(maskConfig);
    }),

  update: protectedProcedure
    .input(updateAiConfigSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { id, apiKey, ...rest } = input;

      const existing = await prisma.aiConfig.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "AI config not found" });
      }

      const updateData: any = { ...rest };

      if (apiKey) {
        updateData.apiKey = await EncryptionService.encrypt(apiKey);
      }

      // Handle isDefault change
      if (rest.isDefault) {
        await prisma.$transaction([
          prisma.aiConfig.updateMany({
            where: { userId, NOT: { id } },
            data: { isDefault: false },
          }),
          prisma.aiConfig.update({
            where: { id },
            data: updateData,
          }),
        ]);
      } else {
        await prisma.aiConfig.update({
          where: { id },
          data: updateData,
        });
      }

      const updated = await prisma.aiConfig.findUnique({ where: { id } });
      return maskConfig(updated);
    }),

  delete: protectedProcedure
    .input(aiConfigIdSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.aiConfig.findFirst({
        where: { id: input.id, userId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "AI config not found" });
      }

      await prisma.aiConfig.delete({ where: { id: input.id } });
    }),
};
