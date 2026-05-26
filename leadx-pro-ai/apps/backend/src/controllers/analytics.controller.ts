import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { activityService } from '../services/activity.service';
import { HTTP_STATUS } from '@leadx/shared';
import { logger } from '../utils/logger';

export class AnalyticsController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const stats = await analyticsService.getDashboardStats(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Get dashboard failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load dashboard' });
    }
  }

  async getLeadTrends(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trends = await analyticsService.getLeadTrends(req.user!.userId, days);
      res.json({ success: true, data: trends });
    } catch (error) {
      logger.error('Get lead trends failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load trends' });
    }
  }

  async getJobAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await analyticsService.getJobAnalytics(req.user!.userId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error('Get job analytics failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load analytics' });
    }
  }

  async getExportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await analyticsService.getExportAnalytics(req.user!.userId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error('Get export analytics failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load analytics' });
    }
  }

  async getQualityDistribution(req: Request, res: Response): Promise<void> {
    try {
      const distribution = await analyticsService.getQualityDistribution(req.user!.userId);
      res.json({ success: true, data: distribution });
    } catch (error) {
      logger.error('Get quality distribution failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load distribution' });
    }
  }

  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await activityService.getRecent(req.user!.userId, limit);
      res.json({ success: true, data: activities });
    } catch (error) {
      logger.error('Get activity failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load activity' });
    }
  }
}

export const analyticsController = new AnalyticsController();
