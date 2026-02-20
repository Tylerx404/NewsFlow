import { createWorker, QUEUES } from '../index';
import { rssFetchProcessor } from './rss.worker';

// RSS Fetch Worker
export const rssWorker = createWorker(QUEUES.RSS_FETCH, rssFetchProcessor);

// Worker lifecycle management
export const startWorkers = () => {
  console.log('Starting RSS workers...');

  rssWorker.on('completed', (job) => {
    console.log(`RSS job ${job?.id} completed:`, job?.returnvalue);
  });

  rssWorker.on('failed', (job, err) => {
    console.error(`RSS job ${job?.id} failed:`, err.message);
  });
};

export const stopWorkers = async () => {
  console.log('Stopping RSS workers...');
  await rssWorker.close();
};