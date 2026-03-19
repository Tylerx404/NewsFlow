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

const { decryptSecret } = await import("./secret-crypto");
const { buildStripeConfigUpdateData, maskStripeConfigRecord } = await import(
  "./stripe-config"
);

describe("stripe config helpers", () => {
  it("encrypts only Stripe secrets while keeping publishable key plaintext", async () => {
    const updateData = await buildStripeConfigUpdateData({
      publishableKey: "pk_test_public",
      secretKey: "sk_test_secret_value",
      webhookSecret: "whsec_secret_value",
      updatedByUserId: "admin-user",
    });

    expect(updateData.publishableKey).toBe("pk_test_public");
    expect(typeof updateData.secretKeyEncrypted).toBe("string");
    expect(typeof updateData.webhookSecretEncrypted).toBe("string");
    expect(updateData.secretKeyEncrypted).not.toBe("sk_test_secret_value");
    expect(updateData.webhookSecretEncrypted).not.toBe("whsec_secret_value");

    expect(await decryptSecret(updateData.secretKeyEncrypted!)).toBe(
      "sk_test_secret_value"
    );
    expect(await decryptSecret(updateData.webhookSecretEncrypted!)).toBe(
      "whsec_secret_value"
    );
  });

  it("masks decrypted Stripe secrets in admin responses", async () => {
    const updateData = await buildStripeConfigUpdateData({
      publishableKey: "pk_test_public",
      secretKey: "sk_test_secret_1234",
      webhookSecret: "whsec_secret_5678",
      updatedByUserId: "admin-user",
    });

    const masked = await maskStripeConfigRecord({
      id: "default",
      publishableKey: "pk_test_public",
      secretKeyEncrypted: updateData.secretKeyEncrypted!,
      webhookSecretEncrypted: updateData.webhookSecretEncrypted!,
      priceBasicMonthly: "price_basic_monthly",
      priceBasicYearly: "price_basic_yearly",
      priceProMonthly: "price_pro_monthly",
      priceProYearly: "price_pro_yearly",
      priceMaxMonthly: "price_max_monthly",
      priceMaxYearly: "price_max_yearly",
      updatedByUserId: "admin-user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(masked.publishableKey).toBe("pk_test_public");
    expect(masked.secretKeyMasked).toBe("sk_test_****1234");
    expect(masked.webhookSecretMasked).toBe("whsec_****5678");
    expect(masked.hasSecretKey).toBe(true);
    expect(masked.hasWebhookSecret).toBe(true);
  });
});
