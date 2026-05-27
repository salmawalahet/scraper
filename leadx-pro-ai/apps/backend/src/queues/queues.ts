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

// ============================================
// AI Enrichment Queue
// ============================================
export const aiEnrichmentQueue = new Queue(QUEUE_NAMES.AI_ENRICHMENT, {
  connection: bullMQConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const aiEnrichmentQueueEvents = new QueueEvents(QUEUE_NAMES.AI_ENRICHMENT, {
  connection: bullMQConnection,
});

aiEnrichmentQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`AI Enrichment job ${jobId} completed`);
});

aiEnrichmentQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`AI Enrichment job ${jobId} failed: ${failedReason}`);
});

export const allQueues = { scrapeQueue, exportQueue, retryQueue, aiEnrichmentQueue };

