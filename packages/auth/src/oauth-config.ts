import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

import { decryptSecret, encryptSecret, maskSecret } from "./secret-crypto";

const DEFAULT_OAUTH_CONFIG_ID = "default";

type PrismaClient = typeof prisma;

type OAuthConfigRecord = Prisma.AuthConfigGetPayload<{
  select: {
    id: true;
    googleClientId: true;
    googleClientSecretEncrypted: true;
    appleClientId: true;
    appleClientSecretEncrypted: true;
    appleAppBundleIdentifier: true;
    updatedByUserId: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export const oauthConfigSelect = {
  id: true,
  googleClientId: true,
  googleClientSecretEncrypted: true,
  appleClientId: true,
  appleClientSecretEncrypted: true,
  appleAppBundleIdentifier: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AuthConfigSelect;

export type OAuthProviderConfig = {
  google?: {
    clientId: string;
    clientSecret: string;
  };
  apple?: {
    clientId: string;
    clientSecret: string;
    appBundleIdentifier?: string;
  };
};

export async function getOAuthConfigRecord(
  db: Pick<PrismaClient, "authConfig"> = prisma
) {
  return db.authConfig.findUnique({
    where: { id: DEFAULT_OAUTH_CONFIG_ID },
    select: oauthConfigSelect,
  });
}

export function isGoogleOAuthConfigured(
  record: OAuthConfigRecord | null
): record is OAuthConfigRecord & {
  googleClientId: string;
  googleClientSecretEncrypted: string;
} {
  return Boolean(record?.googleClientId && record.googleClientSecretEncrypted);
}

export function isAppleOAuthConfigured(
  record: OAuthConfigRecord | null
): record is OAuthConfigRecord & {
  appleClientId: string;
  appleClientSecretEncrypted: string;
} {
  return Boolean(record?.appleClientId && record.appleClientSecretEncrypted);
}

export async function getOAuthProviderConfig(
  db: Pick<PrismaClient, "authConfig"> = prisma
): Promise<OAuthProviderConfig> {
  const record = await getOAuthConfigRecord(db);
  const providers: OAuthProviderConfig = {};

  if (isGoogleOAuthConfigured(record)) {
    providers.google = {
      clientId: record.googleClientId,
      clientSecret: await decryptSecret(record.googleClientSecretEncrypted),
    };
  }

  if (isAppleOAuthConfigured(record)) {
    const appleProvider: OAuthProviderConfig["apple"] = {
      clientId: record.appleClientId,
      clientSecret: await decryptSecret(record.appleClientSecretEncrypted),
    };

    if (record.appleAppBundleIdentifier) {
      appleProvider.appBundleIdentifier = record.appleAppBundleIdentifier;
    }

    providers.apple = appleProvider;
  }

  return providers;
}

export async function maskOAuthConfigRecord(record: OAuthConfigRecord | null) {
  if (!record) {
    return {
      googleClientId: null,
      googleClientSecretMasked: null,
      hasGoogleClientSecret: false,
      appleClientId: null,
      appleClientSecretMasked: null,
      hasAppleClientSecret: false,
      appleAppBundleIdentifier: null,
      isGoogleConfigured: false,
      isAppleConfigured: false,
      updatedByUserId: null,
      updatedAt: null,
      createdAt: null,
    };
  }

  const googleClientSecretMasked = record.googleClientSecretEncrypted
    ? maskSecret(await decryptSecret(record.googleClientSecretEncrypted))
    : null;
  const appleClientSecretMasked = record.appleClientSecretEncrypted
    ? maskSecret(await decryptSecret(record.appleClientSecretEncrypted))
    : null;

  return {
    googleClientId: record.googleClientId ?? null,
    googleClientSecretMasked,
    hasGoogleClientSecret: Boolean(record.googleClientSecretEncrypted),
    appleClientId: record.appleClientId ?? null,
    appleClientSecretMasked,
    hasAppleClientSecret: Boolean(record.appleClientSecretEncrypted),
    appleAppBundleIdentifier: record.appleAppBundleIdentifier ?? null,
    isGoogleConfigured: isGoogleOAuthConfigured(record),
    isAppleConfigured: isAppleOAuthConfigured(record),
    updatedByUserId: record.updatedByUserId ?? null,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

export async function buildOAuthConfigUpdateData(input: {
  googleClientId?: string | null;
  googleClientSecret?: string;
  appleClientId?: string | null;
  appleClientSecret?: string;
  appleAppBundleIdentifier?: string | null;
  updatedByUserId: string;
}) {
  const data: {
    updatedByUserId: string;
    googleClientId?: string | null;
    googleClientSecretEncrypted?: string;
    appleClientId?: string | null;
    appleClientSecretEncrypted?: string;
    appleAppBundleIdentifier?: string | null;
  } = {
    updatedByUserId: input.updatedByUserId,
  };

  if (input.googleClientId !== undefined) {
    data.googleClientId = input.googleClientId;
  }

  if (input.googleClientSecret) {
    data.googleClientSecretEncrypted = await encryptSecret(input.googleClientSecret);
  }

  if (input.appleClientId !== undefined) {
    data.appleClientId = input.appleClientId;
  }

  if (input.appleClientSecret) {
    data.appleClientSecretEncrypted = await encryptSecret(input.appleClientSecret);
  }

  if (input.appleAppBundleIdentifier !== undefined) {
    data.appleAppBundleIdentifier = input.appleAppBundleIdentifier;
  }

  return data;
}

export { DEFAULT_OAUTH_CONFIG_ID };
