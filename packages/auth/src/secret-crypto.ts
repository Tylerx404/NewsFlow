import { env } from "@NewsFlow/env/server";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 16;

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(env.AI_KEY_ENCRYPTION_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", keyData);

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array([...iv, ...encryptedArray]);

  return Buffer.from(combined).toString("base64");
}

export async function decryptSecret(ciphertext: string): Promise<string> {
  const key = await getKey();
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

export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "****";
  }

  const prefixMatch = value.match(/^(sk_(test|live)_|pk_(test|live)_|whsec_)/);
  const prefix = prefixMatch?.[0] ?? "";
  return `${prefix}****${value.slice(-4)}`;
}
