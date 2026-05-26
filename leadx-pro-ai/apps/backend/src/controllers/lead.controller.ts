import { Request, Response } from 'express';
import { companyService } from '../services/company.service';
import { activityService } from '../services/activity.service';
import { ActivityAction, EntityType, HTTP_STATUS, ILeadFilters } from '@leadx/shared';
import { logger } from '../utils/logger';

export class LeadController {
  async search(req: Request, res: Response): Promise<void> {
    try {
      const filters: ILeadFilters = {
        search: req.query.search as string,
        jobId: req.query.jobId ? parseInt(req.query.jobId as string) : undefined,
        category: req.query.category as string,
        verificationStatus: req.query.verificationStatus as any,
        leadPriority: req.query.leadPriority as any,
        websiteStatus: req.query.websiteStatus as any,
        hasEmail: req.query.hasEmail === 'true',
        hasPhone: req.query.hasPhone === 'true',
        hasWhatsapp: req.query.hasWhatsapp === 'true',
        hasLinkedin: req.query.hasLinkedin === 'true',
        minConfidence: req.query.minConfidence ? parseInt(req.query.minConfidence as string) : undefined,
        maxConfidence: req.query.maxConfidence ? parseInt(req.query.maxConfidence as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 25,
      };

      const result = await companyService.search(filters);

      res.json({
        success: true,
        data: result.data,
        meta: {
          page: result.page, limit: result.limit,
          total: result.total, totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Search leads failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to search leads' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const lead = await companyService.findById(parseInt(req.params.id));
      if (!lead) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Lead not found' });
        return;
      }
      res.json({ success: true, data: { lead } });
    } catch (error) {
      logger.error('Get lead failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to get lead' });
    }
  }

  async bulkAction(req: Request, res: Response): Promise<void> {
    try {
      const { ids, action, data } = req.body;

      switch (action) {
        case 'delete':
          await companyService.bulkSoftDelete(ids);
          await activityService.log({
            userId: req.user!.userId, action: ActivityAction.LEAD_DELETED,
            entityType: EntityType.LEAD,
            details: { count: ids.length }, ipAddress: req.ip,
          });
          break;
        case 'archive':
          await companyService.bulkSoftDelete(ids);
          await activityService.log({
            userId: req.user!.userId, action: ActivityAction.LEAD_ARCHIVED,
            entityType: EntityType.LEAD,
            details: { count: ids.length }, ipAddress: req.ip,
          });
          break;
        case 'tag':
          // Add tags — handled individually for now
          break;
        default:
          res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid action' });
          return;
      }

      res.json({ success: true, message: `Bulk ${action} completed for ${ids.length} leads` });
    } catch (error) {
      logger.error('Bulk action failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Bulk action failed' });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const distribution = await companyService.getCategoryDistribution(req.user!.userId);
      res.json({ success: true, data: distribution });
    } catch (error) {
      logger.error('Get categories failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to get categories' });
    }
  }
}

export const leadController = new LeadController();
