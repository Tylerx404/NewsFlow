import cron from 'node-cron';
import db from '@NewsFlow/db';
import { createQueue, QUEUES } from './index';

const rssQueue = createQueue(QUEUES.RSS_FETCH);
const contentQueue = createQueue(QUEUES.CONTENT_EXTRACT);

export const startScheduler = () => {
  console.log('Starting RSS cron scheduler...');

  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('Running RSS fetch cron job...');

      // Find feeds that need refreshing
      const feedsToRefresh = await db.feed.findMany({
        where: {
          isActive: true,
          OR: [
            { nextFetchAt: null },
            { nextFetchAt: { lte: new Date() } },
          ],
        },
        select: {
          id: true,
          userId: true,
          url: true,
        },
        take: 100, // Limit batch size
      });

      console.log(`Found ${feedsToRefresh.length} feeds to refresh`);

      // Queue RSS fetch jobs
      const jobs = feedsToRefresh.map(feed => ({
        name: 'rss-fetch',
        data: {
          feedId: feed.id,
          userId: feed.userId,
        },
      }));

      await rssQueue.addBulk(jobs);

      console.log(`Queued ${jobs.length} RSS fetch jobs`);

    } catch (error) {
      console.error('RSS cron job failed:', error);
    }
  });

  // Run content extraction every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('Running content extraction cron job...');

      // Find articles that need content extraction
      const articlesToExtract = await db.article.findMany({
        where: {
          contentExtracted: false,
          content: null,
          extractionAttempts: { lt: 3 }, // Max 3 attempts
        },
        select: {
          id: true,
          link: true,
        },
        take: 50, // Limit batch size
      });

      console.log(`Found ${articlesToExtract.length} articles to extract`);

      // Queue content extraction jobs
      const jobs = articlesToExtract.map(article => ({
        name: 'content-extract',
        data: {
          articleId: article.id,
          url: article.link,
        },
      }));

      await contentQueue.addBulk(jobs);

      console.log(`Queued ${jobs.length} content extraction jobs`);

    } catch (error) {
      console.error('Content extraction cron job failed:', error);
    }
  });
};

export const stopScheduler = () => {
  console.log('Stopping RSS cron scheduler...');
  // Note: node-cron doesn't have a direct stop method
  // Jobs will stop when the process exits
};