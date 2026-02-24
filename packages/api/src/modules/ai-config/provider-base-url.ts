import type { Provider } from "./ai-config.schema";

export const PROVIDER_DEFAULT_BASE_URL: Record<Provider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  ollama: "http://localhost:11434/api",
};

export const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

export const resolveProviderBaseUrl = (
  provider: Provider,
  baseUrl?: string | null
): string => {
  const raw = baseUrl?.trim() || PROVIDER_DEFAULT_BASE_URL[provider];
  const normalized = normalizeBaseUrl(raw);

  if (provider === "ollama" && !normalized.endsWith("/api")) {
    return `${normalized}/api`;
  }

  return normalized;
};
