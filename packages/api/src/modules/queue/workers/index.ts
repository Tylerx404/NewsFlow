import { createWorker, QUEUES } from '../index';
import { rssFetchProcessor } from './rss.worker';
import { contentExtractProcessor } from './content.worker';

// RSS Fetch Worker
export const rssWorker = createWorker(QUEUES.RSS_FETCH, rssFetchProcessor);

// Content Extract Worker
export const contentWorker = createWorker(QUEUES.CONTENT_EXTRACT, contentExtractProcessor);

// Worker lifecycle management
export const startWorkers = () => {
  console.log('Starting workers...');

  rssWorker.on('completed', (job) => {
    console.log(`RSS job ${job?.id} completed:`, job?.returnvalue);
  });

  rssWorker.on('failed', (job, err) => {
    console.error(`RSS job ${job?.id} failed:`, err.message);
  });

  contentWorker.on('completed', (job) => {
    console.log(`Content extraction job ${job?.id} completed:`, job?.returnvalue);
  });

  contentWorker.on('failed', (job, err) => {
    console.error(`Content extraction job ${job?.id} failed:`, err.message);
  });
};

export const stopWorkers = async () => {
  console.log('Stopping workers...');
  await Promise.all([
    rssWorker.close(),
    contentWorker.close(),
  ]);
};