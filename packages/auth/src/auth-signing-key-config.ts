import { createHash, createPrivateKey, createPublicKey } from "node:crypto";

import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

import { isMissingConfigTableError } from "./config-table-fallback";
import { decryptSecret, encryptSecret } from "./secret-crypto";

const DEFAULT_AUTH_SIGNING_KEY_CONFIG_ID = "default";
export const AUTH_SIGNING_KEY_ALGORITHM = "RS256";

type PrismaClient = typeof prisma;

type AuthSigningKeyConfigRecord = Prisma.AuthSigningKeyConfigGetPayload<{
  select: {
    id: true;
    algorithm: true;
    publicKeyPem: true;
    privateKeyPemEncrypted: true;
    updatedByUserId: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export interface AuthSigningKeyRuntimeConfig {
  algorithm: typeof AUTH_SIGNING_KEY_ALGORITHM;
  publicKeyPem: string;
  privateKeyPem: string;
}

export class AuthSigningKeyConfigError extends Error {}

export const authSigningKeyConfigSelect = {
  id: true,
  algorithm: true,
  publicKeyPem: true,
  privateKeyPemEncrypted: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AuthSigningKeyConfigSelect;

function normalizePem(value: string) {
  return value.trim();
}

function getPublicKeyDerFingerprint(publicKeyPem: string) {
  let key: ReturnType<typeof createPublicKey>;

  try {
    key = createPublicKey(publicKeyPem);
  } catch {
    throw new AuthSigningKeyConfigError(
      "Auth signing public key must be a valid RSA public key in PEM format."
    );
  }

  if (key.asymmetricKeyType !== "rsa") {
    throw new AuthSigningKeyConfigError(
      "Auth signing public key must be a valid RSA public key in PEM format."
    );
  }

  const der = key.export({
    type: "spki",
    format: "der",
  });

  return createHash("sha256").update(der).digest("hex");
}

function validatePrivateKeyPem(privateKeyPem: string) {
  let key: ReturnType<typeof createPrivateKey>;

  try {
    key = createPrivateKey(privateKeyPem);
  } catch {
    throw new AuthSigningKeyConfigError(
      "Auth signing private key must be a valid RSA private key in PEM format."
    );
  }

  if (key.asymmetricKeyType !== "rsa") {
    throw new AuthSigningKeyConfigError(
      "Auth signing private key must be a valid RSA private key in PEM format."
    );
  }

  return key;
}

export function getAuthSigningKeyFingerprint(publicKeyPem: string) {
  const fingerprint = getPublicKeyDerFingerprint(publicKeyPem);
  return `${fingerprint.slice(0, 12)}...${fingerprint.slice(-12)}`;
}

export function validateAuthSigningKeyPair(
  publicKeyPem: string,
  privateKeyPem: string
) {
  const normalizedPublicKeyPem = normalizePem(publicKeyPem);
  const normalizedPrivateKeyPem = normalizePem(privateKeyPem);
  const providedPublicFingerprint = getPublicKeyDerFingerprint(normalizedPublicKeyPem);
  const privateKey = validatePrivateKeyPem(normalizedPrivateKeyPem);
  const derivedPublicKey = createPublicKey(privateKey).export({
    type: "spki",
    format: "pem",
  });
  const derivedPublicFingerprint = getPublicKeyDerFingerprint(
    derivedPublicKey.toString()
  );

  if (providedPublicFingerprint !== derivedPublicFingerprint) {
    throw new AuthSigningKeyConfigError(
      "Auth signing public key and private key do not belong to the same RSA key pair."
    );
  }

  return {
    publicKeyPem: normalizedPublicKeyPem,
    privateKeyPem: normalizedPrivateKeyPem,
    fingerprint: `${providedPublicFingerprint.slice(0, 12)}...${providedPublicFingerprint.slice(-12)}`,
  };
}

export async function getAuthSigningKeyConfigRecord(
  db: Pick<PrismaClient, "authSigningKeyConfig"> = prisma
) {
  try {
    return await db.authSigningKeyConfig.findUnique({
      where: { id: DEFAULT_AUTH_SIGNING_KEY_CONFIG_ID },
      select: authSigningKeyConfigSelect,
    });
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      return null;
    }

    throw error;
  }
}

export function isAuthSigningKeyConfigComplete(
  record: AuthSigningKeyConfigRecord | null
): record is AuthSigningKeyConfigRecord & {
  publicKeyPem: string;
  privateKeyPemEncrypted: string;
} {
  return Boolean(
    record?.algorithm === AUTH_SIGNING_KEY_ALGORITHM &&
      record.publicKeyPem &&
      record.privateKeyPemEncrypted
  );
}

export async function getAuthSigningKeyRuntimeConfig(
  db: Pick<PrismaClient, "authSigningKeyConfig"> = prisma
): Promise<AuthSigningKeyRuntimeConfig | null> {
  const record = await getAuthSigningKeyConfigRecord(db);

  if (!isAuthSigningKeyConfigComplete(record)) {
    return null;
  }

  return {
    algorithm: AUTH_SIGNING_KEY_ALGORITHM,
    publicKeyPem: record.publicKeyPem,
    privateKeyPem: await decryptSecret(record.privateKeyPemEncrypted),
  };
}

export async function maskAuthSigningKeyConfigRecord(
  record: AuthSigningKeyConfigRecord | null
) {
  if (!record) {
    return {
      algorithm: AUTH_SIGNING_KEY_ALGORITHM,
      publicKeyPem: null,
      publicKeyFingerprint: null,
      privateKeyMasked: null,
      hasPrivateKey: false,
      isConfigured: false,
      updatedByUserId: null,
      updatedAt: null,
      createdAt: null,
    };
  }

  return {
    algorithm: record.algorithm,
    publicKeyPem: record.publicKeyPem ?? null,
    publicKeyFingerprint: record.publicKeyPem
      ? getAuthSigningKeyFingerprint(record.publicKeyPem)
      : null,
    privateKeyMasked: record.privateKeyPemEncrypted ? "Configured" : null,
    hasPrivateKey: Boolean(record.privateKeyPemEncrypted),
    isConfigured: isAuthSigningKeyConfigComplete(record),
    updatedByUserId: record.updatedByUserId ?? null,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

export async function buildAuthSigningKeyConfigUpdateData(
  input: {
    publicKeyPem?: string | null;
    privateKeyPem?: string;
    updatedByUserId: string;
  },
  existingRecord?: AuthSigningKeyConfigRecord | null
) {
  const data: {
    updatedByUserId: string;
    algorithm: typeof AUTH_SIGNING_KEY_ALGORITHM;
    publicKeyPem?: string | null;
    privateKeyPemEncrypted?: string | null;
  } = {
    updatedByUserId: input.updatedByUserId,
    algorithm: AUTH_SIGNING_KEY_ALGORITHM,
  };

  if (input.publicKeyPem !== undefined) {
    data.publicKeyPem = input.publicKeyPem ? normalizePem(input.publicKeyPem) : null;
  }

  if (input.publicKeyPem === null && !input.privateKeyPem) {
    data.privateKeyPemEncrypted = null;
    return data;
  }

  const nextPublicKeyPem =
    data.publicKeyPem !== undefined
      ? data.publicKeyPem
      : existingRecord?.publicKeyPem ?? null;
  const nextPrivateKeyPem = input.privateKeyPem
    ? normalizePem(input.privateKeyPem)
    : existingRecord?.privateKeyPemEncrypted
      ? await decryptSecret(existingRecord.privateKeyPemEncrypted)
      : null;

  if (
    typeof input.publicKeyPem === "string" ||
    Boolean(input.privateKeyPem)
  ) {
    if (!nextPublicKeyPem || !nextPrivateKeyPem) {
      throw new AuthSigningKeyConfigError(
        "Both public key and private key are required to configure auth signing keys."
      );
    }

    validateAuthSigningKeyPair(nextPublicKeyPem, nextPrivateKeyPem);
  }

  if (input.privateKeyPem) {
    data.privateKeyPemEncrypted = await encryptSecret(nextPrivateKeyPem!);
  }

  return data;
}

export { DEFAULT_AUTH_SIGNING_KEY_CONFIG_ID };
