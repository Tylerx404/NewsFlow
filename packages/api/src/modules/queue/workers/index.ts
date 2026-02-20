import { rssFetchProcessor } from './rss.worker';
import { contentExtractProcessor } from './content.worker';

// Export processors for the runner to use
export { rssFetchProcessor, contentExtractProcessor };

// Worker creation functions
export const createRssWorker = (createWorker: any, QUEUES: any) => {
  return createWorker(QUEUES.RSS_FETCH, rssFetchProcessor);
};

export const createContentWorker = (createWorker: any, QUEUES: any) => {
  return createWorker(QUEUES.CONTENT_EXTRACT, contentExtractProcessor);
};

// Worker lifecycle management
export const setupWorkerEventHandlers = (rssWorker: any, contentWorker: any) => {
  console.log('Starting workers...');

  rssWorker.on('completed', (job: any) => {
    console.log(`RSS job ${job?.id} completed:`, job?.returnvalue);
  });

  rssWorker.on('failed', (job: any, err: any) => {
    console.error(`RSS job ${job?.id} failed:`, err.message);
  });

  contentWorker.on('completed', (job: any) => {
    console.log(`Content extraction job ${job?.id} completed:`, job?.returnvalue);
  });

  contentWorker.on('failed', (job: any, err: any) => {
    console.error(`Content extraction job ${job?.id} failed:`, err.message);
  });
};

export const stopWorkers = async (rssWorker: any, contentWorker: any) => {
  console.log('Stopping workers...');
  await Promise.all([
    rssWorker.close(),
    contentWorker.close(),
  ]);
};