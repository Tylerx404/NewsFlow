# Stripe Setup

This document explains how to configure Stripe from Admin System Ops.

## 1. Create Stripe keys and prices

1. Sign in to the Stripe Dashboard.
2. Choose the correct environment for your setup, usually test mode first.
3. Open `Developers > API keys` and copy:
   - `Publishable key` as `pk_test_...` or `pk_live_...`
   - `Secret key` as `sk_test_...` or `sk_live_...`
4. Create recurring prices for all supported plans:
   - Basic monthly
   - Basic yearly
   - Pro monthly
   - Pro yearly
   - Max monthly
   - Max yearly

## 2. Use the webhook endpoint from Admin System Ops

Do not hard-code the webhook URL in docs, local notes, or admin screenshots.

Open Admin System Ops and copy the `Webhook endpoint` shown in the Stripe card. The value is built from the current server configuration, for example:

- `http://localhost:3000/api/auth/stripe/webhook`
- `https://api.example.com/api/auth/stripe/webhook`

Register this endpoint in Stripe and subscribe at minimum to these events:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The app also understands `invoice.payment_succeeded`, `invoice.payment_failed`, and `invoice_payment.paid` for compatibility, but `checkout.session.completed` and `invoice.paid` are the key events for reliable subscription sync after payment.

## 3. Save Stripe config in admin

Sign in as an `ADMIN` user and open:

- `http://localhost:3001/admin/system-ops`

In the `Stripe config` card, save:

- `Publishable key`
- `Secret key`
- `Webhook secret`
- `Basic monthly price`
- `Basic yearly price`
- `Pro monthly price`
- `Pro yearly price`
- `Max monthly price`
- `Max yearly price`

Notes:

- `Publishable key` stays in plaintext because it is public.
- `Secret key` and `Webhook secret` are encrypted at rest.
- Leaving a secret field blank keeps the currently stored secret.

## 4. Environment expectations

NewsFlow no longer reads `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `STRIPE_PRICE_*` from `apps/server/.env`.

The system still needs core runtime env values such as:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `AI_KEY_ENCRYPTION_SECRET`
- `REDIS_URL`

## 5. Quick verification

1. Open Admin System Ops and confirm Stripe status is configured.
2. Run a checkout flow and complete payment.
3. Confirm the user subscription syncs after:
   - `checkout.session.completed`
   - `invoice.paid`
4. Refresh Admin System Ops and verify secrets remain masked.
5. Open the Stripe webhook delivery logs and confirm the configured endpoint receives the expected events.
