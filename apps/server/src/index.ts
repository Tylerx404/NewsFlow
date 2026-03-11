import { createContext } from "@NewsFlow/api/context";
import { appRouter } from "@NewsFlow/api/routers/index";
import { resolveUserCountry } from "@NewsFlow/api";
import { auth } from "@NewsFlow/auth";
import {
  cancelSubscriptionForUser,
  constructStripeWebhookEvent,
  createBillingPortalSessionForUser,
  createCheckoutSessionForUser,
  getStripePromotionPreview,
  handleStripeWebhookEvent,
  isStripeBillingPlan,
  mapStripeBillingError,
  normalizeStripeBodyUrl,
  restoreSubscriptionForUser,
  syncStripeSubscriptionsManually,
} from "@NewsFlow/auth/stripe-billing";
import prisma from "@NewsFlow/db";
import { env } from "@NewsFlow/env/server";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

const app = express();

const MAX_SESSION_IMAGE_LENGTH = 4_096;
const STARTUP_STRIPE_SYNC_LIMIT = 1_000;
const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

type DecodedImage = {
  mimeType: string;
  buffer: Buffer;
};

async function runStartupStripeSync() {
  try {
    const result = await syncStripeSubscriptionsManually(prisma, {
      status: "all",
      limit: STARTUP_STRIPE_SYNC_LIMIT,
    });

    console.log("[stripe-sync] Startup sync completed", result);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    console.error("[stripe-sync] Startup sync failed", {
      statusCode: mapped.statusCode,
      message: mapped.message,
    });
  }
}

function getSessionImageUrl() {
  return `${env.BETTER_AUTH_URL}/api/auth/session-image`;
}

function isSessionImageUrl(value: string) {
  return value.startsWith(getSessionImageUrl());
}

function decodeDataUrl(value: string): DecodedImage | null {
  const match = value.match(DATA_URL_PATTERN);

  if (!match) {
    return null;
  }

  const [, mimeType, base64Payload] = match;

  if (!mimeType || !base64Payload) {
    return null;
  }

  try {
    return {
      mimeType,
      buffer: Buffer.from(base64Payload, "base64"),
    };
  } catch {
    return null;
  }
}

function sanitizeSessionResponse(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  if (!session?.user?.image || session.user.image.length <= MAX_SESSION_IMAGE_LENGTH) {
    return session;
  }

  if (!session.user.image.startsWith("data:")) {
    return session;
  }

  return {
    ...session,
    user: {
      ...session.user,
      image: getSessionImageUrl(),
    },
  };
}

function getSingleHeaderValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] ?? null : null;
}

function resolveClientIp(req: express.Request) {
  const forwardedFor = getSingleHeaderValue(req.headers["x-forwarded-for"]);

  if (forwardedFor) {
    const firstForwarded = forwardedFor.split(",")[0]?.trim();

    if (firstForwarded) {
      return firstForwarded;
    }
  }

  const realIp = getSingleHeaderValue(req.headers["x-real-ip"]);

  if (realIp) {
    return realIp.trim();
  }

  if (typeof req.ip === "string" && req.ip.trim()) {
    return req.ip.trim();
  }

  return req.socket.remoteAddress ?? null;
}

async function syncUserCountryFromRequest(req: express.Request, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      countryCode: true,
      countrySource: true,
      phoneNumber: true,
    },
  });

  if (!user) {
    return;
  }

  const resolved = await resolveUserCountry({
    phoneNumber: user.phoneNumber,
    ipAddress: resolveClientIp(req),
    acceptLanguageHeader: getSingleHeaderValue(req.headers["accept-language"]),
    defaultCountryCode: "GLOBAL",
  });

  if (user.countryCode === resolved.countryCode && user.countrySource === resolved.source) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      countryCode: resolved.countryCode,
      countrySource: resolved.source,
    },
  });

  console.info("[country-resolution] Updated user country", {
    userId,
    source: resolved.source,
    countryCode: resolved.countryCode,
  });
}

async function requireSessionUser(req: express.Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user?.id) {
    return null;
  }

  try {
    await syncUserCountryFromRequest(req, session.user.id);
  } catch (error) {
    console.warn("[country-resolution] Failed to sync user country from request", {
      userId: session.user.id,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return session.user;
}

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
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ message: "Stripe webhook payload must be raw bytes." });
      return;
    }

    if (typeof signature !== "string") {
      res.status(400).json({ message: "Missing Stripe signature header." });
      return;
    }

    try {
      const { config, event } = await constructStripeWebhookEvent(req.body, signature);
      await handleStripeWebhookEvent(prisma, event, config);
      res.status(200).json({ received: true });
    } catch (error) {
      const mapped = mapStripeBillingError(error);
      res.status(mapped.statusCode).json({ message: mapped.message });
    }
  }
);

app.post("/api/billing/promotion/preview", express.json(), async (req, res) => {
  const plan = typeof req.body?.plan === "string" ? req.body.plan.toLowerCase() : "";
  const annual = req.body?.annual === true;
  const rawCode = typeof req.body?.code === "string" ? req.body.code.trim() : "";

  if (!isStripeBillingPlan(plan)) {
    res.status(400).json({ message: "Invalid plan." });
    return;
  }

  try {
    const preview = await getStripePromotionPreview(plan, annual, rawCode);
    res.json(preview);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    res.status(mapped.statusCode).json({ message: mapped.message });
  }
});

app.post("/api/auth/subscription/upgrade", express.json(), async (req, res) => {
  const user = await requireSessionUser(req);

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const plan = typeof req.body?.plan === "string" ? req.body.plan.toLowerCase() : "";
  const annual = req.body?.annual === true;
  const successUrl = normalizeStripeBodyUrl(req.body?.successUrl);
  const cancelUrl = normalizeStripeBodyUrl(req.body?.cancelUrl);
  const returnUrl = normalizeStripeBodyUrl(req.body?.returnUrl);
  const promotionCodeHeader = req.headers["x-newsflow-promo-code"];
  const promotionCode =
    typeof promotionCodeHeader === "string"
      ? promotionCodeHeader
      : Array.isArray(promotionCodeHeader)
        ? promotionCodeHeader[0]
        : null;

  if (!isStripeBillingPlan(plan) || !successUrl || !cancelUrl) {
    res.status(400).json({ message: "Invalid subscription upgrade payload." });
    return;
  }

  try {
    const result = await createCheckoutSessionForUser(prisma, {
      userId: user.id,
      plan,
      annual,
      successUrl,
      cancelUrl,
      returnUrl: returnUrl ?? successUrl,
      promotionCode,
    });

    res.json(result);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    res.status(mapped.statusCode).json({ message: mapped.message });
  }
});

app.post("/api/auth/subscription/billing-portal", express.json(), async (req, res) => {
  const user = await requireSessionUser(req);

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const returnUrl = normalizeStripeBodyUrl(req.body?.returnUrl);

  if (!returnUrl) {
    res.status(400).json({ message: "Invalid billing portal payload." });
    return;
  }

  try {
    const result = await createBillingPortalSessionForUser(prisma, {
      userId: user.id,
      returnUrl,
    });

    res.json(result);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    res.status(mapped.statusCode).json({ message: mapped.message });
  }
});

app.post("/api/auth/subscription/cancel", express.json(), async (req, res) => {
  const user = await requireSessionUser(req);

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await cancelSubscriptionForUser(prisma, user.id);
    res.json(result);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    res.status(mapped.statusCode).json({ message: mapped.message });
  }
});

app.post("/api/auth/subscription/restore", express.json(), async (req, res) => {
  const user = await requireSessionUser(req);

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await restoreSubscriptionForUser(prisma, user.id);
    res.json(result);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    res.status(mapped.statusCode).json({ message: mapped.message });
  }
});

app.post("/api/admin/stripe/manual-sync", express.json(), async (req, res) => {
  const user = await requireSessionUser(req);

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (user.role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const rawLimit = req.body?.limit;
  const parsedLimit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit)
      ? Math.trunc(rawLimit)
      : null;
  const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : undefined;

  try {
    const result = await syncStripeSubscriptionsManually(prisma, {
      limit,
      status: "all",
    });

    res.status(200).json(result);
  } catch (error) {
    const mapped = mapStripeBillingError(error);
    res.status(mapped.statusCode).json({ message: mapped.message });
  }
});

app.get("/api/auth/get-session", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (session?.user?.id) {
    try {
      await syncUserCountryFromRequest(req, session.user.id);
    } catch (error) {
      console.warn("[country-resolution] Failed to sync country on get-session", {
        userId: session.user.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  res.json(sanitizeSessionResponse(session));
});

app.get("/api/auth/session-image", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user?.image) {
    res.status(404).end();
    return;
  }

  if (!session.user.image.startsWith("data:")) {
    if (isSessionImageUrl(session.user.image)) {
      res.status(404).end();
      return;
    }

    res.redirect(session.user.image);
    return;
  }

  const decodedImage = decodeDataUrl(session.user.image);

  if (!decodedImage) {
    res.status(400).json({ message: "Invalid session image." });
    return;
  }

  res.setHeader("Content-Type", decodedImage.mimeType);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.send(decodedImage.buffer);
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
  void runStartupStripeSync();
});
