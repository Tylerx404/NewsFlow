import { Queue, Worker } from 'bullmq';
import { redisConnection } from '@NewsFlow/db';
import Parser from 'rss-parser';
import { extract } from '@extractus/article-extractor';
import db from '@NewsFlow/db';
import type { RssFetchJobData, ContentExtractJobData } from './schema';

// Queue names
export const QUEUES = {
  RSS_FETCH: 'rss-fetch',
  CONTENT_EXTRACT: 'content-extract',
} as const;

// Worker processor types
export type WorkerProcessor<T = any> = (job: { data: T }) => Promise<any>;

// Worker instance types
export interface WorkerInstance {
  on(event: string, handler: (...args: any[]) => void): void;
  close(): Promise<void>;
}

// Create queue factory
export const createQueue = (name: string) => {
  return new Queue(name, {
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
export const createWorker = (name: string, processor: WorkerProcessor) => {
  return new Worker(name, processor, {
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
      (await db.article.findMany({
        where: { feedId },
        select: { guid: true },
      })).map((a: { guid: string }) => a.guid)
    );

    const newArticles = [];
    for (const item of feedData.items || []) {
      if (!item.guid && !item.link) continue;
      const guid = item.guid || item.link!;

      if (!force && existingGuids.has(guid)) continue;

      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      newArticles.push({
        feedId,
        guid,
        title: item.title || 'Untitled',
        link: item.link!,
        author: (item as any).creator || (item as any).author,
        pubDate,
        content: item.content || (item as any)['content:encoded'],
        excerpt: (item as any).summary || (item as any).description,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
      return { skipped: true, reason: 'Already extracted' };
    }

    // Extract full content
    const extracted = await extract(url, {
      headers: {
        'User-Agent': 'NewsFlow/1.0',
      },
    } as any);

    if (!extracted) {
      throw new Error('Content extraction failed - no content returned');
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
