import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { activityService } from '../services/activity.service';
import { companyService } from '../services/company.service';
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

  /**
   * Get query-wise (per-job) scraped details
   */
  async getQueryWiseStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await analyticsService.getQueryWiseStats(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Get query-wise stats failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to load query-wise stats' });
    }
  }

  /**
   * Export leads for a specific scrape job (query-wise export) as CSV download
   */
  async exportQueryWise(req: Request, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid job ID' });
        return;
      }

      // Fetch all leads for this job
      const result = await companyService.search({ jobId, page: 1, limit: 100000 });
      const leads = result.data;

      if (leads.length === 0) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'No leads found for this job' });
        return;
      }

      // Generate CSV content
      const headers = [
        'Company Name', 'Email', 'Phone', 'WhatsApp', 'Website', 'LinkedIn',
        'Facebook', 'Address', 'Category', 'Company Size', 'Source URL',
        'Verification Status', 'Confidence Score', 'Website Status', 'Lead Priority'
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rows = leads.map((lead) => [
        escapeCsv(lead.company_name),
        escapeCsv(lead.email || ''),
        escapeCsv(lead.phone || ''),
        escapeCsv(lead.whatsapp || ''),
        escapeCsv(lead.website || ''),
        escapeCsv(lead.linkedin || ''),
        escapeCsv(lead.facebook || ''),
        escapeCsv(lead.address || ''),
        escapeCsv(lead.category || ''),
        escapeCsv(lead.company_size || ''),
        escapeCsv(lead.source_url),
        escapeCsv(lead.verification_status),
        String(lead.confidence_score),
        escapeCsv(lead.website_status),
        escapeCsv(lead.lead_priority)
      ].join(','));

      const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="job_${jobId}_leads.csv"`);
      res.status(HTTP_STATUS.OK).send(csvContent);
    } catch (error) {
      logger.error('Export query-wise leads failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to export leads' });
    }
  }
}

export const analyticsController = new AnalyticsController();
