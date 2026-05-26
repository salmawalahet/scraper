import { Request, Response } from 'express';
import { jobService } from '../services/job.service';
import { queueService } from '../queues/queue.service';
import { activityService } from '../services/activity.service';
import { JobStatus, ActivityAction, EntityType, HTTP_STATUS } from '@leadx/shared';
import { logger } from '../utils/logger';

export class JobController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const jobId = await jobService.create(userId, req.body);

      // Add to scrape queue
      await queueService.addScrapeJob(jobId, userId, req.body);

      await activityService.log({
        userId, action: ActivityAction.JOB_CREATED,
        entityType: EntityType.JOB, entityId: jobId, ipAddress: req.ip,
      });

      const job = await jobService.findById(jobId);

      res.status(HTTP_STATUS.CREATED).json({
        success: true, data: { job },
        message: 'Scrape job created and queued',
      });
    } catch (error) {
      logger.error('Create job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to create job' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const status = req.query.status as JobStatus | undefined;

      const result = await jobService.findByUserId(userId, page, limit, status);

      res.json({
        success: true, data: result.jobs,
        meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
      });
    } catch (error) {
      logger.error('List jobs failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to list jobs' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const job = await jobService.findById(parseInt(req.params.id));
      if (!job) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Job not found' });
        return;
      }
      res.json({ success: true, data: { job } });
    } catch (error) {
      logger.error('Get job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to get job' });
    }
  }

  async pause(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      await jobService.updateStatus(jobId, JobStatus.PAUSED);
      await activityService.log({
        userId: req.user!.userId, action: ActivityAction.JOB_PAUSED,
        entityType: EntityType.JOB, entityId: jobId, ipAddress: req.ip,
      });
      res.json({ success: true, message: 'Job paused' });
    } catch (error) {
      logger.error('Pause job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to pause job' });
    }
  }

  async resume(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      await jobService.updateStatus(jobId, JobStatus.RUNNING);
      await activityService.log({
        userId: req.user!.userId, action: ActivityAction.JOB_RESUMED,
        entityType: EntityType.JOB, entityId: jobId, ipAddress: req.ip,
      });
      res.json({ success: true, message: 'Job resumed' });
    } catch (error) {
      logger.error('Resume job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to resume job' });
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      await jobService.updateStatus(jobId, JobStatus.CANCELLED);
      await activityService.log({
        userId: req.user!.userId, action: ActivityAction.JOB_CANCELLED,
        entityType: EntityType.JOB, entityId: jobId, ipAddress: req.ip,
      });
      res.json({ success: true, message: 'Job cancelled' });
    } catch (error) {
      logger.error('Cancel job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to cancel job' });
    }
  }

  async retry(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.userId;
      const job = await jobService.findById(jobId);
      if (!job) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Job not found' });
        return;
      }
      await jobService.updateStatus(jobId, JobStatus.RETRYING);
      await queueService.addScrapeJob(jobId, userId, {
        name: job.name, target_url: job.target_url,
        search_query: job.search_query, config: job.config,
      });
      res.json({ success: true, message: 'Job queued for retry' });
    } catch (error) {
      logger.error('Retry job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to retry job' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await jobService.softDelete(parseInt(req.params.id));
      res.json({ success: true, message: 'Job deleted' });
    } catch (error) {
      logger.error('Delete job failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to delete job' });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await jobService.getJobStats(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Get job stats failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to get stats' });
    }
  }
}

export const jobController = new JobController();
