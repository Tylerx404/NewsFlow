# Article Summary Cache Design

**Date:** 2026-03-09

**Goal:** Persist AI summaries in browser `localStorage` so users can reopen an article and review an existing summary without triggering a new summarize request.

## Context

The current summarize flow in [`apps/web/app/pages/articles/[articleId].vue`](/home/tyler/GitHub/NewsFlow/apps/web/app/pages/articles/[articleId].vue) stores summary state only in component memory:

- `summaryText`
- `streamedSummaryText`
- `summaryTokens`
- `summaryError`

When the user leaves the article page or reloads it, that state is lost and the same summarize request must be sent again. This wastes tokens and compute for repeated reads of the same article.

## Requirements

- Cache entries are keyed by `articleId + locale + aiConfigId`.
- Cache is stored only in the browser via `localStorage`.
- Cache TTL is `12 hours`.
- Reopening the same article with the same locale and AI profile should restore the previous summary immediately.
- Expired cache entries should be ignored and cleaned up.
- Failed summarize requests must not overwrite a valid cached summary.
- Scope is limited to `apps/web`; no API, DB, or server contract changes.

## Considered Approaches

### 1. Dedicated summarize cache helper in `apps/web/app/lib`

Store structured cache entries in a small helper module responsible for key generation, read/write, TTL validation, and expired entry cleanup.

**Pros**

- Keeps cache logic out of the page component.
- Easy to test and reuse.
- Clear boundary between UI state and persistence logic.

**Cons**

- Adds one more browser-storage helper to maintain.

### 2. Fold summarize cache into existing reader preferences storage

Reuse the existing reader preferences storage file and append summarize data there.

**Pros**

- Fewer files.

**Cons**

- Mixes unrelated concerns.
- Makes reader preferences storage harder to reason about.
- Raises the risk of accidental regressions in theme/reader settings.

### 3. Persist summarize results on the server

Store summaries in the backend and fetch them later.

**Pros**

- Works across devices.

**Cons**

- Out of scope for this task.
- Requires API and persistence changes.

## Chosen Approach

Use a dedicated summarize cache helper in `apps/web/app/lib`.

This keeps the change local to the web client, matches the requested scope, and is the smallest maintainable solution for preventing redundant summarize requests in the same browser.

## Proposed Data Model

Each cache record stores:

- `articleId: string`
- `locale: string`
- `aiConfigId: string`
- `summary: string`
- `tokens: number | null`
- `createdAt: string`
- `expiresAt: string`

The helper will also derive a deterministic cache key from `articleId`, `locale`, and `aiConfigId`.

## Data Flow

1. The article page computes the current summarize cache identity from:
   - route `articleId`
   - active i18n `locale`
   - selected AI config id
2. On page load, and whenever locale or selected AI config changes, the page attempts to hydrate summary state from cache.
3. If a valid cache entry exists:
   - restore `summaryText`
   - restore `summaryTokens`
   - render the saved summary without calling summarize API
4. If no valid cache entry exists:
   - keep summary state empty
5. When summarize succeeds:
   - update in-memory summary state
   - persist the result into cache with a `12 hour` expiration
6. When summarize fails:
   - show the error
   - do not remove or overwrite any existing valid cache entry

## UI Behavior

- Existing summarize button remains the same.
- If cache exists for the current key, the page restores it automatically when the user reopens the article.
- No new refresh/clear button is added in this scope.
- Existing streaming effect remains only for newly generated summaries; restored cached summaries can be shown immediately.

## Error Handling

- `localStorage` reads/writes are wrapped in `try/catch` to avoid breaking page rendering in restricted browser environments.
- Invalid JSON or malformed entries are treated as cache misses.
- Expired entries are deleted during read.

## Testing Strategy

- Type-check the changed web code with `bun run check-types`.
- Manually verify:
  - summarize an article
  - leave the article page
  - reopen the same article with the same locale and AI profile
  - confirm the previous summary appears without a new API request
  - switch locale or AI profile and confirm cache isolation
  - wait or simulate expiry and confirm expired entries are ignored

## Out of Scope

- Cross-device summary history
- Server-side summary persistence
- Cache management UI
- Changes to summarize API contract
