import { ORPCError } from "@orpc/server";

import prisma, { AiUsageStatus } from "@NewsFlow/db";
import { protectedProcedure } from "../../index";
import { EncryptionService } from "../ai-config/ai-config.service";
import { extractFullContent } from "../article/article.service";
import { summarizeOutputSchema, summarizeSchema } from "./ai.schema";
import { generateSummary, sanitizeAiErrorSummary } from "./ai.service";

export const aiRouter = {
  summarize: protectedProcedure
    .input(summarizeSchema)
    .output(summarizeOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const action = "summarize";

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

      const logUsageEvent = async (params: {
        status: AiUsageStatus;
        tokens?: number;
        durationMs: number;
        errorSummary?: string;
      }) => {
        await prisma.aiUsage.create({
          data: {
            userId,
            provider: config.provider,
            model: config.model,
            tokens: params.tokens ?? 0,
            action,
            status: params.status,
            durationMs: params.durationMs,
            errorSummary: params.errorSummary,
          },
        });
      };

      if (!config.isEnabled) {
        const disabledSummary = "Selected AI config is currently disabled.";

        try {
          await logUsageEvent({
            status: "FAILED",
            durationMs: 0,
            errorSummary: disabledSummary,
          });
        } catch {
          console.error("Failed to record disabled AI config usage event", {
            userId,
            provider: config.provider,
            model: config.model,
          });
        }

        throw new ORPCError("BAD_REQUEST", {
          message: "Selected AI config is disabled. Enable it or choose another config.",
        });
      }

      const decryptedKey = await EncryptionService.decrypt(config.apiKey);
      const configWithDecryptedKey = { ...config, apiKey: decryptedKey };
      const startedAt = Date.now();

      try {
        const { summary, tokens } = await generateSummary(
          article.content,
          configWithDecryptedKey,
          article.feedSource?.language
        );

        await logUsageEvent({
          status: "SUCCESS",
          tokens,
          durationMs: Date.now() - startedAt,
        });

        return { summary, tokens };
      } catch (error) {
        const failureSummary = sanitizeAiErrorSummary(error);

        try {
          await logUsageEvent({
            status: "FAILED",
            durationMs: Date.now() - startedAt,
            errorSummary: failureSummary,
          });
        } catch {
          console.error("Failed to record AI summarize failure event", {
            userId,
            provider: config.provider,
            model: config.model,
          });
        }

        if (error instanceof ORPCError) {
          throw error;
        }

        throw new ORPCError("BAD_REQUEST", {
          message: "Unable to summarize this article with the selected AI config.",
        });
      }
    }),
};
