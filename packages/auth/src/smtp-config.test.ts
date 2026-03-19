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
const { SmtpConfigError, buildSmtpConfigUpdateData, validateSmtpConfigInput } =
  await import("./smtp-config");

describe("smtp config helpers", () => {
  it("validates SMTP port and sender email", () => {
    expect(() =>
      validateSmtpConfigInput({
        port: 0,
      })
    ).toThrow(SmtpConfigError);

    expect(() =>
      validateSmtpConfigInput({
        port: 587,
        fromEmail: "invalid-email",
      })
    ).toThrow("SMTP from email must be a valid email address.");

    expect(
      validateSmtpConfigInput({
        host: "smtp.example.com",
        port: 587,
        username: "mailer@example.com",
        fromEmail: "no-reply@example.com",
      })
    ).toBe(true);
  });

  it("encrypts the SMTP password when building update data", async () => {
    const updateData = await buildSmtpConfigUpdateData({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      username: "mailer@example.com",
      password: "super-secret-password",
      fromEmail: "no-reply@example.com",
      fromName: "NewsFlow",
      updatedByUserId: "admin-user",
    });

    expect(updateData.passwordEncrypted).toBeDefined();
    expect(await decryptSecret(updateData.passwordEncrypted!)).toBe(
      "super-secret-password"
    );
  });
});
