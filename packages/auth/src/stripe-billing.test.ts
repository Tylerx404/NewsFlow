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

const { shouldSyncStripeSubscriptionFromWebhookEvent } = await import(
  "./stripe-billing"
);

describe("shouldSyncStripeSubscriptionFromWebhookEvent", () => {
  it("returns true for checkout and invoice events that should sync subscriptions", () => {
    expect(
      shouldSyncStripeSubscriptionFromWebhookEvent("checkout.session.completed")
    ).toBe(true);
    expect(shouldSyncStripeSubscriptionFromWebhookEvent("invoice.paid")).toBe(
      true
    );
    expect(
      shouldSyncStripeSubscriptionFromWebhookEvent("customer.subscription.updated")
    ).toBe(true);
  });

  it("returns false for unrelated webhook events", () => {
    expect(shouldSyncStripeSubscriptionFromWebhookEvent("payment_intent.succeeded")).toBe(
      false
    );
    expect(shouldSyncStripeSubscriptionFromWebhookEvent("charge.refunded")).toBe(
      false
    );
  });
});
