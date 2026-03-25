import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";
import Stripe from "stripe";

import { isMissingConfigTableError } from "./config-table-fallback";
import { decryptSecret, encryptSecret, maskSecret } from "./secret-crypto";

const DEFAULT_STRIPE_CONFIG_ID = "default";

export type StripePlanName = "basic" | "pro" | "max";
export type StripeBillingInterval = "monthly" | "yearly";

export interface StripeBillingConfig {
  publishableKey: string | null;
  secretKey: string;
  webhookSecret: string;
  priceBasicMonthly: string;
  priceBasicYearly: string;
  priceProMonthly: string;
  priceProYearly: string;
  priceMaxMonthly: string;
  priceMaxYearly: string;
}

type PrismaClient = typeof prisma;

type StripeConfigRecord = Prisma.StripeConfigGetPayload<{
  select: {
    id: true;
    publishableKey: true;
    secretKeyEncrypted: true;
    webhookSecretEncrypted: true;
    priceBasicMonthly: true;
    priceBasicYearly: true;
    priceProMonthly: true;
    priceProYearly: true;
    priceMaxMonthly: true;
    priceMaxYearly: true;
    updatedByUserId: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export const stripeConfigSelect = {
  id: true,
  publishableKey: true,
  secretKeyEncrypted: true,
  webhookSecretEncrypted: true,
  priceBasicMonthly: true,
  priceBasicYearly: true,
  priceProMonthly: true,
  priceProYearly: true,
  priceMaxMonthly: true,
  priceMaxYearly: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StripeConfigSelect;

export async function getStripeConfigRecord(
  db: Pick<PrismaClient, "stripeConfig"> = prisma
) {
  try {
    return await db.stripeConfig.findUnique({
      where: { id: DEFAULT_STRIPE_CONFIG_ID },
      select: stripeConfigSelect,
    });
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      return null;
    }

    throw error;
  }
}

export function isStripeConfigComplete(
  record: StripeConfigRecord | null
): record is StripeConfigRecord & {
  secretKeyEncrypted: string;
  webhookSecretEncrypted: string;
  priceBasicMonthly: string;
  priceBasicYearly: string;
  priceProMonthly: string;
  priceProYearly: string;
  priceMaxMonthly: string;
  priceMaxYearly: string;
} {
  return Boolean(
    record?.secretKeyEncrypted &&
      record.webhookSecretEncrypted &&
      record.priceBasicMonthly &&
      record.priceBasicYearly &&
      record.priceProMonthly &&
      record.priceProYearly &&
      record.priceMaxMonthly &&
      record.priceMaxYearly
  );
}

export async function getStripeBillingConfig(
  db: Pick<PrismaClient, "stripeConfig"> = prisma
): Promise<StripeBillingConfig | null> {
  const record = await getStripeConfigRecord(db);

  if (!isStripeConfigComplete(record)) {
    return null;
  }

  const [secretKey, webhookSecret] = await Promise.all([
    decryptSecret(record.secretKeyEncrypted),
    decryptSecret(record.webhookSecretEncrypted),
  ]);

  return {
    publishableKey: record.publishableKey ?? null,
    secretKey,
    webhookSecret,
    priceBasicMonthly: record.priceBasicMonthly,
    priceBasicYearly: record.priceBasicYearly,
    priceProMonthly: record.priceProMonthly,
    priceProYearly: record.priceProYearly,
    priceMaxMonthly: record.priceMaxMonthly,
    priceMaxYearly: record.priceMaxYearly,
  };
}

export function createStripeClient(config: StripeBillingConfig) {
  return new Stripe(config.secretKey);
}

export function resolveStripePriceId(
  config: StripeBillingConfig,
  plan: StripePlanName,
  interval: StripeBillingInterval
) {
  if (plan === "basic") {
    return interval === "yearly"
      ? config.priceBasicYearly
      : config.priceBasicMonthly;
  }

  if (plan === "pro") {
    return interval === "yearly"
      ? config.priceProYearly
      : config.priceProMonthly;
  }

  return interval === "yearly"
    ? config.priceMaxYearly
    : config.priceMaxMonthly;
}

export function resolvePlanFromPriceId(
  config: StripeBillingConfig,
  priceId: string | null | undefined
): StripePlanName | null {
  if (!priceId) {
    return null;
  }

  if (
    priceId === config.priceBasicMonthly ||
    priceId === config.priceBasicYearly
  ) {
    return "basic";
  }

  if (priceId === config.priceProMonthly || priceId === config.priceProYearly) {
    return "pro";
  }

  if (priceId === config.priceMaxMonthly || priceId === config.priceMaxYearly) {
    return "max";
  }

  return null;
}

export async function maskStripeConfigRecord(record: StripeConfigRecord | null) {
  if (!record) {
    return {
      publishableKey: null,
      secretKeyMasked: null,
      webhookSecretMasked: null,
      hasSecretKey: false,
      hasWebhookSecret: false,
      priceBasicMonthly: null,
      priceBasicYearly: null,
      priceProMonthly: null,
      priceProYearly: null,
      priceMaxMonthly: null,
      priceMaxYearly: null,
      isConfigured: false,
      updatedByUserId: null,
      updatedAt: null,
      createdAt: null,
    };
  }

  const secretKeyMasked = record.secretKeyEncrypted
    ? maskSecret(await decryptSecret(record.secretKeyEncrypted))
    : null;
  const webhookSecretMasked = record.webhookSecretEncrypted
    ? maskSecret(await decryptSecret(record.webhookSecretEncrypted))
    : null;

  return {
    publishableKey: record.publishableKey ?? null,
    secretKeyMasked,
    webhookSecretMasked,
    hasSecretKey: Boolean(record.secretKeyEncrypted),
    hasWebhookSecret: Boolean(record.webhookSecretEncrypted),
    priceBasicMonthly: record.priceBasicMonthly ?? null,
    priceBasicYearly: record.priceBasicYearly ?? null,
    priceProMonthly: record.priceProMonthly ?? null,
    priceProYearly: record.priceProYearly ?? null,
    priceMaxMonthly: record.priceMaxMonthly ?? null,
    priceMaxYearly: record.priceMaxYearly ?? null,
    isConfigured: isStripeConfigComplete(record),
    updatedByUserId: record.updatedByUserId ?? null,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

export async function buildStripeConfigUpdateData(input: {
  publishableKey?: string | null;
  secretKey?: string;
  webhookSecret?: string;
  priceBasicMonthly?: string | null;
  priceBasicYearly?: string | null;
  priceProMonthly?: string | null;
  priceProYearly?: string | null;
  priceMaxMonthly?: string | null;
  priceMaxYearly?: string | null;
  updatedByUserId: string;
}) {
  const data: {
    updatedByUserId: string;
    publishableKey?: string | null;
    secretKeyEncrypted?: string;
    webhookSecretEncrypted?: string;
    priceBasicMonthly?: string | null;
    priceBasicYearly?: string | null;
    priceProMonthly?: string | null;
    priceProYearly?: string | null;
    priceMaxMonthly?: string | null;
    priceMaxYearly?: string | null;
  } = {
    updatedByUserId: input.updatedByUserId,
  };

  if (input.publishableKey !== undefined) {
    data.publishableKey = input.publishableKey;
  }

  if (input.secretKey) {
    data.secretKeyEncrypted = await encryptSecret(input.secretKey);
  }

  if (input.webhookSecret) {
    data.webhookSecretEncrypted = await encryptSecret(input.webhookSecret);
  }

  if (input.priceBasicMonthly !== undefined) {
    data.priceBasicMonthly = input.priceBasicMonthly;
  }

  if (input.priceBasicYearly !== undefined) {
    data.priceBasicYearly = input.priceBasicYearly;
  }

  if (input.priceProMonthly !== undefined) {
    data.priceProMonthly = input.priceProMonthly;
  }

  if (input.priceProYearly !== undefined) {
    data.priceProYearly = input.priceProYearly;
  }

  if (input.priceMaxMonthly !== undefined) {
    data.priceMaxMonthly = input.priceMaxMonthly;
  }

  if (input.priceMaxYearly !== undefined) {
    data.priceMaxYearly = input.priceMaxYearly;
  }

  return data;
}

export { DEFAULT_STRIPE_CONFIG_ID };
