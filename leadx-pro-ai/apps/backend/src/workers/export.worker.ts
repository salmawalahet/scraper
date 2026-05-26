import { Worker, Job } from 'bullmq';
import { bullMQConnection } from '../queues/queue.config';
import { QUEUE_NAMES, ExportFormat, ExportStatus, IScrapedCompany } from '@leadx/shared';
import { exportService } from '../services/export.service';
import { companyService } from '../services/company.service';
import { socketService } from '../config/socket';
import { workerLogger as logger } from '../utils/logger';
import { createCsvExport, createExcelExport, createJsonExport } from '../services/export-generator.service';

export function createExportWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.EXPORT,
    async (job: Job) => {
      const { exportId, userId, format, filters, leadIds } = job.data;
      logger.info(`Processing export job ${exportId}`, { exportId, userId, format });

      try {
        // Update status to processing
        await exportService.updateStatus(exportId, ExportStatus.PROCESSING);

        // Get leads data
        let leads: IScrapedCompany[] = [];
        if (leadIds && leadIds.length > 0) {
          leads = await companyService.findByIds(leadIds);
        } else if (filters) {
          const result = await companyService.search({ ...filters, page: 1, limit: 100000 });
          leads = result.data;
        } else {
          leads = [];
        }

        if (leads.length === 0) {
          await exportService.updateFailed(exportId);
          throw new Error('No leads to export');
        }

        // Generate file based on format
        let filePath: string;
        let fileSize: number;

        switch (format.toLowerCase()) {
          case ExportFormat.CSV:
            ({ filePath, fileSize } = await createCsvExport(exportId, leads));
            break;
          case ExportFormat.EXCEL:
            ({ filePath, fileSize } = await createExcelExport(exportId, leads));
            break;
          case ExportFormat.JSON:
            ({ filePath, fileSize } = await createJsonExport(exportId, leads));
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        // Update export record
        await exportService.updateCompleted(exportId, filePath, fileSize, leads.length);

        // Notify via socket
        socketService?.emitToUser(userId, 'export:completed', {
          exportId,
          filePath,
          totalRecords: leads.length,
        });

        logger.info(`Export ${exportId} completed`, { totalRecords: leads.length, fileSize });

        return { exportId, totalRecords: leads.length };
      } catch (error: any) {
        logger.error(`Export job ${exportId} failed`, { error: error.message });
        await exportService.updateFailed(exportId);

        socketService?.emitToUser(userId, 'export:failed', {
          exportId,
          error: error.message,
        });

        throw error;
      }
    },
    {
      connection: bullMQConnection,
      concurrency: 3,
    },
  );

  worker.on('error', (err) => {
    logger.error('Export worker error', { error: err.message });
  });

  return worker;
}
