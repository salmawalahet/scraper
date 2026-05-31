import * as cron from 'node-cron';
import cronParser from 'cron-parser';
import { jobService } from '../job.service';
import { queueService } from '../../queues/queue.service';
import { logger } from '../../utils/logger';
import { IScrapeJob } from '@leadx/shared';

export class JobScheduler {
  private activeJobs = new Map<number, cron.ScheduledTask>();

  /**
   * Start the scheduler by loading all scheduled jobs from the database
   */
  async startScheduler(): Promise<void> {
    try {
      const scheduledJobs = await jobService.getScheduledJobs();
      logger.info(`Starting scheduler with ${scheduledJobs.length} active scheduled jobs`);

      for (const job of scheduledJobs) {
        this.registerJob(job);
      }
    } catch (error) {
      logger.error('Failed to start job scheduler', { error });
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduler(): void {
    logger.info(`Stopping scheduler, clearing ${this.activeJobs.size} active tasks`);
    for (const [jobId, task] of this.activeJobs.entries()) {
      task.stop();
    }
    this.activeJobs.clear();
  }

  /**
   * Register a specific job with node-cron
   */
  registerJob(job: IScrapeJob): void {
    if (!job.schedule_cron || !job.schedule_enabled) {
      this.unregisterJob(job.id);
      return;
    }

    // Unregister existing if any
    this.unregisterJob(job.id);

    try {
      // Validate cron expression
      if (!cron.validate(job.schedule_cron)) {
        logger.error(`Invalid cron expression for job ${job.id}: ${job.schedule_cron}`);
        return;
      }

      const timezone = job.schedule_tz || 'UTC';

      const task = cron.schedule(
        job.schedule_cron,
        () => this.executeScheduledJob(job.id),
        {
          scheduled: true,
          timezone,
        } as any
      );

      this.activeJobs.set(job.id, task);
      logger.info(`Registered cron task for job ${job.id} with schedule ${job.schedule_cron} (${timezone})`);

      // Calculate initial next run
      this.calculateNextRun(job.id, job.schedule_cron, timezone).catch(err => {
        logger.error(`Failed to calculate next run for job ${job.id}`, { error: err });
      });

    } catch (error) {
      logger.error(`Failed to register cron task for job ${job.id}`, { error });
    }
  }

  /**
   * Unregister a specific job
   */
  unregisterJob(jobId: number): void {
    const existingTask = this.activeJobs.get(jobId);
    if (existingTask) {
      existingTask.stop();
      this.activeJobs.delete(jobId);
      logger.info(`Unregistered cron task for job ${jobId}`);
    }
  }

  /**
   * Execute the job when the cron schedule fires
   */
  private async executeScheduledJob(scheduledJobId: number): Promise<void> {
    try {
      logger.info(`Cron fired for scheduled job ${scheduledJobId}`);
      
      const job = await jobService.findById(scheduledJobId);
      if (!job || !job.schedule_enabled || !job.is_scheduled || !job.schedule_cron) {
        logger.warn(`Scheduled job ${scheduledJobId} fired but is no longer valid. Unregistering.`);
        this.unregisterJob(scheduledJobId);
        return;
      }

      // Clone the job config and create a new run
      const runName = `${job.name} (Auto Run - ${new Date().toISOString().split('T')[0]})`;
      
      const newJobId = await jobService.create(job.user_id, {
        name: runName,
        target_url: job.target_url,
        search_query: job.search_query,
        config: job.config,
      });

      // Push to scrape queue
      await queueService.addScrapeJob(newJobId, job.user_id, {
        name: runName,
        target_url: job.target_url,
        search_query: job.search_query,
        config: job.config,
      });

      logger.info(`Successfully dispatched new run ${newJobId} for scheduled job ${scheduledJobId}`);

      if (job.config?.run_once) {
        logger.info(`Job ${job.id} is configured to run once. Disabling schedule.`);
        await jobService.updateSchedule(job.id, {
          schedule_enabled: false,
          ...(job.last_run_at ? {} : { last_run_at: new Date() }) // optional: keep last run at
        });
        this.unregisterJob(job.id);
      } else {
        // Update last_run_at and calculate next_run_at
        await this.calculateNextRun(job.id, job.schedule_cron, job.schedule_tz || 'UTC', new Date());
      }

    } catch (error) {
      logger.error(`Error executing scheduled job ${scheduledJobId}`, { error });
    }
  }

  /**
   * Calculate and save the next run time
   */
  private async calculateNextRun(jobId: number, cronExpr: string, tz: string, lastRunAt?: Date): Promise<void> {
    try {
      const interval = cronParser.parseExpression(cronExpr, { tz });
      const nextDate = interval.next().toDate();

      await jobService.updateSchedule(jobId, {
        next_run_at: nextDate,
        ...(lastRunAt ? { last_run_at: lastRunAt } : {})
      });
      
      logger.debug(`Updated next_run_at for job ${jobId} to ${nextDate.toISOString()}`);
    } catch (error) {
      logger.error(`Error calculating next run for job ${jobId}`, { error });
    }
  }
}

export const jobScheduler = new JobScheduler();
