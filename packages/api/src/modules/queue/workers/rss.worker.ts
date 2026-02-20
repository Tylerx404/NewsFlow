import Parser from 'rss-parser';
import db from '@NewsFlow/db';
import type { RssFetchJobData } from '../jobs/rss-fetch.job';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
    ],
  },
});

export const rssFetchProcessor = async (job: { data: RssFetchJobData }) => {
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
    const feedData = await parser.parseURL(feed.url);

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