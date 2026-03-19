import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "bun:test";

function ensureTestEnv() {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/newsflow";
  process.env.BETTER_AUTH_SECRET ??= "12345678901234567890123456789012";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3001";
  process.env.AI_KEY_ENCRYPTION_SECRET ??= "12345678901234567890123456789012";
  process.env.REDIS_URL ??= "redis://localhost:6379";
  process.env.NODE_ENV ??= "test";
}

ensureTestEnv();

const {
  AuthSigningKeyConfigError,
  getAuthSigningKeyFingerprint,
  validateAuthSigningKeyPair,
} = await import("./auth-signing-key-config");

function createPemPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

describe("auth signing key config helpers", () => {
  it("accepts a valid RSA PEM key pair and returns a fingerprint", () => {
    const { publicKeyPem, privateKeyPem } = createPemPair();
    const validated = validateAuthSigningKeyPair(publicKeyPem, privateKeyPem);

    expect(validated.publicKeyPem).toContain("BEGIN PUBLIC KEY");
    expect(validated.privateKeyPem).toContain("BEGIN PRIVATE KEY");
    expect(validated.fingerprint).toBe(getAuthSigningKeyFingerprint(publicKeyPem));
  });

  it("rejects mismatched PEM key pairs", () => {
    const firstPair = createPemPair();
    const secondPair = createPemPair();

    expect(() =>
      validateAuthSigningKeyPair(
        firstPair.publicKeyPem,
        secondPair.privateKeyPem
      )
    ).toThrow(AuthSigningKeyConfigError);
  });

  it("rejects malformed PEM input", () => {
    expect(() =>
      validateAuthSigningKeyPair("not-a-public-key", "not-a-private-key")
    ).toThrow(AuthSigningKeyConfigError);
  });
});
