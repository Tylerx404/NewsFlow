import type { Provider } from "./ai-config.schema";

export const PROVIDER_DEFAULT_BASE_URL: Record<Provider, string> = {
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
  google: "https://generativelanguage.googleapis.com",
  deepseek: "https://api.deepseek.com",
  groq: "https://api.groq.com",
  ollama: "http://localhost:11434",
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

const ensurePathSuffix = (baseUrl: string, suffix: string): string => {
  if (baseUrl.endsWith(suffix)) {
    return baseUrl;
  }
  return `${baseUrl}${suffix}`;
};

export const resolveProviderApiBaseUrl = (
  provider: Provider,
  baseUrl?: string | null
): string => {
  const normalizedBaseUrl = resolveProviderBaseUrl(provider, baseUrl);

  switch (provider) {
    case "openai":
    case "anthropic":
    case "deepseek":
      return ensurePathSuffix(normalizedBaseUrl, "/v1");

    case "google":
      return ensurePathSuffix(normalizedBaseUrl, "/v1beta");

    case "groq":
      return ensurePathSuffix(normalizedBaseUrl, "/openai/v1");

    case "ollama":
      return ensurePathSuffix(normalizedBaseUrl, "/api");
  }
};
