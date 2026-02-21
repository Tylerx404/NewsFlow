import type { Queue } from "bullmq";
import cron from "node-cron";

import db from "@NewsFlow/db";
import type { ContentExtractJobData, RssFetchJobData } from "./schema";
import { createQueue, QUEUES } from "./service";

let rssQueue: Queue<RssFetchJobData> | null = null;
let contentQueue: Queue<ContentExtractJobData> | null = null;
let rssTask: ReturnType<typeof cron.schedule> | null = null;
let contentTask: ReturnType<typeof cron.schedule> | null = null;

export const startScheduler = () => {
  if (rssTask || contentTask) {
    console.log("Scheduler already running");
    return;
  }

  console.log("Starting RSS cron scheduler...");

  rssQueue = createQueue<RssFetchJobData>(QUEUES.RSS_FETCH);
  contentQueue = createQueue<ContentExtractJobData>(QUEUES.CONTENT_EXTRACT);

  // Run every 30 minutes
  rssTask = cron.schedule("*/30 * * * *", async () => {
    try {
      console.log("Running RSS fetch cron job...");

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
      const jobs = feedsToRefresh.map((feed) => ({
        name: "rss-fetch",
        data: {
          feedId: feed.id,
          userId: feed.userId,
        },
      }));

      await rssQueue?.addBulk(jobs);

      console.log(`Queued ${jobs.length} RSS fetch jobs`);

    } catch (error) {
      console.error("RSS cron job failed:", error);
    }
  });

  // Run content extraction every 15 minutes
  contentTask = cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("Running content extraction cron job...");

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
      const jobs = articlesToExtract.map((article) => ({
        name: "content-extract",
        data: {
          articleId: article.id,
          url: article.link,
        },
      }));

      await contentQueue?.addBulk(jobs);

      console.log(`Queued ${jobs.length} content extraction jobs`);

    } catch (error) {
      console.error("Content extraction cron job failed:", error);
    }
  });
};

export const stopScheduler = async () => {
  console.log("Stopping RSS cron scheduler...");

  rssTask?.stop();
  contentTask?.stop();
  rssTask?.destroy();
  contentTask?.destroy();
  rssTask = null;
  contentTask = null;

  await Promise.all([rssQueue?.close(), contentQueue?.close()]);
  rssQueue = null;
  contentQueue = null;
};
