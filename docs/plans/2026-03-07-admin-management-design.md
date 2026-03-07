# NewsFlow Admin Management Design

**Date:** 2026-03-07

**Status:** Approved

**Goal:** Add a standard admin experience for internal operations and business support, focused first on user/subscription management and feed/content operations.

## Context

`NewsFlow` already has core product domains for authentication, subscriptions, feeds, articles, AI configuration, and queue-backed background work. The current repo structure separates concerns cleanly across:

- `apps/web` for the Nuxt dashboard UI
- `packages/api` for oRPC procedures and business logic
- `packages/auth` for Better Auth configuration
- `packages/db` for Prisma schema and persistence
- `packages/queue` and `apps/worker` for RSS fetch and content extraction jobs

There is not yet a first-class admin boundary in the Prisma schema, API context, or dashboard navigation.

## Product Scope

The approved admin scope is:

- **Admin type:** combined backoffice for both system operations and business support
- **Permission level:** standard admin, not super admin
- **Priority domains:**
  - `User & Subscription`
  - `Feed & Content Ops`

The first version should let admins support customers and operate the ingestion pipeline safely without direct database changes.

## Approach Options Considered

### Option 1: Minimal admin flag

Add a simple admin marker on `User` and expose a small number of admin pages and actions.

**Pros**

- Fastest to ship
- Smallest schema and API change set

**Cons**

- Weak support for auditability
- Harder to scale to more operational actions
- Easy to create a mixed, inconsistent admin UX

### Option 2: Domain-based admin console

Add a simple role boundary, then organize admin capabilities by operational domain: users, subscriptions, feeds, and content operations.

**Pros**

- Fits the current monorepo package boundaries well
- Scales cleanly without introducing premature RBAC complexity
- Supports audit logging and safer admin actions from the start

**Cons**

- More initial surface area than a single-page admin view

### Option 3: Full RBAC backoffice

Introduce granular permissions, multiple internal roles, richer audit workflows, and deeper control panels.

**Pros**

- Most flexible long term

**Cons**

- Overbuilt for the current project stage
- Higher implementation and maintenance cost

## Chosen Direction

Use **Option 2: domain-based admin console**.

The system should start with a lightweight role model on the user record, while keeping the API and UI organized by domain. This keeps the first phase focused and consistent with the existing repo architecture.

## Functional Scope

### 1. User management

Admins should be able to:

- list users
- search by email or name
- filter by role, status, and subscription tier
- inspect a user detail view
- suspend and reactivate accounts safely

The user detail view should show profile basics, subscription summary, and a small operational snapshot such as feed count.

### 2. Subscription management

Admins should be able to:

- list subscriptions
- filter by tier, status, billing interval, and cancellation state
- change tier for internal support cases
- update `expiresAt`
- toggle `cancelAtPeriodEnd`
- view Stripe reference identifiers in read-only form for reconciliation

### 3. Feed operations

Admins should be able to:

- list system feed sources, not just per-user subscriptions
- identify feeds with repeated failures
- filter by enabled state, error count, and stale fetch scheduling
- enable or disable a feed source at the system level
- retry RSS fetches

### 4. Content operations

Admins should be able to:

- inspect articles with extraction failures
- see extraction attempt counts and last errors
- retry content extraction for an article or feed

## Non-Goals

These are intentionally excluded from the first version:

- granular RBAC and permission matrices
- super-admin workflows
- impersonation
- bulk destructive actions
- direct secret inspection or editing
- broad dashboard analytics beyond lightweight operational summaries

## Data Model Design

### User changes

Add fields to `User` for admin access and account control:

- `role`: enum with at least `USER` and `ADMIN`
- `status`: enum with at least `ACTIVE` and `SUSPENDED`
- optional support fields such as `suspendedAt` and `suspendedReason`

This separates authorization from account lifecycle state.

### Feed source changes

Add `isEnabled` to `FeedSource`.

This is important because `FeedSubscription.isActive` is user-specific, while the admin console needs a system-wide switch for source ingestion.

### Audit log

Add an `AdminAuditLog` model with fields such as:

- `id`
- `adminUserId`
- `action`
- `targetType`
- `targetId`
- `metadata` as JSON
- `createdAt`

This creates a basic accountability layer for sensitive operations.

## API Design

### Context and authorization

The existing `packages/api/src/context.ts` returns session data from Better Auth. The admin design assumes session data includes `role` and `status` so the API layer can enforce authorization centrally.

Add a new `adminProcedure` beside `protectedProcedure` in `packages/api/src/index.ts`.

Expected behavior:

- unauthenticated users receive `UNAUTHORIZED`
- authenticated non-admin users receive `FORBIDDEN`
- suspended users should be blocked from protected flows based on product policy

### Admin module layout

Create a new namespace under `packages/api/src/modules/admin` with the same schema-service-router separation already used elsewhere in the repo.

Suggested files:

- `admin-user.schema.ts`
- `admin-user.service.ts`
- `admin-user.router.ts`
- `admin-subscription.schema.ts`
- `admin-subscription.service.ts`
- `admin-subscription.router.ts`
- `admin-feed.schema.ts`
- `admin-feed.service.ts`
- `admin-feed.router.ts`

### Admin procedures

Suggested procedures for the first phase:

- `admin.user.list`
- `admin.user.getDetail`
- `admin.user.updateStatus`
- `admin.subscription.list`
- `admin.subscription.updateTier`
- `admin.subscription.updateExpiry`
- `admin.subscription.updateCancelAtPeriodEnd`
- `admin.feed.list`
- `admin.feed.getDetail`
- `admin.feed.toggleEnabled`
- `admin.feed.retryFetch`
- `admin.feed.retryExtraction`

Each mutating service should also write an audit log entry.

## Web UI Design

### Navigation

The admin surface should live as a separate `Admin` area in the dashboard sidebar, not inside `Settings`.

Suggested navigation entries:

- `Users`
- `Subscriptions`
- `Feeds`

These should only render when the signed-in user has `ADMIN` role.

### Routing

Suggested routes:

- `/admin/users`
- `/admin/subscriptions`
- `/admin/feeds`
- `/admin/feeds/[feedId]`

Add an admin-specific middleware, for example `apps/web/app/middleware/admin-auth.ts`, to redirect non-admin users away from admin pages.

### Page structure

Each admin page should follow the repo’s existing dashboard styling conventions:

- card-based layout
- clear hierarchy
- compact filter bar
- data table for browsing
- detail drawer or dialog for targeted actions

This keeps the new UI aligned with the existing `apps/web` component patterns and token-based styling.

## Admin Flows

### User flow

1. Admin opens `Users`
2. Admin filters or searches
3. Admin opens a detail panel
4. Admin suspends or reactivates if needed
5. Action requires confirmation
6. System writes audit log

### Subscription support flow

1. Admin opens `Subscriptions`
2. Admin locates a user’s active subscription
3. Admin changes tier or expiry state
4. Action is confirmed and saved
5. System writes audit log

### Feed operations flow

1. Admin opens `Feeds`
2. Admin filters failing or stale feed sources
3. Admin opens a feed detail page
4. Admin disables a source or retries work
5. System writes audit log for mutating operations

## Safety Rules

- Suspending a user must not delete user data
- Disabling a feed source must not delete subscriptions
- Admin actions must use confirm dialogs where state changes are sensitive
- Stripe identifiers must remain read-only in the UI
- Secrets such as AI API keys must never be shown in admin views or logs
- Bulk actions should be deferred until the single-item flows are proven safe

## Error Handling

- Use `ORPCError` at the API boundary
- Use `FORBIDDEN` for non-admin access
- Use `NOT_FOUND` for missing resources
- Return explicit business messages for unsupported actions
- Do not swallow queue or persistence errors
- Return clear action result states for retries, such as `queued`, `skipped`, or `failed`

## Validation Strategy

There is no existing automated test suite in the repo. The first implementation should therefore validate changes with focused type checks and manual verification.

Minimum validation target:

- `bun run check-types`
- manual admin access verification in the dashboard
- manual verification that non-admin users cannot load admin routes or call admin procedures

## Rollout Plan

### Phase 1

- add DB fields and audit model
- add session-aware admin authorization
- add admin route guard and sidebar entry

### Phase 2

- ship `Users` and `Subscriptions` admin pages
- ship core support actions and audit logging

### Phase 3

- ship `Feeds` admin pages
- ship retry and enable-disable operations

### Phase 4

- add UX polish, lightweight metrics, and future-safe extensions such as audit views or bulk actions

## Success Criteria

The first admin release is successful when:

- admins can find users quickly
- admins can suspend and reactivate accounts safely
- admins can support subscription changes without database edits
- admins can identify and react to failing feed sources from the UI
- standard users cannot access admin routes or procedures
