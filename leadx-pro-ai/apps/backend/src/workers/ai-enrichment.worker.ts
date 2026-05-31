import { Worker, Job } from 'bullmq';
import { bullMQConnection } from '../queues/queue.config';
import { QUEUE_NAMES } from '@leadx/shared';
import { companyService } from '../services/company.service';
import { generateLeadSummary, generateColdEmail } from '../services/ai/leadEnrichment';
import { classifyLead } from '../services/ai/autoTagging';
import { socketService } from '../config/socket';
import { db } from '../database/pool';
import { workerLogger as logger } from '../utils/logger';
import { RowDataPacket } from 'mysql2';

interface JobResult {
  companyId: number;
  success: boolean;
  error?: string;
}

export function createAiEnrichmentWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.AI_ENRICHMENT,
    async (job: Job) => {
      const { companyId, senderName } = job.data;
      logger.info(`Processing AI enrichment job for companyId: ${companyId}`);
      let userId: number | null = null;
      try {
        const company = await companyService.findById(companyId);
        if (!company) {
          throw new Error(`Company with ID ${companyId} not found`);
        }

        // 1. Generate Summary
        let summary: string | null = null;
        try {
          summary = await generateLeadSummary(company);
        } catch (err: any) {
          logger.warn(`Failed to generate AI summary for companyId ${companyId}: ${err.message}`);
        }

        // 2. Generate Cold Email Draft
        let coldEmail: string | null = null;
        try {
          coldEmail = await generateColdEmail(company, senderName || 'Sales Team');
        } catch (err: any) {
          logger.warn(`Failed to generate AI cold email for companyId ${companyId}: ${err.message}`);
        }

        // 3. Classify Lead Priority and tags
        let tags: string[] = [];
        let priority = company.lead_priority;
        try {
          const classification = await classifyLead(company);
          tags = classification.tags;
          priority = classification.priority;
        } catch (err: any) {
          logger.warn(`Failed to classify companyId ${companyId}: ${err.message}`);
        }

        // Merge tags, filtering out duplicates
        const existingTags = company.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...tags]));

        // 4. Update the DB record
        await companyService.updateAiEnrichment(
          companyId,
          summary,
          coldEmail,
          mergedTags,
          priority
        );

        // Fetch updated lead
        const updatedLead = await companyService.findById(companyId);

        // Try to identify user ID from the scrape job to emit targeted socket message
        
        try {
          const [rows] = await db.query<RowDataPacket[]>(
            'SELECT user_id FROM scrape_jobs WHERE id = ?',
            [company.job_id]
          );
          if (rows[0]) {
            userId = rows[0].user_id;
          }
        } catch (dbErr: any) {
          logger.warn(`Failed to look up user ID for socket notification: ${dbErr.message}`);
        }

        const socketData = {
          leadId: companyId,
          lead: updatedLead,
        };

        if (userId) {
          socketService?.emitToUser(userId, 'lead:ai-enriched', socketData);
        } else {
          socketService?.emitToAll('lead:ai-enriched', socketData);
        }

        logger.info(`Successfully enriched companyId ${companyId}`);
        return { companyId, success: true } as JobResult;
      } catch (error: any) {
        // Emit error event to frontend
        const errorData = { leadId: companyId, error: error.message };
        if (userId) {
          socketService?.emitToUser(userId, 'lead:ai-enriched:error', errorData);
        } else {
          socketService?.emitToAll('lead:ai-enriched:error', errorData);
        }
        // Rethrow to allow BullMQ to handle retries/failure
        throw error;
      }
    },
    {
      connection: bullMQConnection,
      concurrency: 2,
    }
  );

  worker.on('error', (err) => {
    logger.error('AI Enrichment worker error', { error: err.message });
  });

  return worker;
}
