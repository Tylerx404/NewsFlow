import prisma from "@NewsFlow/db";
import Stripe from "stripe";

import {
  createStripeClient,
  getStripeBillingConfig,
  resolvePlanFromPriceId,
  resolveStripePriceId,
  type StripeBillingConfig,
  type StripeBillingInterval,
  type StripePlanName,
} from "./stripe-config";

type PrismaClient = typeof prisma;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "incomplete",
  "unpaid",
]);

export class StripeBillingError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = "StripeBillingError";
  }
}

function toDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function getPriceDetails(
  stripeSubscription: Stripe.Subscription
): {
  priceId: string | null;
  billingInterval: StripeBillingInterval | null;
  seats: number | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const item = stripeSubscription.items.data[0];
  const price = item?.price;
  const interval = price?.recurring?.interval;

  return {
    priceId: price?.id ?? null,
    billingInterval:
      interval === "month"
        ? "monthly"
        : interval === "year"
          ? "yearly"
          : null,
    seats: item?.quantity ?? null,
    currentPeriodStart: toDate(item?.current_period_start),
    currentPeriodEnd: toDate(item?.current_period_end),
  };
}

async function getStripeResources(
  db: Pick<PrismaClient, "stripeConfig"> = prisma
) {
  const config = await getStripeBillingConfig(db);

  if (!config) {
    throw new StripeBillingError(
      "Stripe is not configured yet. Open Admin System Ops to finish Stripe setup.",
      503
    );
  }

  return {
    config,
    stripeClient: createStripeClient(config),
  };
}

export async function getStripePromotionPreview(
  plan: StripePlanName,
  annual: boolean,
  code: string
) {
  const { config, stripeClient } = await getStripeResources();
  const billingInterval: StripeBillingInterval = annual ? "yearly" : "monthly";
  const priceId = resolveStripePriceId(config, plan, billingInterval);
  const price = await stripeClient.prices.retrieve(priceId, { expand: ["product"] });

  if (typeof price.unit_amount !== "number") {
    throw new StripeBillingError("Price is not configured correctly.", 400);
  }

  const baseAmount = price.unit_amount;
  const currency = price.currency.toLowerCase();
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return {
      valid: false,
      code: null,
      baseAmount,
      finalAmount: baseAmount,
      currency,
      discountPercent: null,
      amountOff: null,
      reason: "No promotion code provided.",
    };
  }

  const promotionCodeList = await stripeClient.promotionCodes.list({
    code: normalizedCode,
    active: true,
    limit: 10,
  });

  const promotionCode = promotionCodeList.data.find(
    (item) => item.code?.toUpperCase() === normalizedCode
  );

  if (!promotionCode) {
    return {
      valid: false,
      code: normalizedCode,
      baseAmount,
      finalAmount: baseAmount,
      currency,
      discountPercent: null,
      amountOff: null,
      reason: "Promotion code is invalid or inactive.",
    };
  }

  const couponField = promotionCode.promotion?.coupon;

  if (!couponField) {
    return {
      valid: false,
      code: normalizedCode,
      baseAmount,
      finalAmount: baseAmount,
      currency,
      discountPercent: null,
      amountOff: null,
      reason: "Promotion code does not contain a valid coupon.",
    };
  }

  const coupon =
    typeof couponField === "string"
      ? await stripeClient.coupons.retrieve(couponField)
      : couponField;

  const allowedProducts = coupon.applies_to?.products ?? [];
  const priceProductId =
    typeof price.product === "string" ? price.product : price.product?.id;

  if (
    allowedProducts.length > 0 &&
    (!priceProductId || !allowedProducts.includes(priceProductId))
  ) {
    return {
      valid: false,
      code: normalizedCode,
      baseAmount,
      finalAmount: baseAmount,
      currency,
      discountPercent: null,
      amountOff: null,
      reason: "Promotion code does not apply to this plan.",
    };
  }

  let finalAmount = baseAmount;
  let discountPercent: number | null = null;
  let amountOff: number | null = null;

  if (typeof coupon.percent_off === "number") {
    discountPercent = coupon.percent_off;
    finalAmount = Math.max(
      0,
      Math.round((baseAmount * (100 - coupon.percent_off)) / 100)
    );
  } else if (typeof coupon.amount_off === "number") {
    const couponCurrency = coupon.currency?.toLowerCase();
    if (couponCurrency && couponCurrency !== currency) {
      return {
        valid: false,
        code: normalizedCode,
        baseAmount,
        finalAmount: baseAmount,
        currency,
        discountPercent: null,
        amountOff: null,
        reason: "Promotion code currency does not match plan currency.",
      };
    }
    amountOff = coupon.amount_off;
    finalAmount = Math.max(0, baseAmount - coupon.amount_off);
  }

  return {
    valid: true,
    code: promotionCode.code?.toUpperCase() ?? normalizedCode,
    baseAmount,
    finalAmount,
    currency,
    discountPercent,
    amountOff,
    reason: null,
  };
}

async function resolvePromotionCodeSessionParams(
  stripeClient: Stripe,
  promotionCode: string | null | undefined
) {
  const rawPromotionCode = promotionCode?.trim();

  if (!rawPromotionCode) {
    return {
      allow_promotion_codes: true,
    } satisfies Stripe.Checkout.SessionCreateParams;
  }

  const normalizedPromotionCode = rawPromotionCode.toUpperCase();
  const promotionCodeList = await stripeClient.promotionCodes.list({
    code: normalizedPromotionCode,
    active: true,
    limit: 10,
  });
  const matchedPromotionCode = promotionCodeList.data.find(
    (item) => item.code?.toUpperCase() === normalizedPromotionCode
  );

  if (!matchedPromotionCode) {
    return {
      allow_promotion_codes: true,
    } satisfies Stripe.Checkout.SessionCreateParams;
  }

  return {
    discounts: [{ promotion_code: matchedPromotionCode.id }],
  } satisfies Stripe.Checkout.SessionCreateParams;
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;

  if (parentSubscription) {
    return typeof parentSubscription === "string"
      ? parentSubscription
      : parentSubscription.id ?? null;
  }

  // Backwards compatibility for older Stripe API versions where `subscription` existed.
  const legacySubscription = (invoice as { subscription?: string | Stripe.Subscription })
    .subscription;

  if (!legacySubscription) {
    return null;
  }

  return typeof legacySubscription === "string"
    ? legacySubscription
    : legacySubscription.id ?? null;
}

async function ensureStripeCustomer(
  db: Pick<PrismaClient, "user">,
  stripeClient: Stripe,
  userId: string
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new StripeBillingError("User not found.", 404);
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripeClient.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user.id,
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

function resolveUserSubscriptionPlan(
  config: StripeBillingConfig,
  stripeSubscription: Stripe.Subscription,
  existingTier: string | null | undefined,
  deleted = false
): StripePlanName | "free" {
  if (deleted) {
    return "free";
  }

  const metadataPlan = stripeSubscription.metadata.plan;
  if (metadataPlan === "basic" || metadataPlan === "pro" || metadataPlan === "max") {
    return metadataPlan;
  }

  const { priceId } = getPriceDetails(stripeSubscription);
  const mappedPlan = resolvePlanFromPriceId(config, priceId);
  if (mappedPlan) {
    return mappedPlan;
  }

  if (existingTier === "basic" || existingTier === "pro" || existingTier === "max") {
    return existingTier;
  }

  return "free";
}

async function findSubscriptionOwner(
  db: Pick<PrismaClient, "subscription" | "user">,
  stripeSubscription: Stripe.Subscription
) {
  const metadataUserId =
    stripeSubscription.metadata.userId || stripeSubscription.metadata.referenceId;

  if (metadataUserId) {
    const user = await db.user.findUnique({
      where: { id: metadataUserId },
      select: { id: true },
    });
    if (user) {
      return user.id;
    }
  }

  const existingSubscription = await db.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
    select: { userId: true },
  });
  if (existingSubscription) {
    return existingSubscription.userId;
  }

  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id;

  if (!customerId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function syncStripeSubscription(
  db: PrismaClient,
  stripeSubscription: Stripe.Subscription,
  options?: {
    deleted?: boolean;
    config?: StripeBillingConfig;
  }
) {
  const config = options?.config ?? (await getStripeBillingConfig(db));

  if (!config) {
    throw new StripeBillingError(
      "Stripe is not configured yet. Open Admin System Ops to finish Stripe setup.",
      503
    );
  }

  const userId = await findSubscriptionOwner(db, stripeSubscription);

  if (!userId) {
    throw new StripeBillingError("Subscription owner could not be resolved.", 404);
  }

  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });

  const { priceId, billingInterval, seats, currentPeriodStart, currentPeriodEnd } =
    getPriceDetails(stripeSubscription);
  const deleted = options?.deleted === true || stripeSubscription.status === "canceled";
  const tier = resolveUserSubscriptionPlan(config, stripeSubscription, existing?.tier, options?.deleted === true);
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id ?? null;

  await db.$transaction(async (tx) => {
    if (customerId) {
      await tx.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    await tx.subscription.upsert({
      where: { userId },
      update: {
        tier,
        status: stripeSubscription.status,
        billingInterval: deleted ? null : billingInterval,
        stripePriceId: priceId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: toDate(stripeSubscription.trial_start),
        trialEnd: toDate(stripeSubscription.trial_end),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelAt: toDate(stripeSubscription.cancel_at),
        canceledAt: toDate(stripeSubscription.canceled_at),
        endedAt: toDate(stripeSubscription.ended_at),
        seats,
        expiresAt:
          currentPeriodEnd ??
          toDate(stripeSubscription.trial_end) ??
          toDate(stripeSubscription.ended_at),
      },
      create: {
        userId,
        tier,
        status: stripeSubscription.status,
        billingInterval: deleted ? null : billingInterval,
        stripePriceId: priceId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: toDate(stripeSubscription.trial_start),
        trialEnd: toDate(stripeSubscription.trial_end),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelAt: toDate(stripeSubscription.cancel_at),
        canceledAt: toDate(stripeSubscription.canceled_at),
        endedAt: toDate(stripeSubscription.ended_at),
        seats,
        expiresAt:
          currentPeriodEnd ??
          toDate(stripeSubscription.trial_end) ??
          toDate(stripeSubscription.ended_at),
      },
    });
  });

  return db.subscription.findUnique({
    where: { userId },
  });
}

export async function createCheckoutSessionForUser(
  db: PrismaClient,
  input: {
    userId: string;
    plan: StripePlanName;
    annual: boolean;
    successUrl: string;
    cancelUrl: string;
    returnUrl?: string;
    promotionCode?: string | null;
  }
) {
  const { config, stripeClient } = await getStripeResources(db);
  const customerId = await ensureStripeCustomer(db, stripeClient, input.userId);
  const existingSubscription = await db.subscription.findUnique({
    where: { userId: input.userId },
    select: {
      stripeSubscriptionId: true,
      status: true,
    },
  });

  if (
    existingSubscription?.stripeSubscriptionId &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(existingSubscription.status)
  ) {
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: input.returnUrl ?? input.successUrl,
    });

    return {
      url: portalSession.url,
    };
  }

  const billingInterval: StripeBillingInterval = input.annual ? "yearly" : "monthly";
  const priceId = resolveStripePriceId(config, input.plan, billingInterval);
  const promotionParams = await resolvePromotionCodeSessionParams(
    stripeClient,
    input.promotionCode
  );

  const checkoutSession = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    ...promotionParams,
    subscription_data: {
      metadata: {
        userId: input.userId,
        plan: input.plan,
        billingInterval,
        referenceId: input.userId,
      },
    },
    metadata: {
      userId: input.userId,
      plan: input.plan,
      billingInterval,
      referenceId: input.userId,
    },
  });

  if (!checkoutSession.url) {
    throw new StripeBillingError("Stripe checkout session did not return a redirect URL.", 500);
  }

  return {
    url: checkoutSession.url,
  };
}

export async function createBillingPortalSessionForUser(
  db: PrismaClient,
  input: {
    userId: string;
    returnUrl: string;
  }
) {
  const { stripeClient } = await getStripeResources(db);
  const customerId = await ensureStripeCustomer(db, stripeClient, input.userId);
  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: input.returnUrl,
  });

  return {
    url: session.url,
  };
}

async function retrieveStripeSubscriptionForUser(
  db: Pick<PrismaClient, "subscription">,
  userId: string
) {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: {
      stripeSubscriptionId: true,
    },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new StripeBillingError("No Stripe subscription is available for this account.", 400);
  }

  return subscription.stripeSubscriptionId;
}

export async function cancelSubscriptionForUser(
  db: PrismaClient,
  userId: string
) {
  const { config, stripeClient } = await getStripeResources(db);
  const stripeSubscriptionId = await retrieveStripeSubscriptionForUser(db, userId);
  const updatedSubscription = await stripeClient.subscriptions.update(
    stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  await syncStripeSubscription(db, updatedSubscription, { config });

  return {
    canceled: true,
  };
}

export async function restoreSubscriptionForUser(
  db: PrismaClient,
  userId: string
) {
  const { config, stripeClient } = await getStripeResources(db);
  const stripeSubscriptionId = await retrieveStripeSubscriptionForUser(db, userId);
  const updatedSubscription = await stripeClient.subscriptions.update(
    stripeSubscriptionId,
    {
      cancel_at_period_end: false,
    }
  );

  await syncStripeSubscription(db, updatedSubscription, { config });

  return {
    restored: true,
  };
}

export async function constructStripeWebhookEvent(
  payload: Buffer,
  signature: string
) {
  const { stripeClient, config } = await getStripeResources();
  return {
    config,
    event: stripeClient.webhooks.constructEvent(payload, signature, config.webhookSecret),
  };
}

export async function handleStripeWebhookEvent(
  db: PrismaClient,
  event: Stripe.Event,
  config: StripeBillingConfig
) {
  const stripeClient = createStripeClient(config);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!subscriptionId) {
      return;
    }

    const userId =
      typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    if (userId && customerId) {
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    await syncStripeSubscription(db, subscription, { config });
    return;
  }

  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      return;
    }

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    await syncStripeSubscription(db, subscription, { config });
    return;
  }

  if (event.type === "invoice_payment.paid") {
    const invoicePayment = event.data.object as Stripe.InvoicePayment;
    const invoiceId =
      typeof invoicePayment.invoice === "string"
        ? invoicePayment.invoice
        : invoicePayment.invoice?.id ?? null;

    if (!invoiceId) {
      return;
    }

    const invoice = await stripeClient.invoices.retrieve(invoiceId);
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      return;
    }

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    await syncStripeSubscription(db, subscription, { config });
    return;
  }

  if (event.type === "customer.subscription.created") {
    await syncStripeSubscription(db, event.data.object as Stripe.Subscription, { config });
    return;
  }

  if (event.type === "customer.subscription.updated") {
    await syncStripeSubscription(db, event.data.object as Stripe.Subscription, { config });
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    await syncStripeSubscription(db, event.data.object as Stripe.Subscription, {
      config,
      deleted: true,
    });
  }
}

export function isStripeBillingPlan(value: string): value is StripePlanName {
  return value === "basic" || value === "pro" || value === "max";
}

export function normalizeStripeBodyUrl(value: unknown) {
  return typeof value === "string" && value.startsWith("http") ? value : null;
}

export function mapStripeBillingError(error: unknown) {
  if (error instanceof StripeBillingError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  if (error instanceof Stripe.errors.StripeError) {
    return {
      statusCode: 400,
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    message: "Stripe request failed.",
  };
}
