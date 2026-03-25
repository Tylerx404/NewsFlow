import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

import { isMissingConfigTableError } from "./config-table-fallback";
import { encryptSecret, decryptSecret } from "./secret-crypto";

const DEFAULT_SMTP_CONFIG_ID = "default";

type PrismaClient = typeof prisma;

type SmtpConfigRecord = Prisma.SmtpConfigGetPayload<{
  select: {
    id: true;
    host: true;
    port: true;
    secure: true;
    username: true;
    passwordEncrypted: true;
    fromEmail: true;
    fromName: true;
    updatedByUserId: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
}

export class SmtpConfigError extends Error {}

const SMTP_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const smtpConfigSelect = {
  id: true,
  host: true,
  port: true,
  secure: true,
  username: true,
  passwordEncrypted: true,
  fromEmail: true,
  fromName: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SmtpConfigSelect;

export async function getSmtpConfigRecord(
  db: Pick<PrismaClient, "smtpConfig"> = prisma
) {
  try {
    return await db.smtpConfig.findUnique({
      where: { id: DEFAULT_SMTP_CONFIG_ID },
      select: smtpConfigSelect,
    });
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      return null;
    }

    throw error;
  }
}

export function isSmtpConfigComplete(
  record: SmtpConfigRecord | null
): record is SmtpConfigRecord & {
  host: string;
  port: number;
  username: string;
  passwordEncrypted: string;
  fromEmail: string;
} {
  return Boolean(
    record?.host &&
      typeof record.port === "number" &&
      Number.isInteger(record.port) &&
      record.username &&
      record.passwordEncrypted &&
      record.fromEmail
  );
}

export async function getSmtpTransportConfig(
  db: Pick<PrismaClient, "smtpConfig"> = prisma
): Promise<SmtpTransportConfig | null> {
  const record = await getSmtpConfigRecord(db);

  if (!isSmtpConfigComplete(record)) {
    return null;
  }

  return {
    host: record.host,
    port: record.port,
    secure: record.secure,
    username: record.username,
    password: await decryptSecret(record.passwordEncrypted),
    fromEmail: record.fromEmail,
    fromName: record.fromName ?? null,
  };
}

export async function maskSmtpConfigRecord(record: SmtpConfigRecord | null) {
  if (!record) {
    return {
      host: null,
      port: null,
      secure: false,
      username: null,
      passwordMasked: null,
      hasPassword: false,
      fromEmail: null,
      fromName: null,
      isConfigured: false,
      updatedByUserId: null,
      updatedAt: null,
      createdAt: null,
    };
  }

  return {
    host: record.host ?? null,
    port: record.port ?? null,
    secure: record.secure,
    username: record.username ?? null,
    passwordMasked: record.passwordEncrypted ? "Configured" : null,
    hasPassword: Boolean(record.passwordEncrypted),
    fromEmail: record.fromEmail ?? null,
    fromName: record.fromName ?? null,
    isConfigured: isSmtpConfigComplete(record),
    updatedByUserId: record.updatedByUserId ?? null,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

export async function buildSmtpConfigUpdateData(input: {
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  username?: string | null;
  password?: string;
  fromEmail?: string | null;
  fromName?: string | null;
  updatedByUserId: string;
}) {
  validateSmtpConfigInput(input);

  const data: {
    updatedByUserId: string;
    host?: string | null;
    port?: number | null;
    secure?: boolean;
    username?: string | null;
    passwordEncrypted?: string;
    fromEmail?: string | null;
    fromName?: string | null;
  } = {
    updatedByUserId: input.updatedByUserId,
  };

  if (input.host !== undefined) {
    data.host = input.host;
  }

  if (input.port !== undefined) {
    data.port = input.port;
  }

  if (input.secure !== undefined) {
    data.secure = input.secure;
  }

  if (input.username !== undefined) {
    data.username = input.username;
  }

  if (input.password) {
    data.passwordEncrypted = await encryptSecret(input.password);
  }

  if (input.fromEmail !== undefined) {
    data.fromEmail = input.fromEmail;
  }

  if (input.fromName !== undefined) {
    data.fromName = input.fromName;
  }

  return data;
}

export function validateSmtpConfigInput(input: {
  host?: string | null;
  port?: number | null;
  username?: string | null;
  fromEmail?: string | null;
}) {
  if (
    input.port !== undefined &&
    input.port !== null &&
    (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535)
  ) {
    throw new SmtpConfigError(
      "SMTP port must be an integer between 1 and 65535."
    );
  }

  if (
    input.fromEmail !== undefined &&
    input.fromEmail !== null &&
    !SMTP_EMAIL_PATTERN.test(input.fromEmail)
  ) {
    throw new SmtpConfigError("SMTP from email must be a valid email address.");
  }

  return true;
}

export { DEFAULT_SMTP_CONFIG_ID };
