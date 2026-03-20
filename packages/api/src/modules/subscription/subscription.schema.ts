import { z } from "zod";

export const subscriptionTierSchema = z.enum(["free", "basic", "pro", "max"]);
export const subscriptionBillingIntervalSchema = z.enum(["monthly", "yearly"]);

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tier: subscriptionTierSchema,
  status: z.string(),
  billingInterval: subscriptionBillingIntervalSchema.nullable(),
  stripePriceId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  trialStart: z.date().nullable(),
  trialEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  cancelAt: z.date().nullable(),
  canceledAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  seats: z.number().int().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const subscriptionBillingHistoryInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const subscriptionBillingHistoryItemSchema = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string().nullable(),
  createdAt: z.date(),
  currency: z.string(),
  displayAmount: z.number().int(),
  amountPaid: z.number().int(),
  totalAmount: z.number().int(),
  status: z.string(),
  billingReason: z.string().nullable(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  hostedInvoiceUrl: z.string().nullable(),
  invoicePdfUrl: z.string().nullable(),
});

export const subscriptionBillingHistoryOutputSchema = z.object({
  items: z.array(subscriptionBillingHistoryItemSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  isStripeConfigured: z.boolean(),
});
