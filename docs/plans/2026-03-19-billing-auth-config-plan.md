# Billing and Auth Config Implementation Plan

**Goal:** Fix Stripe webhook subscription sync, add admin-managed SMTP email verification, and add secure admin-managed auth signing key storage.

**Architecture:** Extend Prisma-backed system configuration with `SmtpConfig` and `AuthSigningKeyConfig`, keep secret encryption inside `@NewsFlow/auth`, expose new admin system-ops contracts from `@NewsFlow/api`, and update `apps/web` admin/auth flows to support SMTP-backed email verification and new config panels. Keep current Better Auth session flow unchanged while preparing signing keys for future JWT/JWKS work.

**Tech Stack:** Prisma, Better Auth, Express 5, oRPC, Nuxt 4, Vue 3, TypeScript, Bun, nodemailer.

---

### Task 1: Create branch and add the repo plan file

**Files:**
- Add: `docs/plans/2026-03-19-billing-auth-config-plan.md`

**Step 1: Create the working branch**

```bash
git switch dev
git switch -c feature/billing-auth-config
```

**Step 2: Add the implementation plan**

- Save this file under `docs/plans/2026-03-19-billing-auth-config-plan.md`.
- Keep the plan in the same structure used by other files in `docs/plans`.

**Step 3: Commit the plan file**

```bash
git add docs/plans/2026-03-19-billing-auth-config-plan.md
git commit -m "docs(plan): add billing auth config implementation plan"
```

---

### Task 2: Extend Prisma schema for SMTP and auth signing key config

**Files:**
- Modify: `packages/db/prisma/schema/app.prisma`
- Add: `packages/db/prisma/migrations/<timestamp>_add_smtp_and_auth_signing_key_config/migration.sql`

**Step 1: Add `SmtpConfig` model**

- Add a single-row config model keyed by `id = "default"`.
- Fields:
  - `host String?`
  - `port Int?`
  - `secure Boolean @default(false)`
  - `username String?`
  - `passwordEncrypted String?`
  - `fromEmail String?`
  - `fromName String?`
  - `updatedByUserId String?`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- Map to table `smtp_config`.

**Step 2: Add `AuthSigningKeyConfig` model**

- Add a single-row config model keyed by `id = "default"`.
- Fields:
  - `algorithm String @default("RS256")`
  - `publicKeyPem String?`
  - `privateKeyPemEncrypted String?`
  - `updatedByUserId String?`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- Map to table `auth_signing_key_config`.

**Step 3: Add the Prisma migration**

- Create a migration that creates both tables.
- Do not modify existing migration history.

**Step 4: Regenerate Prisma client**

```bash
bun run db:generate
```

**Step 5: Commit**

```bash
git add packages/db/prisma/schema/app.prisma packages/db/prisma/migrations
git commit -m "feat(db): add smtp and auth signing key config tables"
```

---

### Task 3: Add encrypted config helpers in `@NewsFlow/auth`

**Files:**
- Add: `packages/auth/src/smtp-config.ts`
- Add: `packages/auth/src/auth-signing-key-config.ts`
- Add: `packages/auth/src/smtp-mailer.ts`
- Add: `packages/auth/src/smtp-config.test.ts`
- Add: `packages/auth/src/auth-signing-key-config.test.ts`
- Modify: `packages/auth/package.json`

**Step 1: Add SMTP config helpers**

- Follow the same pattern already used by `stripe-config.ts` and `oauth-config.ts`.
- Implement:
  - record selector
  - completeness check
  - decrypt/mask helpers
  - update-data builder
- Only encrypt `passwordEncrypted`.
- Return masked status instead of raw secret values in admin-safe responses.

**Step 2: Add auth signing key config helpers**

- Implement PEM validation with Node crypto APIs.
- Validate that:
  - the public key is valid PEM,
  - the private key is valid PEM,
  - the public/private key pair is compatible,
  - the stored algorithm is fixed to `RS256`.
- Encrypt only the private key.
- Return admin-safe data with:
  - plaintext public key,
  - masked private-key status,
  - fingerprint or summary for the public key,
  - `isConfigured`.

**Step 3: Add SMTP mailer**

- Add a mail sender that:
  - loads SMTP config from DB at send time,
  - creates a nodemailer transport,
  - sends verification emails,
  - logs only safe metadata.
- Throw a clear error when SMTP is incomplete.

**Step 4: Add tests**

- Add `bun:test` coverage for:
  - SMTP config completeness and masking,
  - PEM validation and key-pair matching,
  - rejection of invalid PEM input.

**Step 5: Add dependency**

```bash
bun add nodemailer --filter @NewsFlow/auth
```

**Step 6: Commit**

```bash
git add packages/auth/package.json bun.lock packages/auth/src
git commit -m "feat(auth): add smtp and signing key config helpers"
```

---

### Task 4: Fix Stripe webhook sync and harden Stripe config handling

**Files:**
- Modify: `packages/auth/src/stripe-billing.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/web/app/pages/admin/system-ops.vue`
- Modify: `docs/stripe-setup.md`

**Step 1: Extend webhook event handling**

- Handle `invoice.paid` in the same sync path as other successful payment events.
- Keep support for:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice_payment.paid`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

**Step 2: Add safe webhook logs**

- Log safe context only:
  - `event.type`
  - `subscriptionId`
  - `customerId`
  - mapped error message / status
- Do not log raw payloads, headers, or secrets.

**Step 3: Replace hard-coded webhook endpoint**

- In admin UI, compute the webhook URL from runtime config instead of hard-coding `http://localhost:3000`.
- In the doc, describe the endpoint using the configured server URL and list the required Stripe webhook events.

**Step 4: Audit Stripe config reads and writes**

- Keep `publishableKey` and price IDs plaintext.
- Ensure only secret fields are encrypted, masked, and never returned raw from server-side admin APIs.

**Step 5: Commit**

```bash
git add packages/auth/src/stripe-billing.ts apps/server/src/index.ts apps/web/app/pages/admin/system-ops.vue docs/stripe-setup.md
git commit -m "fix(stripe): harden webhook sync and config handling"
```

---

### Task 5: Add admin API contracts for SMTP and auth signing keys

**Files:**
- Modify: `packages/api/src/modules/admin/admin-system-ops.schema.ts`
- Modify: `packages/api/src/modules/admin/admin-system-ops.service.ts`
- Modify: `packages/api/src/modules/admin/admin-system-ops.router.ts`
- Modify: `apps/web/app/lib/dashboard-query-keys.ts`

**Step 1: Extend admin system-ops schemas**

- Add output and update schemas for:
  - SMTP config
  - auth signing key config
- Reuse current schema conventions:
  - nullable trimmed strings for public fields,
  - optional secret strings for secret updates,
  - explicit booleans for presence/configured state.

**Step 2: Add service methods**

- Add:
  - `getAdminSmtpConfig`
  - `updateAdminSmtpConfig`
  - `getAdminAuthSigningKeyConfig`
  - `updateAdminAuthSigningKeyConfig`
- Use DB transactions and `createAdminAuditLog`.
- Store only safe presence state in audit metadata for password/private key fields.

**Step 3: Add router procedures**

- Add the four new procedures under `admin.systemOps`.
- Keep existing auth/admin protection exactly as-is.

**Step 4: Add query keys**

- Extend dashboard query keys for SMTP config and auth signing key config so the admin page can invalidate and refresh them cleanly.

**Step 5: Commit**

```bash
git add packages/api/src/modules/admin packages/api/src/modules/admin/admin-system-ops.schema.ts packages/api/src/modules/admin/admin-system-ops.service.ts packages/api/src/modules/admin/admin-system-ops.router.ts apps/web/app/lib/dashboard-query-keys.ts
git commit -m "feat(api): add admin smtp and signing key config contracts"
```

---

### Task 6: Enable SMTP-backed email verification in Better Auth

**Files:**
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/api/src/modules/auth-config/auth-config.schema.ts`
- Modify: `packages/api/src/modules/auth-config/auth-config.service.ts`

**Step 1: Configure Better Auth email verification**

- Enable email verification with:
  - `requireEmailVerification: true`
  - `sendOnSignUp: true`
  - `sendOnSignIn: true`
  - `autoSignInAfterVerification: false`
- Use the new SMTP mailer to implement `sendVerificationEmail`.

**Step 2: Keep current session model unchanged**

- Do not enable JWT/JWKS runtime flow.
- Do not change the current Better Auth session storage behavior.

**Step 3: Extend public auth config**

- Change `authConfig.get` output to:

```ts
{
  appleEnabled: boolean;
  googleEnabled: boolean;
  emailVerificationConfigured: boolean;
}
```

- Compute `emailVerificationConfigured` from SMTP config completeness.

**Step 4: Commit**

```bash
git add packages/auth/src/index.ts packages/api/src/modules/auth-config
git commit -m "feat(auth): enable smtp-backed email verification"
```

---

### Task 7: Update Admin System Ops UI and i18n

**Files:**
- Modify: `apps/web/app/pages/admin/system-ops.vue`
- Modify: `apps/web/i18n/locales/en.json`
- Modify: `apps/web/i18n/locales/vi.json`
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Add SMTP config card**

- Add form fields for:
  - host
  - port
  - secure
  - username
  - password
  - from email
  - from name
- Show safe status and last-updated information.

**Step 2: Add auth signing key config card**

- Add form fields for:
  - algorithm display (`RS256`)
  - public key PEM
  - private key PEM
- Show masked private-key state and public key summary/fingerprint.

**Step 3: Wire queries and mutations**

- Load new config queries with Vue Query.
- Add save handlers and invalidation behavior consistent with the existing Stripe/OAuth cards.

**Step 4: Update i18n**

- Add all new labels, help text, success messages, and error messages to every locale already used by the repo.
- Do not leave new UI text hard-coded.

**Step 5: Commit**

```bash
git add apps/web/app/pages/admin/system-ops.vue apps/web/i18n/locales/*.json
git commit -m "feat(web): add smtp and signing key admin panels"
```

---

### Task 8: Update signup and login flow for email verification

**Files:**
- Modify: `apps/web/app/components/SignupForm.vue`
- Modify: `apps/web/app/components/LoginForm.vue`
- Modify: `apps/web/app/plugins/auth-client.ts` only if needed
- Modify: `apps/web/i18n/locales/en.json`
- Modify: `apps/web/i18n/locales/vi.json`
- Modify: `apps/web/i18n/locales/zh.json`
- Modify: `apps/web/i18n/locales/jp.json`
- Modify: `apps/web/i18n/locales/kr.json`

**Step 1: Update signup flow**

- Pass a frontend callback URL for verification redirects.
- When signup succeeds without a session, show a “check your email” success state instead of redirecting into the app.
- If email verification is not configured, block the email/password signup path with a clear message.

**Step 2: Update login flow**

- Pass the same verification callback URL to sign-in.
- Detect the “email not verified” response and show:
  - a clear status message,
  - a resend verification action when SMTP is configured.

**Step 3: Add resend verification support**

- Use the Better Auth verification endpoint from the web client flow.
- Keep the interaction simple and safe for unverified users.

**Step 4: Add query-driven post-verify success state**

- Read a query flag such as `verified=1` on the login page and show a success message after the user returns from the verification link.

**Step 5: Commit**

```bash
git add apps/web/app/components/SignupForm.vue apps/web/app/components/LoginForm.vue apps/web/i18n/locales/*.json
git commit -m "feat(web): support smtp email verification flow"
```

---

### Task 9: Verify schema, types, tests, and smoke behavior

**Files:**
- None (validation only)

**Step 1: Run Prisma generation**

```bash
bun run db:generate
```

Expected: exit code `0`.

**Step 2: Run type checks**

```bash
bun run check-types
```

Expected: exit code `0`.

**Step 3: Run targeted tests**

```bash
bun test packages/auth/src/smtp-config.test.ts packages/auth/src/auth-signing-key-config.test.ts
```

Expected: exit code `0`.

**Step 4: Manual smoke checks**

- Stripe payment updates the user package after `checkout.session.completed` and `invoice.paid`.
- Admin System Ops shows the correct computed webhook URL.
- SMTP/admin secret fields stay masked after save and reload.
- Email/password signup creates an unverified user and sends a verification email.
- The verification link returns the user to login with a success state.
- Unverified login can resend verification email.
- Invalid SMTP config or invalid PEM input is rejected with a clear error.

**Step 5: Commit final polish if needed**

```bash
git add .
git commit -m "fix(auth): polish billing and verification config flow"
```
