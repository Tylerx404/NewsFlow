export const ARTICLE_SUMMARY_CACHE_STORAGE_KEY =
  "newsflow:article-summary-cache";
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

type ArticleSummaryCacheStorage = Record<string, ArticleSummaryCacheEntry>;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isArticleSummaryCacheEntry = (
  value: unknown
): value is ArticleSummaryCacheEntry => {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.articleId === "string"
    && typeof value.locale === "string"
    && typeof value.aiConfigId === "string"
    && typeof value.summary === "string"
    && (typeof value.tokens === "number" || value.tokens === null)
    && typeof value.createdAt === "string"
    && typeof value.expiresAt === "string"
  );
};

const toCacheEntryKey = (identity: ArticleSummaryCacheIdentity) =>
  `${identity.articleId}::${identity.locale}::${identity.aiConfigId}`;

const readStorage = (): ArticleSummaryCacheStorage => {
  if (!import.meta.client) {
    return {};
  }

  try {
    const rawValue = localStorage.getItem(ARTICLE_SUMMARY_CACHE_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (!isObjectRecord(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<ArticleSummaryCacheStorage>(
      (storage, [key, entry]) => {
        if (isArticleSummaryCacheEntry(entry)) {
          storage[key] = entry;
        }

        return storage;
      },
      {}
    );
  } catch {
    return {};
  }
};

const writeStorage = (storage: ArticleSummaryCacheStorage) => {
  if (!import.meta.client) {
    return;
  }

  try {
    if (Object.keys(storage).length === 0) {
      localStorage.removeItem(ARTICLE_SUMMARY_CACHE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      ARTICLE_SUMMARY_CACHE_STORAGE_KEY,
      JSON.stringify(storage)
    );
  } catch {
    // Ignore localStorage write failures and fall back to in-memory UI state.
  }
};

const pruneExpiredEntries = (
  storage: ArticleSummaryCacheStorage,
  now = Date.now()
): ArticleSummaryCacheStorage => {
  return Object.entries(storage).reduce<ArticleSummaryCacheStorage>(
    (nextStorage, [key, entry]) => {
      const expiresAt = Date.parse(entry.expiresAt);
      if (!Number.isNaN(expiresAt) && expiresAt > now) {
        nextStorage[key] = entry;
      }

      return nextStorage;
    },
    {}
  );
};

export const isArticleSummaryCacheIdentityEqual = (
  left: ArticleSummaryCacheIdentity | null,
  right: ArticleSummaryCacheIdentity | null
) => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.articleId === right.articleId
    && left.locale === right.locale
    && left.aiConfigId === right.aiConfigId
  );
};

export const getArticleSummaryCache = (
  identity: ArticleSummaryCacheIdentity
): ArticleSummaryCacheEntry | null => {
  const storage = readStorage();
  const prunedStorage = pruneExpiredEntries(storage);

  if (Object.keys(prunedStorage).length !== Object.keys(storage).length) {
    writeStorage(prunedStorage);
  }

  return prunedStorage[toCacheEntryKey(identity)] ?? null;
};

export const setArticleSummaryCache = (
  identity: ArticleSummaryCacheIdentity,
  payload: {
    summary: string;
    tokens: number | null;
  }
): ArticleSummaryCacheEntry | null => {
  if (!import.meta.client) {
    return null;
  }

  const now = Date.now();
  const storage = pruneExpiredEntries(readStorage(), now);
  const createdAt = new Date(now).toISOString();
  const entry: ArticleSummaryCacheEntry = {
    ...identity,
    summary: payload.summary,
    tokens: payload.tokens,
    createdAt,
    expiresAt: new Date(now + ARTICLE_SUMMARY_CACHE_TTL_MS).toISOString(),
  };

  storage[toCacheEntryKey(identity)] = entry;
  writeStorage(storage);

  return entry;
};
