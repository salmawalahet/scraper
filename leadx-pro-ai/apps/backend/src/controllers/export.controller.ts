import { Request, Response } from 'express';
import { exportService } from '../services/export.service';
import { companyService } from '../services/company.service';
import { queueService } from '../queues/queue.service';
import { activityService } from '../services/activity.service';
import { ActivityAction, EntityType, ExportFormat, HTTP_STATUS } from '@leadx/shared';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export class ExportController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { format, filters, leadIds } = req.body;

      // Get count of leads to export
      let totalRecords = 0;
      if (leadIds && leadIds.length > 0) {
        totalRecords = leadIds.length;
      } else if (filters) {
        const result = await companyService.search({ ...filters, page: 1, limit: 1 });
        totalRecords = result.total;
      }

      // Create export record
      const exportId = await exportService.create({
        userId,
        format: format as ExportFormat,
        totalRecords,
        filters,
      });

      // Add to export queue
      await queueService.addExportJob(exportId, userId, { format, filters, leadIds });

      await activityService.log({
        userId, action: ActivityAction.EXPORT_CREATED,
        entityType: EntityType.EXPORT, entityId: exportId, ipAddress: req.ip,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true, data: { exportId },
        message: 'Export queued for processing',
      });
    } catch (error) {
      logger.error('Create export failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to create export' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const result = await exportService.findByUserId(req.user!.userId, page, limit);

      res.json({
        success: true, data: result.exports,
        meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
      });
    } catch (error) {
      logger.error('List exports failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to list exports' });
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    try {
      const exportRecord = await exportService.findById(parseInt(req.params.id));
      if (!exportRecord || !exportRecord.file_path) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Export not found' });
        return;
      }

      if (!fs.existsSync(exportRecord.file_path)) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Export file not found on disk' });
        return;
      }

      await exportService.incrementDownloadCount(exportRecord.id);
      await activityService.log({
        userId: req.user!.userId, action: ActivityAction.EXPORT_DOWNLOADED,
        entityType: EntityType.EXPORT, entityId: exportRecord.id, ipAddress: req.ip,
      });

      const fileName = path.basename(exportRecord.file_path);
      res.download(exportRecord.file_path, fileName);
    } catch (error) {
      logger.error('Download export failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Download failed' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await exportService.softDelete(parseInt(req.params.id));
      res.json({ success: true, message: 'Export deleted' });
    } catch (error) {
      logger.error('Delete export failed', { error });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to delete export' });
    }
  }
}

export const exportController = new ExportController();
