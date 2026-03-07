import type { Prisma } from "@NewsFlow/db";

type AdminAuditFieldValue = string | number | boolean;
type AdminAuditFieldMap = Record<string, AdminAuditFieldValue | undefined>;

interface AdminAuditLogWriter {
  adminAuditLog: {
    create: (args: Prisma.AdminAuditLogCreateArgs) => Promise<unknown>;
  };
}

export interface AdminAuditMetadata {
  reason?: string | null;
  previous?: AdminAuditFieldMap;
  next?: AdminAuditFieldMap;
}

export interface CreateAdminAuditLogInput {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: AdminAuditMetadata;
}

function normalizeAuditFieldMap(fields?: AdminAuditFieldMap) {
  if (!fields) {
    return undefined;
  }

  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Prisma.InputJsonObject;
}

function normalizeAdminAuditMetadata(metadata?: AdminAuditMetadata) {
  if (!metadata) {
    return undefined;
  }

  const normalized: Record<string, Prisma.InputJsonValue> = {};
  const previous = normalizeAuditFieldMap(metadata.previous);
  const next = normalizeAuditFieldMap(metadata.next);

  if (previous) {
    normalized.previous = previous;
  }

  if (next) {
    normalized.next = next;
  }

  if (metadata.reason) {
    normalized.reason = metadata.reason;
  }

  if (Object.keys(normalized).length === 0) {
    return undefined;
  }

  return normalized as Prisma.InputJsonObject;
}

export async function createAdminAuditLog(
  db: AdminAuditLogWriter,
  input: CreateAdminAuditLogInput
) {
  await db.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: normalizeAdminAuditMetadata(input.metadata),
    },
  });
}
