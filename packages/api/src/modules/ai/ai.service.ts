import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import type { AiConfig } from "@NewsFlow/db";
import { ProviderEnum } from "../ai-config/ai-config.schema";
import { resolveProviderApiBaseUrl } from "../ai-config/provider-base-url";

export function getModel(config: AiConfig): LanguageModel {
  const apiKey = config.apiKey; // Already decrypted before calling
  const parsedProvider = ProviderEnum.safeParse(config.provider);

  if (!parsedProvider.success) {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  const provider = parsedProvider.data;
  const resolvedBaseUrl = resolveProviderApiBaseUrl(provider, config.baseUrl);

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey,
        baseURL: resolvedBaseUrl,
      });
      return openai.chat(config.model);
    }

    case "deepseek":
    case "groq": {
      const openai = createOpenAI({
        apiKey,
        baseURL: resolvedBaseUrl,
      });
      return openai(config.model);
    }

    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey,
        baseURL: resolvedBaseUrl,
      });
      return anthropic(config.model);
    }

    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL: resolvedBaseUrl,
      });
      return google(config.model);
    }

    case "ollama": {
      const ollama = createOpenAI({
        apiKey: "ollama",
        baseURL: resolvedBaseUrl,
      });
      return ollama(config.model);
    }

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

const LANGUAGE_NAME_BY_CODE: Record<string, string> = {
  en: "English",
  "en-us": "English",
  vi: "Vietnamese",
  "vi-vn": "Vietnamese",
  zh: "Chinese (Simplified)",
  "zh-cn": "Chinese (Simplified)",
  kr: "Korean",
  ko: "Korean",
  "ko-kr": "Korean",
  jp: "Japanese",
  ja: "Japanese",
  "ja-jp": "Japanese",
};

function resolveSummaryLanguage(language?: string | null) {
  const normalized = language?.trim().toLowerCase();

  if (!normalized) {
    return "English";
  }

  const baseCode = normalized.split("-")[0] ?? normalized;

  return LANGUAGE_NAME_BY_CODE[normalized] ?? LANGUAGE_NAME_BY_CODE[baseCode] ?? "English";
}

export async function generateSummary(
  content: string,
  config: AiConfig,
  language?: string | null
) {
  const model = getModel(config);
  const langName = resolveSummaryLanguage(language);

  const prompt = `Summarize the following article in ${langName}. Keep it concise in 3-5 bullet points. Reply only in ${langName}.

${content.slice(0, 8000)}`; // Limit content length

  const { text, usage } = await generateText({
    model,
    prompt,
    maxOutputTokens: 500,
  });

  return {
    summary: text,
    tokens: usage?.totalTokens ?? 0,
  };
}

const MAX_ERROR_SUMMARY_LENGTH = 240;

export function sanitizeAiErrorSummary(error: unknown): string {
  const fallbackMessage = "AI summarize request failed.";

  if (error instanceof Error) {
    const sanitizedMessage = error.message
      .replace(/sk-[a-zA-Z0-9_-]{8,}/g, "sk-****")
      .replace(/[\u0000-\u001F\u007F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (sanitizedMessage.length > 0) {
      return sanitizedMessage.slice(0, MAX_ERROR_SUMMARY_LENGTH);
    }
  }

  return fallbackMessage;
}
