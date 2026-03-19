import prisma from "@NewsFlow/db";
import {
  getOAuthConfigRecord,
  isAppleOAuthConfigured,
  isGoogleOAuthConfigured,
} from "@NewsFlow/auth/oauth-config";
import {
  getSmtpConfigRecord,
  isSmtpConfigComplete,
} from "@NewsFlow/auth/smtp-config";

type PrismaClient = typeof prisma;

export async function getPublicAuthConfig(
  db: Pick<PrismaClient, "authConfig" | "smtpConfig">
) {
  const [oauthRecord, smtpRecord] = await Promise.all([
    getOAuthConfigRecord(db),
    getSmtpConfigRecord(db),
  ]);

  return {
    appleEnabled: isAppleOAuthConfigured(oauthRecord),
    googleEnabled: isGoogleOAuthConfigured(oauthRecord),
    emailVerificationConfigured: isSmtpConfigComplete(smtpRecord),
  };
}
