import { env } from "@NewsFlow/env/server";
import { ORPCError } from "@orpc/server";

import type { Provider } from "./ai-config.schema";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 16;

export class EncryptionService {
  private static async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(env.AI_KEY_ENCRYPTION_SECRET);

    // Hash to ensure exactly 32 bytes
    const hash = await crypto.subtle.digest("SHA-256", keyData);

    return crypto.subtle.importKey(
      "raw",
      hash,
      { name: ALGORITHM, length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encrypted);

    // Format: base64(iv + ciphertextWithAuthTag)
    const combined = new Uint8Array([...iv, ...encryptedArray]);
    return Buffer.from(combined).toString("base64");
  }

  static async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    const combined = Buffer.from(ciphertext, "base64");

    const iv = combined.subarray(0, IV_LENGTH);
    const encryptedWithTag = combined.subarray(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encryptedWithTag
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  static maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return "****";
    const prefix = apiKey.startsWith("sk-") ? "sk-" : "";
    const visible = apiKey.slice(-4);
    return `${prefix}****${visible}`;
  }
}

const OPENAI_COMPATIBLE_DEFAULT_BASE_URL: Record<
  "openai" | "deepseek" | "groq",
  string
> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const parseOpenAICompatibleModels = (payload: unknown): string[] => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  return payload.data
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string"
      ) {
        return item.id;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
};

const parseAnthropicModels = (payload: unknown): string[] => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    return [];
  }

  return payload.data
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string"
      ) {
        return item.id;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
};

const parseGoogleModels = (payload: unknown): string[] => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("models" in payload) ||
    !Array.isArray(payload.models)
  ) {
    return [];
  }

  return payload.models
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        typeof item.name === "string"
      ) {
        return item.name.replace(/^models\//, "");
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
};

const parseOllamaModels = (payload: unknown): string[] => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("models" in payload) ||
    !Array.isArray(payload.models)
  ) {
    return [];
  }

  return payload.models
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        typeof item.name === "string"
      ) {
        return item.name;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
};

const requestModels = async (
  url: string,
  init?: RequestInit
): Promise<unknown> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Unable to fetch models (${response.status})`,
    });
  }
  return response.json();
};

interface FetchProviderModelsInput {
  provider: Provider;
  apiKey?: string;
  baseUrl?: string | null;
}

export async function fetchProviderModels(
  input: FetchProviderModelsInput
): Promise<string[]> {
  const { provider, apiKey, baseUrl } = input;

  try {
    let models: string[] = [];

    if (provider === "openai" || provider === "deepseek" || provider === "groq") {
      const resolvedBaseUrl = normalizeBaseUrl(
        baseUrl || OPENAI_COMPATIBLE_DEFAULT_BASE_URL[provider]
      );
      const payload = await requestModels(`${resolvedBaseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey ?? ""}`,
        },
      });
      models = parseOpenAICompatibleModels(payload);
    } else if (provider === "anthropic") {
      const resolvedBaseUrl = normalizeBaseUrl(baseUrl || "https://api.anthropic.com");
      const payload = await requestModels(`${resolvedBaseUrl}/v1/models`, {
        headers: {
          "x-api-key": apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
      });
      models = parseAnthropicModels(payload);
    } else if (provider === "google") {
      const resolvedBaseUrl = normalizeBaseUrl(
        baseUrl || "https://generativelanguage.googleapis.com/v1beta"
      );
      const url = new URL(`${resolvedBaseUrl}/models`);
      if (apiKey) {
        url.searchParams.set("key", apiKey);
      }
      const payload = await requestModels(url.toString());
      models = parseGoogleModels(payload);
    } else if (provider === "ollama") {
      const resolvedBaseUrl = normalizeBaseUrl(baseUrl || "http://localhost:11434");
      const payload = await requestModels(`${resolvedBaseUrl}/api/tags`);
      models = parseOllamaModels(payload);
    }

    const uniqueSortedModels = [...new Set(models)].sort((a, b) =>
      a.localeCompare(b)
    );
    if (uniqueSortedModels.length === 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "No models returned by provider.",
      });
    }

    return uniqueSortedModels;
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }

    throw new ORPCError("BAD_REQUEST", {
      message: "Unable to fetch models from provider.",
    });
  }
}
