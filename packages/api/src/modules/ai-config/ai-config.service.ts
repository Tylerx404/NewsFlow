import { env } from "@NewsFlow/env/server";

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
