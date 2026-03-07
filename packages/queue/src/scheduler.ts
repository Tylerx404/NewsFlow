import type { Queue } from "bullmq";
import cron from "node-cron";

import db from "@NewsFlow/db";
import {
  HEARTBEAT_KEYS,
  startHeartbeatTicker,
  type HeartbeatTicker,
} from "./heartbeat";
import type { ContentExtractJobData, RssFetchJobData } from "./schema";
import { CONTENT_EXTRACT_JOB, RSS_FETCH_JOB } from "./schema";
import { QUEUES, createQueue } from "./service";

let rssQueue: Queue<RssFetchJobData> | null = null;
let contentQueue: Queue<ContentExtractJobData> | null = null;
let rssTask: ReturnType<typeof cron.schedule> | null = null;
let contentTask: ReturnType<typeof cron.schedule> | null = null;
let rssHeartbeatTicker: HeartbeatTicker | null = null;
let contentHeartbeatTicker: HeartbeatTicker | null = null;

export const startScheduler = () => {
  if (rssTask || contentTask) {
    console.log("Scheduler already running");
    return;
  }

  console.log("Starting RSS cron scheduler...");

  rssQueue = createQueue<RssFetchJobData>(QUEUES.RSS_FETCH);
  contentQueue = createQueue<ContentExtractJobData>(QUEUES.CONTENT_EXTRACT);

  rssHeartbeatTicker = startHeartbeatTicker({
    key: HEARTBEAT_KEYS.scheduler.rss,
    component: "scheduler:rss",
  });

  contentHeartbeatTicker = startHeartbeatTicker({
    key: HEARTBEAT_KEYS.scheduler.content,
    component: "scheduler:content",
  });

  rssTask = cron.schedule("*/30 * * * *", async () => {
    try {
      console.log("Running RSS fetch cron job...");

      const sourcesToRefresh = await db.feedSource.findMany({
        where: {
          isEnabled: true,
          subscriptions: {
            some: {
              isActive: true,
            },
          },
          OR: [{ nextFetchAt: null }, { nextFetchAt: { lte: new Date() } }],
        },
        select: {
          id: true,
        },
        take: 100,
      });

      console.log(`Found ${sourcesToRefresh.length} feed sources to refresh`);

      const jobs = sourcesToRefresh.map((source) => ({
        name: RSS_FETCH_JOB,
        data: {
          feedSourceId: source.id,
        },
        opts: {
          jobId: `rss-fetch-${source.id}`,
        },
      }));

      await rssQueue?.addBulk(jobs);

      console.log(`Queued ${jobs.length} RSS fetch jobs`);
    } catch (error) {
      console.error("RSS cron job failed:", error);
    }
  });

  contentTask = cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("Running content extraction cron job...");

      const articlesToExtract = await db.sourceArticle.findMany({
        where: {
          contentExtracted: false,
          content: null,
          extractionAttempts: { lt: 3 },
          feedSource: {
            isEnabled: true,
            subscriptions: {
              some: {
                isActive: true,
              },
            },
          },
        },
        select: {
          id: true,
          link: true,
        },
        take: 50,
      });

      console.log(`Found ${articlesToExtract.length} source articles to extract`);

      const jobs = articlesToExtract.map((article) => ({
        name: CONTENT_EXTRACT_JOB,
        data: {
          sourceArticleId: article.id,
          url: article.link,
        },
        opts: {
          jobId: `content-extract-${article.id}`,
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

  if (rssHeartbeatTicker) {
    await rssHeartbeatTicker.stop();
    rssHeartbeatTicker = null;
  }

  if (contentHeartbeatTicker) {
    await contentHeartbeatTicker.stop();
    contentHeartbeatTicker = null;
  }

  await Promise.all([rssQueue?.close(), contentQueue?.close()]);
  rssQueue = null;
  contentQueue = null;
};
