import { env } from "@NewsFlow/env/server";

const ALGORITHM = "AES-256-GCM";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class EncryptionService {
  private static async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(env.AI_KEY_ENCRYPTION_SECRET);

    // Hash to ensure exactly 32 bytes
    const hash = await crypto.subtle.digest("SHA-256", keyData);

    return crypto.subtle.importKey(
      "raw",
      hash,
      { name: ALGORITHM },
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
    const authTag = encryptedArray.slice(-AUTH_TAG_LENGTH);
    const ciphertext = encryptedArray.slice(0, -AUTH_TAG_LENGTH);

    // Format: base64(iv:ciphertext:authTag)
    const combined = new Uint8Array([...iv, ...ciphertext, ...authTag]);
    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(-AUTH_TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH, -AUTH_TAG_LENGTH);

    const encryptedWithTag = new Uint8Array([...encrypted, ...authTag]);

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
