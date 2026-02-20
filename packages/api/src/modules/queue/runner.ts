import { startWorkers, stopWorkers } from './workers';
import { startScheduler, stopScheduler } from './scheduler';

let isRunning = false;

export const startJobRunner = () => {
  if (isRunning) {
    console.log('Job runner already running');
    return;
  }

  console.log('Starting NewsFlow job runner...');

  try {
    // Start workers
    startWorkers();

    // Start cron scheduler
    startScheduler();

    isRunning = true;
    console.log('Job runner started successfully');

  } catch (error) {
    console.error('Failed to start job runner:', error);
    throw error;
  }
};

export const stopJobRunner = async () => {
  if (!isRunning) {
    console.log('Job runner not running');
    return;
  }

  console.log('Stopping NewsFlow job runner...');

  try {
    // Stop in reverse order
    stopScheduler();
    await stopWorkers();

    isRunning = false;
    console.log('Job runner stopped successfully');

  } catch (error) {
    console.error('Error stopping job runner:', error);
    throw error;
  }
};

export const getJobRunnerStatus = () => ({
  running: isRunning,
  timestamp: new Date().toISOString(),
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down job runner...');
  await stopJobRunner();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down job runner...');
  await stopJobRunner();
  process.exit(0);
});