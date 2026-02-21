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
        type: 'exponential',
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
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
    ],
  },
});

type ParsedRssItem = Parser.Item & {
  creator?: string;
  author?: string;
  summary?: string;
  description?: string;
  "content:encoded"?: string;
};

// Worker processors
export const rssFetchProcessor: WorkerProcessor<RssFetchJobData> = async (job) => {
  const { feedId, userId, force = false } = job.data;

  try {
    // Get feed with last fetch time
    const feed = await db.feed.findUnique({
      where: { id: feedId, userId },
    });

    if (!feed) {
      throw new Error(`Feed ${feedId} not found for user ${userId}`);
    }

    // Fetch RSS feed
    const feedData = await rssParser.parseURL(feed.url);

    // Update feed metadata
    await db.feed.update({
      where: { id: feedId },
      data: {
        title: feedData.title || feed.title,
        description: feedData.description || feed.description,
        siteUrl: feedData.link || feed.siteUrl,
        lastFetched: new Date(),
        lastError: null,
        errorCount: 0,
        nextFetchAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    // Process new articles
    const existingGuids = new Set(
      (
        await db.article.findMany({
          where: { feedId },
          select: { guid: true },
        })
      ).map((article) => article.guid)
    );

    const newArticles: Prisma.ArticleCreateManyInput[] = [];
    const rssItems = (feedData.items ?? []) as ParsedRssItem[];
    for (const item of rssItems) {
      if (!item.link) continue;
      const guid = item.guid || item.link;

      if (!force && existingGuids.has(guid)) continue;

      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      newArticles.push({
        feedId,
        guid,
        title: item.title || "Untitled",
        link: item.link,
        author: item.creator || item.author || null,
        pubDate,
        content: item.content || item["content:encoded"] || null,
        excerpt: item.summary || item.description || null,
        categories: item.categories || [],
      });
    }

    // Bulk insert new articles
    if (newArticles.length > 0) {
      await db.article.createMany({
        data: newArticles,
        skipDuplicates: true,
      });
    }

    return {
      feedId,
      newArticlesCount: newArticles.length,
      totalItems: feedData.items?.length || 0,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update feed error tracking
    await db.feed.update({
      where: { id: feedId },
      data: {
        lastError: errorMessage,
        errorCount: { increment: 1 },
        nextFetchAt: new Date(Date.now() + 60 * 60 * 1000), // Retry in 1 hour on error
      },
    });

    throw error;
  }
};

export const contentExtractProcessor: WorkerProcessor<ContentExtractJobData> = async (job) => {
  const { articleId, url } = job.data;

  try {
    // Get article
    const article = await db.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    if (article.contentExtracted) {
      return { skipped: true, reason: "Already extracted" };
    }

    // Extract full content
    const extracted = await extract(url);

    if (!extracted) {
      throw new Error("Content extraction failed - no content returned");
    }

    // Update article with extracted content
    await db.article.update({
      where: { id: articleId },
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
      articleId,
      extracted: true,
      hasContent: !!extracted.content,
      wordCount: extracted.content?.split(/\s+/).length || 0,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update extraction tracking
    await db.article.update({
      where: { id: articleId },
      data: {
        extractionAttempts: { increment: 1 },
        lastExtractionError: errorMessage,
      },
    });

    // Don't throw - content extraction failures are not critical
    console.warn(`Content extraction failed for ${articleId}: ${errorMessage}`);

    return {
      articleId,
      extracted: false,
      error: errorMessage,
    };
  }
};
