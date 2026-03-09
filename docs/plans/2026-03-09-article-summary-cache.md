# Article Summary Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cache AI article summaries in browser `localStorage` for 12 hours using the identity `articleId + locale + aiConfigId`, then restore cached summaries when the same article is reopened.

**Architecture:** Add a dedicated browser-storage helper in the web app to encapsulate summarize cache persistence, TTL checks, and cleanup. Update the article detail page to hydrate summary state from this cache and to write successful summarize results back to cache without changing API contracts or backend behavior.

**Tech Stack:** Nuxt 4, Vue 3 composition API, TypeScript, TanStack Query, browser `localStorage`

---

### Task 1: Add summary cache helper

**Files:**
- Create: `apps/web/app/lib/article-summary-cache.ts`
- Modify: `apps/web/app/pages/articles/[articleId].vue`

**Step 1: Write the helper types and constants**

Create `apps/web/app/lib/article-summary-cache.ts` with:

```ts
export const ARTICLE_SUMMARY_CACHE_STORAGE_KEY = "newsflow:article-summary-cache";
export const ARTICLE_SUMMARY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type ArticleSummaryCacheIdentity = {
  articleId: string;
  locale: string;
  aiConfigId: string;
};

export type ArticleSummaryCacheEntry = ArticleSummaryCacheIdentity & {
  summary: string;
  tokens: number | null;
  createdAt: string;
  expiresAt: string;
};
```

**Step 2: Implement cache key generation and safe storage parsing**

Add functions:

```ts
const toCacheEntryKey = (identity: ArticleSummaryCacheIdentity) =>
  `${identity.articleId}::${identity.locale}::${identity.aiConfigId}`;

const readStorage = (): Record<string, ArticleSummaryCacheEntry> => {
  if (!import.meta.client) {
    return {};
  }

  try {
    const rawValue = localStorage.getItem(ARTICLE_SUMMARY_CACHE_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : {};
    return parsed && typeof parsed === "object" ? parsed as Record<string, ArticleSummaryCacheEntry> : {};
  } catch {
    return {};
  }
};
```

**Step 3: Implement get/set/remove with TTL cleanup**

Add:

```ts
export const getArticleSummaryCache = (
  identity: ArticleSummaryCacheIdentity
): ArticleSummaryCacheEntry | null => { /* validate key, prune expired, persist cleanup */ };

export const setArticleSummaryCache = (
  identity: ArticleSummaryCacheIdentity,
  payload: { summary: string; tokens: number | null }
): ArticleSummaryCacheEntry | null => { /* write expiresAt = now + TTL */ };
```

Also add a small internal writer:

```ts
const writeStorage = (value: Record<string, ArticleSummaryCacheEntry>) => { /* safe localStorage.setItem */ };
```

**Step 4: Verify helper compiles**

Run: `bun run check-types`
Expected: type-check passes or reports only unrelated pre-existing issues.

**Step 5: Commit**

```bash
git add apps/web/app/lib/article-summary-cache.ts apps/web/app/pages/articles/[articleId].vue
git commit -m "feat(web): add article summary local cache helper"
```

### Task 2: Hydrate article page summary state from cache

**Files:**
- Modify: `apps/web/app/pages/articles/[articleId].vue`

**Step 1: Import and wire the helper**

Add imports:

```ts
import {
  getArticleSummaryCache,
  setArticleSummaryCache,
} from "@/lib/article-summary-cache";
```

Add a computed identity:

```ts
const currentSummaryCacheIdentity = computed(() => {
  if (!articleId.value || !selectedAiConfigId.value) {
    return null;
  }

  return {
    articleId: articleId.value,
    locale: locale.value,
    aiConfigId: selectedAiConfigId.value,
  };
});
```

**Step 2: Add a small restore/reset utility**

Inside the page, add:

```ts
const clearSummaryState = () => {
  stopSummaryStream();
  summaryText.value = "";
  streamedSummaryText.value = "";
  summaryTokens.value = null;
  summaryError.value = "";
};

const restoreSummaryFromCache = () => {
  const identity = currentSummaryCacheIdentity.value;
  if (!identity) {
    clearSummaryState();
    return;
  }

  const cachedEntry = getArticleSummaryCache(identity);
  if (!cachedEntry) {
    clearSummaryState();
    return;
  }

  stopSummaryStream();
  summaryText.value = cachedEntry.summary;
  streamedSummaryText.value = cachedEntry.summary;
  summaryTokens.value = cachedEntry.tokens;
  summaryError.value = "";
};
```

**Step 3: React to identity changes**

Add a watcher:

```ts
watch(currentSummaryCacheIdentity, () => {
  restoreSummaryFromCache();
}, { immediate: true });
```

This ensures cache is restored on first render and re-evaluated when locale or AI profile changes.

**Step 4: Preserve current loading/error behavior**

Keep the existing skeleton during pending summarize requests. Do not restore from cache while a summarize request is still actively running.

**Step 5: Verify manually**

Run: `bun run dev:web`
Expected:
- opening an article with cached summary shows that summary immediately
- switching locale or AI profile swaps to the matching cache entry or empty state

### Task 3: Persist successful summaries into cache

**Files:**
- Modify: `apps/web/app/pages/articles/[articleId].vue`

**Step 1: Update summarize success handling**

Inside `summarizeMutation.onSuccess`, after updating state, add:

```ts
const identity = currentSummaryCacheIdentity.value;
if (identity) {
  setArticleSummaryCache(identity, {
    summary: result.summary,
    tokens: result.tokens,
  });
}
```

**Step 2: Keep failures non-destructive**

Do not remove cached summaries in `onError`. Leave the existing cache intact so a later page revisit can still restore the last successful summary.

**Step 3: Keep streaming only for fresh summaries**

When summary comes from cache, set `streamedSummaryText` directly to the full saved summary. Only call `startSummaryStream(result.summary)` for fresh summarize results returned by the API.

**Step 4: Verify behavior**

Run: `bun run dev:web`
Expected:
- first summarize call streams and then persists
- leaving and reopening the article restores instantly without a new summarize request
- summarize failure does not delete a previous successful cached summary

**Step 5: Commit**

```bash
git add apps/web/app/pages/articles/[articleId].vue apps/web/app/lib/article-summary-cache.ts
git commit -m "feat(web): restore cached ai article summaries"
```

### Task 4: Run final verification

**Files:**
- Modify: `apps/web/app/lib/article-summary-cache.ts`
- Modify: `apps/web/app/pages/articles/[articleId].vue`

**Step 1: Run type-check**

Run: `bun run check-types`
Expected: pass for touched code.

**Step 2: Do manual browser verification**

Check:

1. Summarize article A with locale `vi` and profile X.
2. Leave `/articles/[articleId]`.
3. Reopen article A with locale `vi` and profile X.
4. Confirm previous summary is restored instantly.
5. Change locale to `en` and confirm the `vi` cache is not reused.
6. Change AI profile and confirm cache isolation by profile id.
7. Simulate expiry by editing stored `expiresAt` in devtools and confirm entry is treated as a miss.

**Step 3: Commit final cleanup if needed**

```bash
git add apps/web/app/lib/article-summary-cache.ts apps/web/app/pages/articles/[articleId].vue
git commit -m "chore(web): finalize article summary cache flow"
```
