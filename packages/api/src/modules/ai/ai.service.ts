import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import type { AiConfig } from "@NewsFlow/db";

export function getModel(config: AiConfig): LanguageModel {
  const apiKey = config.apiKey; // Already decrypted before calling

  switch (config.provider) {
    case "openai":
    case "deepseek":
    case "groq": {
      const openai = createOpenAI({
        apiKey,
        baseURL: config.baseUrl || undefined,
      });
      return openai(config.model);
    }

    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(config.model);
    }

    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(config.model);
    }

    case "ollama": {
      const ollama = createOpenAI({
        apiKey: "ollama",
        baseURL: config.baseUrl || "http://localhost:11434/api",
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
