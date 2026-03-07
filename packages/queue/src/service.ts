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

// Create queue factory
export const createQueue = <TData = unknown>(name: string) => {
  return new Queue<TData>(name, {
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
};

// Create worker factory
export const createWorker = <TData = unknown, TResult = unknown>(
  name: string,
  processor: WorkerProcessor<TData, TResult>
) => {
  return new Worker<TData, TResult>(name, processor, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
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

    await db.feedSource.update({
      where: { id: feedSourceId },
      data: {
        title: feedData.title || feedSource.title,
        description: feedData.description || feedSource.description,
        siteUrl: feedData.link || feedSource.siteUrl,
        language: feedData.language || feedSource.language,
        iconUrl: feedData.image?.url || feedSource.iconUrl,
        lastFetched: new Date(),
        lastError: null,
        errorCount: 0,
        nextFetchAt: new Date(Date.now() + 30 * 60 * 1000),
      },
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
