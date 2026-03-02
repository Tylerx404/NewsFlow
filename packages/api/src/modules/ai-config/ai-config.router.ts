import { ORPCError } from "@orpc/server";
import { z } from "zod";

import prisma from "@NewsFlow/db";
import type { AiConfig, Prisma } from "@NewsFlow/db";
import { protectedProcedure } from "../../index";
import { EncryptionService, fetchProviderModels } from "./ai-config.service";
import {
  aiConfigIdSchema,
  createAiConfigSchema,
  fetchModelsOutputSchema,
  fetchModelsSchema,
  maskedAiConfigSchema,
  ProviderEnum,
  updateAiConfigSchema,
} from "./ai-config.schema";

type MaskedAiConfig = Omit<AiConfig, "apiKey"> & {
  apiKey: string;
};

const maskConfig = async (config: AiConfig): Promise<MaskedAiConfig> => {
  try {
    const decrypted = await EncryptionService.decrypt(config.apiKey);
    return {
      ...config,
      apiKey: EncryptionService.maskApiKey(decrypted),
    };
  } catch {
    return {
      ...config,
      apiKey: "****",
    };
  }
};

export const aiConfigRouter = {
  create: protectedProcedure
    .input(createAiConfigSchema)
    .output(maskedAiConfigSchema)
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
    .output(z.array(maskedAiConfigSchema))
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      const configs = await prisma.aiConfig.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return Promise.all(configs.map(maskConfig));
    }),

  fetchModels: protectedProcedure
    .input(fetchModelsSchema)
    .output(fetchModelsOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      let provider: z.infer<typeof ProviderEnum>;
      let apiKey: string | undefined;
      let baseUrl: string | null | undefined;

      if (input.aiConfigId) {
        const existingConfig = await prisma.aiConfig.findFirst({
          where: {
            id: input.aiConfigId,
            userId,
          },
        });

        if (!existingConfig) {
          throw new ORPCError("NOT_FOUND", { message: "AI config not found" });
        }

        const parsedProvider = ProviderEnum.safeParse(existingConfig.provider);
        if (!parsedProvider.success) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Unsupported provider in saved config.",
          });
        }

        provider = parsedProvider.data;
        apiKey = input.apiKey ?? await EncryptionService.decrypt(existingConfig.apiKey);
        baseUrl = input.baseUrl === undefined ? existingConfig.baseUrl : input.baseUrl;
      } else {
        if (!input.provider) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Provider is required.",
          });
        }

        provider = input.provider;
        apiKey = input.apiKey;
        baseUrl = input.baseUrl;
      }

      if (provider !== "ollama" && !apiKey) {
        throw new ORPCError("BAD_REQUEST", {
          message: "API key is required for this provider.",
        });
      }

      const models = await fetchProviderModels({
        provider,
        apiKey,
        baseUrl,
      });

      return { models };
    }),

  update: protectedProcedure
    .input(updateAiConfigSchema)
    .output(maskedAiConfigSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { id, apiKey, ...rest } = input;

      const existing = await prisma.aiConfig.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "AI config not found" });
      }

      const updateData: Prisma.AiConfigUpdateInput = { ...rest };

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
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "AI config not found" });
      }

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
