# Admin Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standard admin console for NewsFlow that lets admins manage users, subscriptions, and feed operations safely.

**Architecture:** Add a small authorization layer on top of the existing Better Auth and oRPC stack by extending the Prisma user model with admin and account-status fields, then implement a dedicated `admin` API namespace and guarded Nuxt routes. Keep business logic in `packages/api` services, persistence in Prisma models, and UI in `apps/web` using the existing dashboard layout and shadcn-style components.

**Tech Stack:** Bun, TypeScript, Prisma, Better Auth, oRPC, Nuxt 4, Vue Query, Tailwind, shadcn-nuxt

---

## Notes Before Starting

- This repo does not currently expose an automated test suite.
- Do not add a brand-new test framework as part of this feature.
- Validate each milestone with targeted `bun run check-types` and focused manual verification.
- Use `workspace:*` internal dependencies and existing module boundaries.
- Keep changes scoped to admin access and operations only.

### Task 1: Add admin and account-status schema fields

**Files:**
- Modify: `packages/db/prisma/schema/auth.prisma`
- Modify: `packages/db/prisma/schema/app.prisma`
- Modify: `packages/db/prisma/schema/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_add_admin_management_fields/migration.sql`

**Step 1: Update Prisma user model**

Add:

- `role` enum with `USER` and `ADMIN`
- `status` enum with `ACTIVE` and `SUSPENDED`
- optional `suspendedAt`
- optional `suspendedReason`

**Step 2: Update feed source model**

Add:

- `isEnabled Boolean @default(true)` to `FeedSource`

**Step 3: Add admin audit model**

Create an `AdminAuditLog` model with:

- `id`
- `adminUserId`
- `action`
- `targetType`
- `targetId`
- `metadata Json?`
- `createdAt`

**Step 4: Generate migration artifacts**

Run: `bun run db:generate`

Expected: Prisma client updates without schema errors.

**Step 5: Create migration**

Run: `bun run db:migrate`

Expected: migration file created for the new admin fields and models.

**Step 6: Validate types**

Run: `bun run check-types`

Expected: no type errors from Prisma model updates.

### Task 2: Surface role and status through auth session

**Files:**
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/api/src/context.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Confirm Better Auth session payload includes role and status**

Update auth/session configuration so downstream consumers can reliably access `user.role` and `user.status`.

**Step 2: Add admin authorization middleware**

Create `adminProcedure` in `packages/api/src/index.ts`.

Rules:

- require authenticated session
- require `role === ADMIN`
- optionally reject suspended users for protected flows

**Step 3: Keep protected procedure behavior explicit**

Decide whether suspended users are blocked in all protected routes or only admin routes. Document the chosen rule in code-level logic if needed.

**Step 4: Validate types**

Run: `bun run check-types`

Expected: API context and procedures compile with the new session shape.

### Task 3: Add admin API schemas and services for users

**Files:**
- Create: `packages/api/src/modules/admin/admin-user.schema.ts`
- Create: `packages/api/src/modules/admin/admin-user.service.ts`
- Create: `packages/api/src/modules/admin/admin-user.router.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Define admin user schemas**

Add list filters and mutation input schemas for:

- search query
- role filter
- status filter
- tier filter
- suspend/reactivate action

**Step 2: Implement user listing service**

Return paginated or bounded lists with enough fields for the admin table.

Suggested fields:

- id
- name
- email
- role
- status
- createdAt
- subscription summary
- feed count

**Step 3: Implement user detail service**

Return a focused profile payload for the detail panel.

**Step 4: Implement user status update service**

Support:

- suspend user
- reactivate user

Write an audit log entry for each status change.

**Step 5: Expose admin user router**

Mount procedures under a new `admin` namespace in `packages/api/src/routers/index.ts`.

**Step 6: Validate types**

Run: `bun run check-types`

Expected: admin user router compiles and exports cleanly.

### Task 4: Add admin API schemas and services for subscriptions

**Files:**
- Create: `packages/api/src/modules/admin/admin-subscription.schema.ts`
- Create: `packages/api/src/modules/admin/admin-subscription.service.ts`
- Create: `packages/api/src/modules/admin/admin-subscription.router.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Define subscription admin schemas**

Include filters and actions for:

- tier
- status
- billingInterval
- cancelAtPeriodEnd
- expiresAt updates

**Step 2: Implement subscription list service**

Return admin-friendly rows with user identity, plan data, and Stripe IDs.

**Step 3: Implement support actions**

Add service methods for:

- update tier
- update expiresAt
- update cancelAtPeriodEnd

Write audit log entries for each mutating action.

**Step 4: Expose router procedures**

Mount these procedures beneath the admin namespace.

**Step 5: Validate types**

Run: `bun run check-types`

Expected: admin subscription router compiles and shares consistent shapes with the UI.

### Task 5: Add admin API schemas and services for feeds

**Files:**
- Create: `packages/api/src/modules/admin/admin-feed.schema.ts`
- Create: `packages/api/src/modules/admin/admin-feed.service.ts`
- Create: `packages/api/src/modules/admin/admin-feed.router.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Define feed admin schemas**

Include filters for:

- enabled state
- error state
- stale next fetch state
- extraction failure state

**Step 2: Implement feed list service**

Return system-wide feed source rows with operational indicators.

Suggested fields:

- id
- title
- normalizedUrl
- isEnabled
- errorCount
- lastError
- lastFetched
- nextFetchAt
- article error counts

**Step 3: Implement feed detail service**

Include metadata, recent articles, and extraction failure summaries.

**Step 4: Implement operational actions**

Support:

- toggle source enabled state
- retry RSS fetch
- retry extraction for a feed or article

Use queue utilities already present in `@NewsFlow/queue` and write audit log entries.

**Step 5: Validate types**

Run: `bun run check-types`

Expected: feed admin procedures compile and queue payloads are typed.

### Task 6: Add reusable admin audit logging helpers

**Files:**
- Create: `packages/api/src/modules/admin/admin-audit.service.ts`
- Modify: `packages/api/src/modules/admin/admin-user.service.ts`
- Modify: `packages/api/src/modules/admin/admin-subscription.service.ts`
- Modify: `packages/api/src/modules/admin/admin-feed.service.ts`

**Step 1: Centralize audit creation**

Create a small helper for writing audit records with a consistent metadata shape.

**Step 2: Replace inline audit writes**

Use the helper from each admin mutation service.

**Step 3: Validate types**

Run: `bun run check-types`

Expected: all admin mutation services share a consistent audit contract.

### Task 7: Add admin route guard for Nuxt pages

**Files:**
- Create: `apps/web/app/middleware/admin-auth.ts`
- Modify: `apps/web/app/middleware/dashboard-auth.ts` (only if shared behavior should be extracted)

**Step 1: Implement admin middleware**

Load the current session using the existing auth client plugin and redirect non-admin users away from admin pages.

**Step 2: Decide redirect target**

Use a safe fallback such as `/dashboard` or `/login` depending on whether the user is signed in.

**Step 3: Manual verification**

Confirm:

- guests are redirected to login
- signed-in non-admin users are redirected away from `/admin/*`
- admins can proceed

### Task 8: Add admin navigation to the dashboard sidebar

**Files:**
- Modify: `apps/web/app/components/AppSidebar.vue`
- Modify: `apps/web/app/components/NavMain.vue` (only if needed for grouping or rendering)

**Step 1: Load admin-capable session info**

Extend the sidebar session summary to include role.

**Step 2: Add an `Admin` navigation group**

Show:

- `Users`
- `Subscriptions`
- `Feeds`

Only render this group for admins.

**Step 3: Preserve current UX patterns**

Match the existing sidebar styling and active-route logic.

**Step 4: Validate types**

Run: `bun run check-types`

Expected: sidebar compiles without widening local types to `any`.

### Task 9: Build the admin users page

**Files:**
- Create: `apps/web/app/pages/admin/users.vue`
- Create: `apps/web/app/components/admin/AdminUsersTable.vue`
- Create: `apps/web/app/components/admin/AdminUserDetailDialog.vue`
- Modify: `apps/web/app/lib/dashboard-query-keys.ts`

**Step 1: Build query keys for admin users**

Add typed query key helpers for list and detail requests.

**Step 2: Build the page shell**

Use dashboard layout, `admin-auth`, filter inputs, and a card/table structure.

**Step 3: Build the users table component**

Render the list with filters and row actions.

**Step 4: Build the detail dialog**

Show user basics, subscription summary, and status actions.

**Step 5: Wire suspend/reactivate actions**

Use mutation handlers with confirmation UX and cache invalidation.

**Step 6: Manual verification**

Confirm filters work, detail loads, and status changes refresh the UI.

### Task 10: Build the admin subscriptions page

**Files:**
- Create: `apps/web/app/pages/admin/subscriptions.vue`
- Create: `apps/web/app/components/admin/AdminSubscriptionsTable.vue`
- Create: `apps/web/app/components/admin/AdminSubscriptionEditDialog.vue`
- Modify: `apps/web/app/lib/dashboard-query-keys.ts`

**Step 1: Add query keys for admin subscriptions**

Keep keys aligned with the admin namespace structure.

**Step 2: Build the subscriptions page shell**

Add filters, table layout, and a support-oriented editing flow.

**Step 3: Build the subscription table component**

Render plan and status rows with read-only Stripe identifiers.

**Step 4: Build the edit dialog**

Support tier changes, expiry changes, and cancellation toggle.

**Step 5: Wire mutations and refresh logic**

Use consistent mutation handling and explicit user feedback.

**Step 6: Manual verification**

Confirm edits persist and UI refreshes correctly.

### Task 11: Build the admin feeds pages

**Files:**
- Create: `apps/web/app/pages/admin/feeds.vue`
- Create: `apps/web/app/pages/admin/feeds/[feedId].vue`
- Create: `apps/web/app/components/admin/AdminFeedsTable.vue`
- Create: `apps/web/app/components/admin/AdminFeedDetailPanel.vue`
- Modify: `apps/web/app/lib/dashboard-query-keys.ts`

**Step 1: Add query keys for admin feeds**

Create list and detail key builders.

**Step 2: Build the feeds list page**

Expose operational filters and source-level actions.

**Step 3: Build the feed detail experience**

Show metadata, article health, extraction failures, and retry actions.

**Step 4: Wire enable-disable and retry mutations**

Invalidate the right list and detail queries after each action.

**Step 5: Manual verification**

Confirm admins can identify failing feeds and trigger operational actions.

### Task 12: Polish empty states, confirmations, and error messaging

**Files:**
- Modify: `apps/web/app/components/admin/*.vue`
- Modify: `packages/api/src/modules/admin/*.router.ts`
- Modify: `packages/api/src/modules/admin/*.service.ts`

**Step 1: Standardize confirm dialogs**

Ensure sensitive actions require explicit confirmation.

**Step 2: Standardize API error messages**

Return actionable business messages for expected failures.

**Step 3: Add empty and loading states**

Use the existing skeleton and card patterns where helpful.

**Step 4: Validate types**

Run: `bun run check-types`

Expected: UI polish does not introduce new type regressions.

### Task 13: Run full validation for the feature slice

**Files:**
- Modify: none

**Step 1: Run repo type checks**

Run: `bun run check-types`

Expected: all touched packages compile successfully.

**Step 2: Manual smoke test admin flows**

Verify:

- admin pages render for admins
- pages are hidden or blocked for non-admins
- user status updates work
- subscription edits work
- feed operations work

**Step 3: Review for security regressions**

Check that no secret values are shown in admin responses or UI.

**Step 4: Prepare handoff summary**

Document any intentionally deferred work such as impersonation, metrics cards, or bulk actions.
