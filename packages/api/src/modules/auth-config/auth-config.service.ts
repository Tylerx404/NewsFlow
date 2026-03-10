import prisma from "@NewsFlow/db";
import {
  getOAuthConfigRecord,
  isAppleOAuthConfigured,
  isGoogleOAuthConfigured,
} from "@NewsFlow/auth/oauth-config";

type PrismaClient = typeof prisma;

export async function getPublicAuthConfig(
  db: Pick<PrismaClient, "authConfig">
) {
  const record = await getOAuthConfigRecord(db);

  return {
    appleEnabled: isAppleOAuthConfigured(record),
    googleEnabled: isGoogleOAuthConfigured(record),
  };
}
