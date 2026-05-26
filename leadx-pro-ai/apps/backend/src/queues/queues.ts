import { Queue, QueueEvents } from 'bullmq';
import { bullMQConnection, defaultJobOptions } from './queue.config';
import { QUEUE_NAMES } from '@leadx/shared';
import { queueLogger as logger } from '../utils/logger';

// ============================================
// Scrape Queue
// ============================================
export const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, {
  connection: bullMQConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

export const scrapeQueueEvents = new QueueEvents(QUEUE_NAMES.SCRAPE, {
  connection: bullMQConnection,
});

scrapeQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Scrape job ${jobId} completed`);
});

scrapeQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Scrape job ${jobId} failed: ${failedReason}`);
});

scrapeQueueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Scrape job ${jobId} progress`, { data });
});

// ============================================
// Export Queue
// ============================================
export const exportQueue = new Queue(QUEUE_NAMES.EXPORT, {
  connection: bullMQConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
});

export const exportQueueEvents = new QueueEvents(QUEUE_NAMES.EXPORT, {
  connection: bullMQConnection,
});

exportQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Export job ${jobId} completed`);
});

exportQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Export job ${jobId} failed: ${failedReason}`);
});

// ============================================
// Retry Queue
// ============================================
export const retryQueue = new Queue(QUEUE_NAMES.RETRY, {
  connection: bullMQConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const retryQueueEvents = new QueueEvents(QUEUE_NAMES.RETRY, {
  connection: bullMQConnection,
});

retryQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Retry job ${jobId} completed`);
});

retryQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Retry job ${jobId} failed: ${failedReason}`);
});

export const allQueues = { scrapeQueue, exportQueue, retryQueue };
