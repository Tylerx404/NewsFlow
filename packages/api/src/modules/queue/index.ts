import { Queue, Worker } from 'bullmq';
import { redisConnection } from '@NewsFlow/db';

// Queue names
export const QUEUES = {
  RSS_FETCH: 'rss-fetch',
  CONTENT_EXTRACT: 'content-extract',
} as const;

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
export const createWorker = (name: string, processor: any) => {
  return new Worker(name, processor, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
};

export * from './scheduler';
export * from './runner';