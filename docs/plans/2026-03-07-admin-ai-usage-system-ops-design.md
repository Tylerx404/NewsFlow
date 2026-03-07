# NewsFlow Admin AI Usage & System Ops Design

**Date:** 2026-03-07

**Status:** Approved

**Goal:** Extend the existing admin console with lightweight observability and low-risk operational actions for AI usage and runtime system operations.

## Context

The project already has the first admin phase in place for:

- user management
- subscription management
- feed operations

The current repo now also includes:

- `adminProcedure` in the API layer
- admin routes and sidebar navigation in the web app
- `AdminAuditLog` for sensitive action tracking

For the next admin phase, the goal is to add visibility into:

- `AI & Usage`
- `System Ops`

without turning the admin panel into a full SRE console or quota platform.

## Current State of Relevant Domains

### AI

The repo currently stores AI usage in `AiUsage` with fields:

- `userId`
- `provider`
- `model`
- `tokens`
- `action`
- `createdAt`

At the moment, usage is recorded only after a successful summarize request. There is no first-class failure event model, no sanitized error tracking, and no enable-disable switch for AI configs.

### System ops

The queue system already has:

- BullMQ queues for `rss-fetch` and `content-extract`
- scheduler logic in `packages/queue/src/scheduler.ts`
- worker runner logic in `packages/queue/src/runner.ts`
- per-feed and per-article error state persisted in Prisma

However, runtime health is still mostly inferred from queue state and console logging. There is no dedicated admin health or heartbeat layer yet.

## Approved Scope

The approved scope for this phase is:

- `Monitoring + action nhẹ`
- implement `AI & Usage` and `System Ops` together
- keep scope deliberately thin

That means the admin can inspect operational state and trigger low-risk single-item actions, but cannot deeply reconfigure queues, global runtime settings, or AI policy.

## Approach Options Considered

### Option 1: Two standalone pages

Create separate admin pages for `AI Usage` and `System Ops`, each with its own tables and filters.

**Pros**

- straightforward to build
- easy to reason about by domain

**Cons**

- lacks a quick top-level operations picture
- forces admins to click deeper before seeing problems

### Option 2: Operations overview plus two domain pages

Create:

- `/admin/operations`
- `/admin/ai-usage`
- `/admin/system-ops`

The overview page surfaces the most important indicators, then links into the two detailed pages.

**Pros**

- gives admins an immediate operational snapshot
- keeps deep views separated by domain
- fits the existing admin navigation well

**Cons**

- slightly more surface area than standalone pages only

### Option 3: Fold everything into existing admin pages

Mix AI usage into users or subscriptions pages and fold runtime health into feed operations.

**Pros**

- smallest route count

**Cons**

- unclear information architecture
- operational data becomes hard to scan and maintain
- higher coupling between unrelated concerns

## Chosen Direction

Use **Option 2: operations overview plus two domain pages**.

This gives the admin team a lightweight observability layer without bloating the existing A/B admin pages.

## Functional Scope

### 1. Operations overview

Add `/admin/operations` as the top-level operational summary page.

It should show:

- 7-day AI token usage
- recent AI failures
- queue depth by queue
- recent failed jobs
- stale feed count
- extraction backlog count
- worker and scheduler health summary

This page is for awareness and drill-down, not complex management.

### 2. AI & Usage

Add `/admin/ai-usage`.

Admins should be able to:

- filter AI events by provider, model, user, status, and time range
- see top users by token usage
- see provider and model usage breakdown
- inspect recent summarize failures
- disable or re-enable a specific AI config if it appears unhealthy

This is intentionally limited to support and containment actions.

### 3. System Ops

Add `/admin/system-ops`.

Admins should be able to:

- inspect queue counts for waiting, active, failed, delayed, and completed jobs
- see worker and scheduler heartbeat health
- inspect recent failed jobs
- inspect stale feeds and extraction backlog
- retry one failed job at a time
- manually trigger one feed fetch
- manually trigger one article extraction

This should remain a low-risk operations panel, not a full queue-control console.

## Non-Goals

Do not include the following in this phase:

- global queue pause or resume
- concurrency tuning from the UI
- bulk requeue or bulk retry
- AI quota engine or usage limits
- alerting integrations such as Slack or email
- full incident history platform
- full-stack trace inspection in the UI

## Data Model Design

### AiUsage enrichment

To support failure visibility, enrich `AiUsage` with minimal operational fields:

- `status` with values like `SUCCESS` and `FAILED`
- `durationMs` for timing insight
- `errorSummary` or `errorCode` with sanitized content only

The record should remain lightweight and safe. Do not persist prompts, raw article content, or full provider error payloads.

### AiConfig toggle

Add `isEnabled` to `AiConfig`.

This lets admins temporarily disable a broken or abuse-prone configuration without deleting it.

### Runtime heartbeats

Do not add a database table for transient runtime health.

Instead, add Redis heartbeat keys with TTL, for example:

- `newsflow:heartbeat:worker`
- `newsflow:heartbeat:scheduler:rss`
- `newsflow:heartbeat:scheduler:content`

The worker and scheduler refresh these keys periodically, and the admin API translates them into coarse health states such as:

- `healthy`
- `stale`
- `offline`
- `unknown`

This keeps runtime telemetry lightweight and aligned with Redis-backed queue infrastructure.

## API Design

Use the existing `adminProcedure` and extend the existing `admin` namespace with two more domains:

- `admin.aiUsage`
- `admin.systemOps`

The overview page should compose domain queries rather than needing a brand-new aggregate backend module unless duplication becomes a problem.

### Suggested AI usage procedures

- `admin.aiUsage.overview`
- `admin.aiUsage.listEvents`
- `admin.aiUsage.getUserUsage`
- `admin.aiUsage.updateConfigEnabled`

### Suggested system ops procedures

- `admin.systemOps.overview`
- `admin.systemOps.listQueueJobs`
- `admin.systemOps.retryJob`
- `admin.systemOps.triggerFeedFetch`
- `admin.systemOps.triggerContentExtract`

All mutating actions should write to `AdminAuditLog`.

## Web UI Design

### Navigation

Add three entries to the admin section in the sidebar:

- `Operations`
- `AI Usage`
- `System Ops`

Keep them in the same admin navigation cluster as existing routes.

### Operations overview page

This page should use KPI cards and compact panels rather than heavy charting.

Recommended blocks:

- AI usage summary cards
- queue and backlog summary cards
- top AI users panel
- recent AI failures panel
- recent failed jobs panel
- runtime heartbeat panel

### AI usage page

This page should be table-first, with filters above and optional detail panels.

Recommended content:

- event list table
- top users by token usage
- provider/model breakdown summary
- config enable-disable action from a detail panel

### System ops page

This page should combine queue state cards and a recent-jobs table.

Recommended content:

- worker and scheduler health cards
- queue counts by queue name
- recent failed jobs table
- stale feeds section
- extraction backlog section
- per-item retry or trigger buttons

## Safety Rules

- disabling an AI config must not delete it
- retry actions must be single-item only in the first phase
- no raw API keys, prompts, or full provider payloads may be shown
- no raw stack traces should be surfaced if a short sanitized summary is enough
- heartbeat failure should be treated as telemetry degradation first, not automatically as system failure
- admin actions should remain confirmable where state changes are involved

## Error Handling

- use `ORPCError` consistently at the API boundary
- return concise business-friendly action messages such as:
  - `Feed fetch queued`
  - `Job retry skipped`
  - `Worker heartbeat stale`
- map provider or queue errors to safe summaries
- treat missing heartbeat data as `unknown` or `offline` depending on the TTL rule, not as a fatal exception

## Validation Strategy

The repo still does not expose a formal automated test harness for this feature area, so validation should focus on:

- `bun run check-types`
- manual admin-only access verification
- manual queue and heartbeat smoke testing
- manual verification that single-item retry actions behave safely

## Rollout Plan

### Phase C1

- enrich `AiUsage`
- add `AiConfig.isEnabled`
- add AI usage overview APIs and page

### Phase D1

- add Redis heartbeats for worker and scheduler
- add system ops overview APIs and page
- add lightweight retry and trigger actions

### Phase CD2

- add `/admin/operations`
- polish filters, empty states, and operational summaries

## Success Criteria

This phase is successful when:

- admins can see a combined operations snapshot quickly
- admins can identify high AI usage by user, provider, and model
- admins can see sanitized recent AI failures
- admins can assess queue and runtime health without reading logs directly
- admins can trigger safe single-item operational actions
- non-admin users cannot access any of the new routes or procedures
