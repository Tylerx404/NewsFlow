import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import { protectedProcedure } from "../../index";
import { EncryptionService } from "../ai-config/ai-config.service";
import { extractFullContent } from "../article/article.service";
import { summarizeOutputSchema, summarizeSchema } from "./ai.schema";
import { generateSummary } from "./ai.service";

export const aiRouter = {
  summarize: protectedProcedure
    .input(summarizeSchema)
    .output(summarizeOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const article = await extractFullContent(prisma, input.articleId, userId);

      if (!article) {
        throw new ORPCError("NOT_FOUND", { message: "Article not found" });
      }

      if (!article.content) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot extract article content",
        });
      }

      let config;
      if (input.aiConfigId) {
        config = await prisma.aiConfig.findFirst({
          where: { id: input.aiConfigId, userId },
        });
      } else {
        config = await prisma.aiConfig.findFirst({
          where: { userId, isDefault: true },
        });
      }

      if (!config) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No AI provider configured. Please add an AI config first.",
        });
      }

      const decryptedKey = await EncryptionService.decrypt(config.apiKey);
      const configWithDecryptedKey = { ...config, apiKey: decryptedKey };

      const { summary, tokens } = await generateSummary(
        article.content,
        configWithDecryptedKey,
        article.feedSource?.language
      );

      await prisma.aiUsage.create({
        data: {
          userId,
          provider: config.provider,
          model: config.model,
          tokens,
          action: "summarize",
        },
      });

      return { summary, tokens };
    }),
};
