import { createContext } from "@NewsFlow/api/context";
import { appRouter } from "@NewsFlow/api/routers/index";
import { auth } from "@NewsFlow/auth";
import { env } from "@NewsFlow/env/server";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import Stripe from "stripe";

const app = express();
const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

const planPriceIdByInterval = {
  basic: {
    monthly: env.STRIPE_PRICE_BASIC_MONTHLY,
    yearly: env.STRIPE_PRICE_BASIC_YEARLY,
  },
  pro: {
    monthly: env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: env.STRIPE_PRICE_PRO_YEARLY,
  },
  max: {
    monthly: env.STRIPE_PRICE_MAX_MONTHLY,
    yearly: env.STRIPE_PRICE_MAX_YEARLY,
  },
} as const;

type SubscriptionPlanKey = keyof typeof planPriceIdByInterval;

type PromotionPreviewResponse = {
  valid: boolean;
  code: string | null;
  baseAmount: number;
  finalAmount: number;
  currency: string;
  discountPercent: number | null;
  amountOff: number | null;
  reason: string | null;
};

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-NewsFlow-Promo-Code"],
    credentials: true,
  }),
);

app.post(
  "/api/auth/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.body = req.body.toString("utf8");
    }
    next();
  },
);

app.post("/api/billing/promotion/preview", express.json(), async (req, res) => {
  const plan = typeof req.body?.plan === "string" ? req.body.plan.toLowerCase() : "";
  const annual = req.body?.annual === true;
  const rawCode = typeof req.body?.code === "string" ? req.body.code.trim() : "";

  if (plan !== "basic" && plan !== "pro" && plan !== "max") {
    res.status(400).json({ message: "Invalid plan." });
    return;
  }

  const billingInterval = annual ? "yearly" : "monthly";
  const priceId = planPriceIdByInterval[plan as SubscriptionPlanKey][billingInterval];

  try {
    const price = await stripeClient.prices.retrieve(priceId, { expand: ["product"] });

    if (!price || typeof price.unit_amount !== "number") {
      res.status(400).json({ message: "Price is not configured correctly." });
      return;
    }

    const baseAmount = price.unit_amount;
    const currency = price.currency.toLowerCase();
    const emptyCodeResponse: PromotionPreviewResponse = {
      valid: false,
      code: null,
      baseAmount,
      finalAmount: baseAmount,
      currency,
      discountPercent: null,
      amountOff: null,
      reason: "No promotion code provided.",
    };

    if (!rawCode) {
      res.json(emptyCodeResponse);
      return;
    }

    const normalizedCode = rawCode.toUpperCase();
    const promotionCodeList = await stripeClient.promotionCodes.list({
      code: normalizedCode,
      active: true,
      limit: 10,
    });
    const promotionCode = promotionCodeList.data.find(
      (item) => item.code?.toUpperCase() === normalizedCode
    );

    if (!promotionCode) {
      res.json({
        ...emptyCodeResponse,
        code: normalizedCode,
        reason: "Promotion code is invalid or inactive.",
      } satisfies PromotionPreviewResponse);
      return;
    }

    const couponField = (promotionCode as { coupon?: Stripe.Coupon | string | null })
      .coupon;
    if (!couponField) {
      res.json({
        ...emptyCodeResponse,
        code: normalizedCode,
        reason: "Promotion code does not contain a valid coupon.",
      } satisfies PromotionPreviewResponse);
      return;
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
      res.json({
        ...emptyCodeResponse,
        code: normalizedCode,
        reason: "Promotion code does not apply to this plan.",
      } satisfies PromotionPreviewResponse);
      return;
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
        res.json({
          ...emptyCodeResponse,
          code: normalizedCode,
          reason: "Promotion code currency does not match plan currency.",
        } satisfies PromotionPreviewResponse);
        return;
      }
      amountOff = coupon.amount_off;
      finalAmount = Math.max(0, baseAmount - coupon.amount_off);
    }

    res.json({
      valid: true,
      code: promotionCode.code?.toUpperCase() ?? normalizedCode,
      baseAmount,
      finalAmount,
      currency,
      discountPercent,
      amountOff,
      reason: null,
    } satisfies PromotionPreviewResponse);
  } catch {
    res.status(500).json({ message: "Unable to validate promotion code." });
  }
});

app.all("/api/auth{/*path}", toNodeHandler(auth));

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use(async (req, res, next) => {
  const rpcResult = await rpcHandler.handle(req, res, {
    prefix: "/rpc",
    context: await createContext({ req }),
  });
  if (rpcResult.matched) return;

  const apiResult = await apiHandler.handle(req, res, {
    prefix: "/api-reference",
    context: await createContext({ req }),
  });
  if (apiResult.matched) return;

  next();
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
