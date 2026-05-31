import { Worker, Job } from 'bullmq';
import { bullMQConnection } from '../queues/queue.config';
import { QUEUE_NAMES, JobStatus } from '@leadx/shared';
import { jobService } from '../services/job.service';
import { scraperManager } from '../scrapers/scraper-manager';
import { socketService } from '../config/socket';
import { analyticsService } from '../services/analytics.service';
import { dispatchWebhook } from '../services/webhooks/dispatcher';
import { invalidateCache } from '../utils/cache';
import { workerLogger as logger } from '../utils/logger';

export function createScrapeWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.SCRAPE,
    async (job: Job) => {
      const { jobId, userId } = job.data;
      logger.info(`Processing scrape job ${jobId}`, { jobId, userId });

      try {
        // Update job status to running
        await jobService.updateStatus(jobId, JobStatus.RUNNING);
        socketService?.emitToUser(userId, 'job:started', { jobId });

        // Get job config from database
        const dbJob = await jobService.findById(jobId);
        if (!dbJob) {
          throw new Error(`Job ${jobId} not found in database`);
        }

        // Run the scraper
        const result = await scraperManager.runJob(dbJob, (progress) => {
          // Report progress back to BullMQ and Socket.IO
          job.updateProgress(progress);
          socketService?.emitToUser(userId, 'job:progress', {
            jobId,
            ...progress,
          });
        });

        // Update job as completed
        await jobService.updateCounts(jobId, result.totalFound, result.totalVerified);
        await jobService.updateStatus(jobId, JobStatus.COMPLETED);

        // Invalidate analytics cache
        await analyticsService.invalidateCache(userId);

        // Invalidate API-level caches
        await invalidateCache(`dashboard:stats:${userId}`);
        await invalidateCache(`leads:metadata:${userId}`);

        // Notify via socket
        socketService?.emitToUser(userId, 'job:completed', {
          jobId,
          totalFound: result.totalFound,
          totalVerified: result.totalVerified,
        });

        // Dispatch webhook
        dispatchWebhook(userId, 'job.completed', {
          jobId,
          leadsCount: result.totalFound,
          completedAt: new Date().toISOString(),
        });

        logger.info(`Scrape job ${jobId} completed`, {
          totalFound: result.totalFound,
          totalVerified: result.totalVerified,
        });

        return result;
      } catch (error: any) {
        logger.error(`Scrape job ${jobId} failed`, { error: error.message });

        await jobService.updateStatus(jobId, JobStatus.FAILED);
        socketService?.emitToUser(userId, 'job:failed', {
          jobId,
          error: error.message,
        });

        // Dispatch webhook
        dispatchWebhook(userId, 'job.failed', {
          jobId,
          error: error.message,
          failedAt: new Date().toISOString(),
        });

        throw error;
      }
    },
    {
      connection: bullMQConnection,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60000,
      },
    },
  );

  worker.on('completed', (job) => {
    logger.info(`Worker completed job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Worker failed job ${job?.id}`, { error: err.message });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  return worker;
}
