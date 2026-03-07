# Admin AI Usage & System Ops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the existing NewsFlow admin console with lightweight AI observability, queue health visibility, and safe single-item operational actions.

**Architecture:** Build on the existing `adminProcedure`, admin routes, and `AdminAuditLog` rather than introducing a second admin framework. Extend Prisma for AI usage observability, add Redis-based heartbeats for runtime health, expose new admin oRPC procedures under `admin.aiUsage` and `admin.systemOps`, then add three Nuxt pages that compose those APIs into overview and domain-specific operational views.

**Tech Stack:** Bun, TypeScript, Prisma, Better Auth, oRPC, Nuxt 4, Vue Query, BullMQ, Redis, Tailwind, shadcn-nuxt

---

## Notes Before Starting

- The repo already includes admin support for users, subscriptions, and feeds.
- Reuse the existing admin patterns in `packages/api/src/modules/admin` and `apps/web/app/pages/admin`.
- Do not add a new test framework.
- Validate each milestone with `bun run check-types` and manual smoke tests.
- Keep the feature low-risk: single-item actions only, no bulk controls.

### Task 1: Extend Prisma models for AI observability

**Files:**
- Modify: `packages/db/prisma/schema/app.prisma`
- Modify: `packages/db/prisma/schema/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_add_admin_ai_usage_ops_fields/migration.sql`

**Step 1: Update `AiUsage`**

Add minimal observability fields such as:

- `status`
- `durationMs`
- `errorSummary`

Prefer enums for status if consistent with existing schema style.

**Step 2: Update `AiConfig`**

Add:

- `isEnabled Boolean @default(true)`

**Step 3: Generate Prisma client**

Run: `bun run db:generate`

Expected: Prisma client updates without schema errors.

**Step 4: Create migration**

Run: `bun run db:migrate`

Expected: migration generated for the new AI observability fields.

**Step 5: Validate types**

Run: `bun run check-types`

Expected: no type regressions from schema changes.

### Task 2: Record AI success and failure events safely

**Files:**
- Modify: `packages/api/src/modules/ai/ai.router.ts`
- Modify: `packages/api/src/modules/ai/ai.service.ts`
- Modify: `packages/api/src/modules/ai-config/ai-config.service.ts` (only if a shared sanitize helper belongs here)

**Step 1: Block disabled AI configs**

When a selected config has `isEnabled = false`, reject summarize requests with a clear business error.

**Step 2: Capture duration and outcome**

Measure summarize execution duration and record both success and failure attempts in `AiUsage`.

**Step 3: Sanitize failure text**

Persist only short safe summaries, not raw provider payloads, prompts, or article content.

**Step 4: Validate types**

Run: `bun run check-types`

Expected: summarize flow compiles with the new `AiUsage` shape and safe error handling.

### Task 3: Add Redis heartbeat helpers for runtime health

**Files:**
- Create: `packages/queue/src/heartbeat.ts`
- Modify: `packages/queue/src/index.ts`
- Modify: `packages/queue/src/runner.ts`
- Modify: `packages/queue/src/scheduler.ts`

**Step 1: Create heartbeat helpers**

Add small helpers to:

- write heartbeat timestamps with TTL
- read or compute health state from Redis-backed keys
- define shared heartbeat key names

**Step 2: Update worker runner heartbeats**

Have the worker runner refresh a worker heartbeat on an interval while running.

**Step 3: Update scheduler heartbeats**

Have the RSS and content schedulers refresh their own heartbeat keys when active.

**Step 4: Export shared helpers**

Expose the heartbeat functions through `packages/queue/src/index.ts` for admin service reuse.

**Step 5: Validate types**

Run: `bun run check-types`

Expected: queue package compiles with the new heartbeat utilities.

### Task 4: Add admin AI usage schemas and services

**Files:**
- Create: `packages/api/src/modules/admin/admin-ai-usage.schema.ts`
- Create: `packages/api/src/modules/admin/admin-ai-usage.service.ts`
- Create: `packages/api/src/modules/admin/admin-ai-usage.router.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Define admin AI usage schemas**

Include inputs for:

- provider filter
- model filter
- user search
- status filter
- date range
- config enable-disable mutation

**Step 2: Implement overview service**

Return summary data for:

- recent total token usage
- recent failure counts
- top users
- provider/model breakdowns

**Step 3: Implement event list service**

Return a bounded event list suitable for a table.

**Step 4: Implement config toggle service**

Allow admins to enable or disable a single `AiConfig` and write an audit log entry.

**Step 5: Mount router under `admin.aiUsage`**

Update the root admin router composition.

**Step 6: Validate types**

Run: `bun run check-types`

Expected: AI usage admin router compiles cleanly and exports stable response shapes.

### Task 5: Add admin system ops schemas and services

**Files:**
- Create: `packages/api/src/modules/admin/admin-system-ops.schema.ts`
- Create: `packages/api/src/modules/admin/admin-system-ops.service.ts`
- Create: `packages/api/src/modules/admin/admin-system-ops.router.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Define system ops schemas**

Include inputs for:

- queue name
- job state filters
- feed source trigger input
- article extraction trigger input
- retry job input

**Step 2: Implement overview service**

Return summary data for:

- worker and scheduler health
- queue counts by queue
- failed job counts
- stale feeds
- extraction backlog

**Step 3: Implement recent jobs listing**

Return recent failed or interesting jobs with safe metadata for the UI.

**Step 4: Implement single-item actions**

Support:

- retry one job
- trigger one feed fetch
- trigger one content extraction

Write audit logs for each mutating action.

**Step 5: Mount router under `admin.systemOps`**

Update the admin namespace in the root router.

**Step 6: Validate types**

Run: `bun run check-types`

Expected: system ops router compiles and queue actions remain typed.

### Task 6: Reuse and extend admin audit logging

**Files:**
- Modify: `packages/api/src/modules/admin/admin-audit.service.ts`
- Modify: `packages/api/src/modules/admin/admin-ai-usage.service.ts`
- Modify: `packages/api/src/modules/admin/admin-system-ops.service.ts`

**Step 1: Confirm metadata contract is sufficient**

If needed, extend audit metadata normalization to support the new action fields.

**Step 2: Add audit writes for new actions**

Cover at least:

- AI config enabled or disabled
- single job retry
- feed fetch trigger
- extraction trigger

**Step 3: Validate types**

Run: `bun run check-types`

Expected: new actions share the same audit logging path as existing admin features.

### Task 7: Add admin query keys for new domains

**Files:**
- Modify: `apps/web/app/lib/dashboard-query-keys.ts`

**Step 1: Add `operations` keys**

Create query keys for the new admin overview page.

**Step 2: Add `aiUsage` keys**

Add keys for overview, list, and optional user detail slices.

**Step 3: Add `systemOps` keys**

Add keys for overview, recent jobs, and any selected item panels.

**Step 4: Validate types**

Run: `bun run check-types`

Expected: query key helpers stay consistent with the new admin route usage.

### Task 8: Add admin navigation entries

**Files:**
- Modify: `apps/web/app/components/AppSidebar.vue`

**Step 1: Extend admin navigation items**

Add:

- `Operations`
- `AI Usage`
- `System Ops`

**Step 2: Keep active-state behavior aligned**

Reuse the existing `isRouteActive` pattern so nested routes highlight correctly.

**Step 3: Validate types**

Run: `bun run check-types`

Expected: sidebar compiles and admin navigation remains clean.

### Task 9: Build the operations overview page

**Files:**
- Create: `apps/web/app/pages/admin/operations.vue`
- Create: `apps/web/app/components/admin/AdminOperationsOverviewCards.vue`
- Create: `apps/web/app/components/admin/AdminRuntimeHealthPanel.vue`
- Create: `apps/web/app/components/admin/AdminRecentFailedJobsTable.vue`

**Step 1: Build the page shell**

Use dashboard layout and `admin-auth` middleware.

**Step 2: Compose overview queries**

Use `admin.aiUsage.overview` and `admin.systemOps.overview` rather than creating a special combined page API unless the UI truly requires it.

**Step 3: Build summary cards and quick panels**

Render lightweight KPIs and recent-problem panels.

**Step 4: Add drill-down links**

Link to `/admin/ai-usage` and `/admin/system-ops`.

**Step 5: Manual verification**

Confirm overview data renders and drill-down navigation works.

### Task 10: Build the AI usage page

**Files:**
- Create: `apps/web/app/pages/admin/ai-usage.vue`
- Create: `apps/web/app/components/admin/AdminAiUsageFilters.vue`
- Create: `apps/web/app/components/admin/AdminAiUsageTable.vue`
- Create: `apps/web/app/components/admin/AdminAiConfigDetailDialog.vue`

**Step 1: Build filters and page shell**

Add provider, model, status, user, and time-range filters.

**Step 2: Build the AI events table**

Render recent usage and failure events with safe summaries.

**Step 3: Build detail or config dialog**

Allow an admin to inspect config context and toggle enabled state.

**Step 4: Wire mutations and cache invalidation**

Refresh overview and list queries after changes.

**Step 5: Manual verification**

Confirm filters, config toggles, and error summaries behave correctly.

### Task 11: Build the system ops page

**Files:**
- Create: `apps/web/app/pages/admin/system-ops.vue`
- Create: `apps/web/app/components/admin/AdminSystemOpsOverviewCards.vue`
- Create: `apps/web/app/components/admin/AdminQueueJobsTable.vue`
- Create: `apps/web/app/components/admin/AdminOpsActionConfirmDialog.vue`

**Step 1: Build the page shell**

Use dashboard layout, compact filters, and operational tables.

**Step 2: Render heartbeat and queue summaries**

Show worker, RSS scheduler, and content scheduler health.

**Step 3: Render recent failed jobs and backlog panels**

Keep the first version table-first and lightweight.

**Step 4: Wire single-item actions**

Add retry and trigger actions with explicit confirmations where appropriate.

**Step 5: Manual verification**

Confirm admins can safely trigger one-off operational actions and see updated state.

### Task 12: Polish loading, empty, and error states

**Files:**
- Modify: `apps/web/app/components/admin/*.vue`
- Modify: `apps/web/app/pages/admin/*.vue`

**Step 1: Add loading states**

Use existing card and skeleton patterns where useful.

**Step 2: Add empty states**

Ensure no-data states remain readable and actionable.

**Step 3: Standardize user-facing messages**

Use short, operationally clear success and error text.

**Step 4: Validate types**

Run: `bun run check-types`

Expected: UI polish does not create type regressions.

### Task 13: Run end-to-end feature validation for this slice

**Files:**
- Modify: none

**Step 1: Run repo type checks**

Run: `bun run check-types`

Expected: all touched packages compile successfully.

**Step 2: Manual smoke test AI usage flows**

Verify:

- admins can view usage data
- disabled AI configs block new summarize actions
- failures are recorded safely

**Step 3: Manual smoke test system ops flows**

Verify:

- heartbeat states appear
- queue counts render
- single-item retry and trigger actions behave safely

**Step 4: Review security and data exposure**

Confirm no raw secrets, prompts, or sensitive payloads leak into UI or logs.

**Step 5: Prepare deferred-work summary**

Note intentionally deferred items such as quota controls, bulk requeue, and alerting integrations.
