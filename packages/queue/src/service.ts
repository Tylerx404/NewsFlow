import { createHash } from "node:crypto";
import { extract } from "@extractus/article-extractor";
import { Queue, Worker, type Job } from "bullmq";
import Parser from "rss-parser";

import db, { redisConnection } from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";
import type { ContentExtractJobData, RssFetchJobData } from "./schema";

// Queue names
export const QUEUES = {
  RSS_FETCH: "rss-fetch",
  CONTENT_EXTRACT: "content-extract",
} as const;

// Worker processor types
export type WorkerProcessor<TData = unknown, TResult = unknown> = (
  job: Job<TData>
) => Promise<TResult>;

// Worker instance types
export type WorkerInstance = Worker;

function attachQueueErrorHandler(target: Queue, name: string) {
  target.on("error", (error: Error) => {
    console.warn(`queue ${name} Redis error: ${error.message}`);
  });
}

function attachWorkerErrorHandler(target: Worker, name: string) {
  target.on("error", (error: Error) => {
    console.warn(`worker ${name} Redis error: ${error.message}`);
  });
}

// Create queue factory
export const createQueue = <TData = unknown>(name: string) => {
  const queue = new Queue<TData>(name, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  });

  attachQueueErrorHandler(queue, name);

  return queue;
};

// Create worker factory
export const createWorker = <TData = unknown, TResult = unknown>(
  name: string,
  processor: WorkerProcessor<TData, TResult>
) => {
  const worker = new Worker<TData, TResult>(name, processor, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  attachWorkerErrorHandler(worker, name);

  return worker;
};

// RSS parser instance
const rssParser = new Parser({
  customFields: {
    item: [["media:content", "media:content"], ["media:thumbnail", "media:thumbnail"]],
  },
});

type ParsedRssItem = Parser.Item & {
  creator?: string;
  author?: string;
  summary?: string;
  description?: string;
  "content:encoded"?: string;
};

const normalizeUrl = (rawUrl: string) => {
  const parsed = new URL(rawUrl.trim());
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const normalizedSearch = parsed.searchParams.toString();
  return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`;
};

const createArticleKey = (item: ParsedRssItem) => {
  const guid = item.guid?.trim();
  if (guid) {
    return createHash("sha256").update(`guid:${guid}`).digest("hex");
  }

  const link = item.link?.trim();
  if (link) {
    return createHash("sha256").update(`link:${normalizeUrl(link)}`).digest("hex");
  }

  const title = item.title?.trim() || "untitled";
  const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : "no-date";
  return createHash("sha256").update(`title:${title}|pubDate:${pubDate}`).digest("hex");
};

const INFERENCE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const GLOBAL_LANGUAGE_SET = new Set(["en", "es", "pt", "ar"]);
const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  vi: "VN",
  th: "TH",
  id: "ID",
  fr: "FR",
  de: "DE",
  es: "ES",
};
const DOMAIN_COUNTRY_MAP: Record<string, string> = {
  vn: "VN",
  kr: "KR",
  jp: "JP",
  cn: "CN",
  tw: "TW",
  hk: "HK",
  th: "TH",
  id: "ID",
  fr: "FR",
  de: "DE",
  es: "ES",
};
const HOST_COUNTRY_HINTS: Array<{ pattern: RegExp; countryCode: string }> = [
  { pattern: /(^|\.)france24\./i, countryCode: "FR" },
  { pattern: /(^|\.)elpais\./i, countryCode: "ES" },
  { pattern: /(^|\.)yna\.co\.kr$/i, countryCode: "KR" },
  { pattern: /(^|\.)japantimes\.co\.jp$/i, countryCode: "JP" },
];
const COUNTRY_KEYWORD_HINTS: Array<{ pattern: RegExp; countryCode: string }> = [
  { pattern: /\b(france|french)\b/i, countryCode: "FR" },
  { pattern: /\b(japan|japanese)\b/i, countryCode: "JP" },
  { pattern: /\b(korea|korean|seoul)\b/i, countryCode: "KR" },
  { pattern: /\b(taiwan|taipei|taiwanese)\b/i, countryCode: "TW" },
  { pattern: /\b(vietnam|viet\s?nam|vietnamese)\b/i, countryCode: "VN" },
  { pattern: /\b(spain|spanish|españa|espanol|español)\b/i, countryCode: "ES" },
  { pattern: /\b(thailand|thai|bangkok)\b/i, countryCode: "TH" },
  { pattern: /\b(indonesia|indonesian|jakarta)\b/i, countryCode: "ID" },
  { pattern: /\b(germany|german|berlin)\b/i, countryCode: "DE" },
];

function normalizeLanguageCode(language: string | null | undefined) {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return normalized.split(/[-_]/)[0] ?? null;
}

function mapLanguageToCountry(language: string) {
  if (GLOBAL_LANGUAGE_SET.has(language)) {
    return "GLOBAL";
  }

  return LANGUAGE_COUNTRY_MAP[language] ?? "GLOBAL";
}

function resolveHostFromUrl(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function resolveCountryFromDomain(siteUrl: string | null | undefined, sourceUrl: string) {
  const host = resolveHostFromUrl(siteUrl) ?? resolveHostFromUrl(sourceUrl);

  if (!host) {
    return null;
  }

  const segments = host.split(".").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const tld = segments[segments.length - 1] ?? "";
  const fromTld = DOMAIN_COUNTRY_MAP[tld];
  if (fromTld) {
    return fromTld;
  }

  for (const hint of HOST_COUNTRY_HINTS) {
    if (hint.pattern.test(host)) {
      return hint.countryCode;
    }
  }

  return null;
}

function resolveCountryFromKeywords(parts: Array<string | null | undefined>) {
  const text = parts
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  if (!text) {
    return null;
  }

  for (const hint of COUNTRY_KEYWORD_HINTS) {
    if (hint.pattern.test(text)) {
      return hint.countryCode;
    }
  }

  return null;
}

function shouldRefreshInference(inferredAt: Date | null) {
  if (!inferredAt) {
    return true;
  }

  return Date.now() - inferredAt.getTime() >= INFERENCE_REFRESH_INTERVAL_MS;
}

function buildInferenceUpdate(
  feedLanguage: string | null | undefined,
  sourceUrl: string,
  siteUrl: string | null | undefined,
  title: string | null | undefined,
  description: string | null | undefined
) {
  const normalizedLanguage = normalizeLanguageCode(feedLanguage);

  if (!normalizedLanguage) {
    const domainCountry = resolveCountryFromDomain(siteUrl, sourceUrl);
    const keywordCountry = resolveCountryFromKeywords([title, description, sourceUrl, siteUrl]);

    return {
      inferredLanguage: null,
      inferredCountryCode: domainCountry ?? keywordCountry ?? "GLOBAL",
      inferenceConfidence: null,
      inferenceSource: "DEFAULT" as const,
      inferredAt: new Date(),
    };
  }

  const keywordCountry = resolveCountryFromKeywords([title, description, sourceUrl, siteUrl]);

  return {
    inferredLanguage: normalizedLanguage,
    inferredCountryCode:
      GLOBAL_LANGUAGE_SET.has(normalizedLanguage)
        ? (resolveCountryFromDomain(siteUrl, sourceUrl) ?? keywordCountry ?? "GLOBAL")
        : mapLanguageToCountry(normalizedLanguage),
    inferenceConfidence: 0.5,
    inferenceSource: "LANG_DETECTION" as const,
    inferredAt: new Date(),
  };
}

// Worker processors
export const rssFetchProcessor: WorkerProcessor<RssFetchJobData> = async (job) => {
  const { feedSourceId, force = false } = job.data;

  try {
    const feedSource = await db.feedSource.findUnique({
      where: { id: feedSourceId },
    });

    if (!feedSource) {
      throw new Error(`Feed source  not found`);
    }

    if (!feedSource.isEnabled && !force) {
      return { skipped: true, reason: "Feed source is disabled" };
    }

    const feedData = await rssParser.parseURL(feedSource.url);

    const updateData: Prisma.FeedSourceUpdateInput = {
      title: feedData.title || feedSource.title,
      description: feedData.description || feedSource.description,
      siteUrl: feedData.link || feedSource.siteUrl,
      language: feedData.language || feedSource.language,
      iconUrl: feedData.image?.url || feedSource.iconUrl,
      lastFetched: new Date(),
      lastError: null,
      errorCount: 0,
      nextFetchAt: new Date(Date.now() + 30 * 60 * 1000),
    };

    if (
      feedSource.inferenceSource !== "MANUAL"
      && (shouldRefreshInference(feedSource.inferredAt) || feedSource.inferredCountryCode === "GLOBAL")
    ) {
      try {
        Object.assign(
          updateData,
          buildInferenceUpdate(
            feedData.language || feedSource.language,
            feedSource.url,
            feedData.link || feedSource.siteUrl,
            feedData.title || feedSource.title,
            feedData.description || feedSource.description
          )
        );
      } catch (inferenceError) {
        const inferenceMessage =
          inferenceError instanceof Error ? inferenceError.message : "Unknown inference error";
        console.warn(`Feed inference failed for ${feedSourceId}: ${inferenceMessage}`);
      }
    }

    await db.feedSource.update({
      where: { id: feedSourceId },
      data: updateData,
    });

    const existingKeys = new Set(
      (
        await db.sourceArticle.findMany({
          where: { feedSourceId },
          select: { articleKey: true },
        })
      ).map((article) => article.articleKey)
    );

    const newArticles: Prisma.SourceArticleCreateManyInput[] = [];
    const rssItems = (feedData.items ?? []) as ParsedRssItem[];
    for (const item of rssItems) {
      if (!item.link) {
        continue;
      }

      const articleKey = createArticleKey(item);
      if (!force && existingKeys.has(articleKey)) {
        continue;
      }

      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      newArticles.push({
        feedSourceId,
        articleKey,
        guid: item.guid || null,
        title: item.title || "Untitled",
        link: item.link,
        author: item.creator || item.author || null,
        pubDate,
        content: item.content || item["content:encoded"] || null,
        excerpt: item.summary || item.description || null,
        categories: item.categories || [],
      });
    }

    if (newArticles.length > 0) {
      await db.sourceArticle.createMany({
        data: newArticles,
        skipDuplicates: true,
      });
    }

    return {
      feedSourceId,
      newArticlesCount: newArticles.length,
      totalItems: feedData.items?.length || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.feedSource.update({
      where: { id: feedSourceId },
      data: {
        lastError: errorMessage,
        errorCount: { increment: 1 },
        nextFetchAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    throw error;
  }
};

export const contentExtractProcessor: WorkerProcessor<ContentExtractJobData> = async (job) => {
  const { sourceArticleId, url } = job.data;

  try {
    const article = await db.sourceArticle.findUnique({
      where: { id: sourceArticleId },
    });

    if (!article) {
      throw new Error(`Source article ${sourceArticleId} not found`);
    }

    if (article.contentExtracted) {
      return { skipped: true, reason: "Already extracted" };
    }

    const extracted = await extract(url);

    if (!extracted) {
      throw new Error("Content extraction failed - no content returned");
    }

    await db.sourceArticle.update({
      where: { id: sourceArticleId },
      data: {
        content: extracted.content || article.content,
        image: extracted.image || article.image,
        author: extracted.author || article.author,
        contentExtracted: true,
        extractionAttempts: { increment: 1 },
        lastExtractionError: null,
      },
    });

    return {
      sourceArticleId,
      extracted: true,
      hasContent: !!extracted.content,
      wordCount: extracted.content?.split(/\s+/).length || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.sourceArticle.update({
      where: { id: sourceArticleId },
      data: {
        extractionAttempts: { increment: 1 },
        lastExtractionError: errorMessage,
      },
    });

    console.warn(`Content extraction failed for ${sourceArticleId}: ${errorMessage}`);

    return {
      sourceArticleId,
      extracted: false,
      error: errorMessage,
    };
  }
};
