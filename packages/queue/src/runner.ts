import type { Job } from "bullmq";

import {
  HEARTBEAT_KEYS,
  startHeartbeatTicker,
  type HeartbeatTicker,
} from "./heartbeat";
import { startScheduler, stopScheduler } from "./scheduler";
import {
  contentExtractProcessor,
  createWorker,
  QUEUES,
  rssFetchProcessor,
  type WorkerInstance,
} from "./service";
import type { ContentExtractJobData, RssFetchJobData } from "./schema";

let rssWorker: WorkerInstance;
let contentWorker: WorkerInstance;
let workerHeartbeatTicker: HeartbeatTicker | null = null;
let isRunning = false;

// Worker creation functions
const createRssWorker = () => {
  return createWorker(QUEUES.RSS_FETCH, rssFetchProcessor);
};

const createContentWorker = () => {
  return createWorker(QUEUES.CONTENT_EXTRACT, contentExtractProcessor);
};

// Worker lifecycle management
const setupWorkerEventHandlers = () => {
  console.log("Setting up worker event handlers...");

  rssWorker.on("completed", (job: Job<RssFetchJobData> | undefined) => {
    console.log(`RSS job ${job?.id} completed:`, job?.returnvalue);
  });

  rssWorker.on("failed", (job: Job<RssFetchJobData> | undefined, err: Error) => {
    console.error(`RSS job ${job?.id} failed:`, err.message);
  });

  contentWorker.on("completed", (job: Job<ContentExtractJobData> | undefined) => {
    console.log(`Content extraction job ${job?.id} completed:`, job?.returnvalue);
  });

  contentWorker.on(
    "failed",
    (job: Job<ContentExtractJobData> | undefined, err: Error) => {
      console.error(`Content extraction job ${job?.id} failed:`, err.message);
    }
  );
};

const stopWorkers = async () => {
  console.log("Stopping workers...");
  await Promise.all([
    rssWorker.close(),
    contentWorker.close(),
  ]);
};

const startWorkerHeartbeat = () => {
  if (workerHeartbeatTicker) {
    return;
  }

  workerHeartbeatTicker = startHeartbeatTicker({
    key: HEARTBEAT_KEYS.worker,
    component: "worker",
  });
};

const stopWorkerHeartbeat = async () => {
  if (!workerHeartbeatTicker) {
    return;
  }

  await workerHeartbeatTicker.stop();
  workerHeartbeatTicker = null;
};

export const startJobRunner = () => {
  if (isRunning) {
    console.log("Job runner already running");
    return;
  }

  console.log("Starting NewsFlow job runner...");

  try {
    // Create workers
    rssWorker = createRssWorker();
    contentWorker = createContentWorker();

    // Setup event handlers
    setupWorkerEventHandlers();

    // Start worker heartbeat
    startWorkerHeartbeat();

    // Start cron scheduler
    startScheduler();

    isRunning = true;
    console.log("Job runner started successfully");

  } catch (error) {
    void stopWorkerHeartbeat();
    console.error("Failed to start job runner:", error);
    throw error;
  }
};

export const stopJobRunner = async () => {
  if (!isRunning) {
    console.log("Job runner not running");
    return;
  }

  console.log("Stopping NewsFlow job runner...");

  try {
    // Stop in reverse order
    await stopScheduler();
    await stopWorkerHeartbeat();
    await stopWorkers();

    isRunning = false;
    console.log("Job runner stopped successfully");

  } catch (error) {
    console.error("Error stopping job runner:", error);
    throw error;
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down job runner...");
  await stopJobRunner();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down job runner...");
  await stopJobRunner();
  process.exit(0);
});
