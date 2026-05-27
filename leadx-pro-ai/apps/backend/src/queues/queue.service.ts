import { scrapeQueue, exportQueue, retryQueue, aiEnrichmentQueue } from './queues';
import { ICreateJob, ExportFormat, ILeadFilters, QUEUE_NAMES } from '@leadx/shared';
import { queueLogger as logger } from '../utils/logger';

export class QueueService {
  /**
   * Add a scrape job to the queue
   */
  async addScrapeJob(jobId: number, userId: number, data: ICreateJob) {
    const job = await scrapeQueue.add(
      `scrape-${jobId}`,
      { jobId, userId, ...data },
      { jobId: `scrape-${jobId}` },
    );
    logger.info(`Added scrape job to queue`, { jobId, queueJobId: job.id });
    return job;
  }

  /**
   * Add an export job to the queue
   */
  async addExportJob(exportId: number, userId: number, data: {
    format: ExportFormat;
    filters?: ILeadFilters;
    leadIds?: number[];
  }) {
    const job = await exportQueue.add(
      `export-${exportId}`,
      { exportId, userId, ...data },
      { jobId: `export-${exportId}` },
    );
    logger.info(`Added export job to queue`, { exportId, queueJobId: job.id });
    return job;
  }

  /**
   * Add an AI enrichment job to the queue
   */
  async addAiEnrichmentJob(companyId: number, senderName?: string) {
    const job = await aiEnrichmentQueue.add(
      `ai-enrich-${companyId}`,
      { companyId, senderName },
      { jobId: `ai-enrich-${companyId}` }
    );
    logger.info(`Added AI enrichment job to queue`, { companyId, queueJobId: job.id });
    return job;
  }

  /**
   * Add a failed job to the retry queue
   */
  async addRetryJob(originalJobId: number, userId: number, data: Record<string, unknown>) {
    const job = await retryQueue.add(
      `retry-${originalJobId}`,
      { originalJobId, userId, ...data },
      {
        jobId: `retry-${originalJobId}-${Date.now()}`,
        delay: 5000,
      },
    );
    logger.info(`Added job to retry queue`, { originalJobId });
    return job;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.pause();
      logger.info(`Queue ${queueName} paused`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.resume();
      logger.info(`Queue ${queueName} resumed`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get all queue stats
   */
  async getAllQueueStats() {
    const [scrape, exportQ, retry, aiEnrich] = await Promise.all([
      this.getQueueStats(QUEUE_NAMES.SCRAPE),
      this.getQueueStats(QUEUE_NAMES.EXPORT),
      this.getQueueStats(QUEUE_NAMES.RETRY),
      this.getQueueStats(QUEUE_NAMES.AI_ENRICHMENT),
    ]);

    return { scrape, export: exportQ, retry, aiEnrich };
  }

  /**
   * Remove a specific job from a queue
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Removed job ${jobId} from ${queueName}`);
      }
    }
  }

  /**
   * Drain a queue (remove all waiting jobs)
   */
  async drainQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.drain();
      logger.info(`Queue ${queueName} drained`);
    }
  }

  private getQueue(name: string) {
    switch (name) {
      case QUEUE_NAMES.SCRAPE:
        return scrapeQueue;
      case QUEUE_NAMES.EXPORT:
        return exportQueue;
      case QUEUE_NAMES.RETRY:
        return retryQueue;
      case QUEUE_NAMES.AI_ENRICHMENT:
        return aiEnrichmentQueue;
      default:
        return null;
    }
  }
}

export const queueService = new QueueService();
