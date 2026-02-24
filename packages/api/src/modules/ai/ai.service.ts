import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import type { AiConfig } from "@NewsFlow/db";
import { ProviderEnum } from "../ai-config/ai-config.schema";
import { resolveProviderBaseUrl } from "../ai-config/provider-base-url";

export function getModel(config: AiConfig): LanguageModel {
  const apiKey = config.apiKey; // Already decrypted before calling
  const parsedProvider = ProviderEnum.safeParse(config.provider);

  if (!parsedProvider.success) {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  const provider = parsedProvider.data;
  const resolvedBaseUrl = resolveProviderBaseUrl(provider, config.baseUrl);

  switch (provider) {
    case "openai":
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

export async function generateSummary(
  content: string,
  config: AiConfig,
  language?: string | null
) {
  const model = getModel(config);

  const lang = language || "en";
  const langName = lang === "vi" ? "Vietnamese" : lang === "en" ? "English" : lang;

  const prompt = `Summarize the following article in ${langName}. Keep it concise (3-5 bullet points):

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
