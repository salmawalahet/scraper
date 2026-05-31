import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { crmService } from '../services/crm/crm.service';
import { verifyHubSpotToken, pushLeadToHubSpot } from '../services/crm/hubspot';
import { companyService } from '../services/company.service';
import { CrmProvider } from '@leadx/shared';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate);

/**
 * POST /api/crm/hubspot/connect — verify token & save connection
 */
router.post('/hubspot/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accessToken } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      res.status(400).json({ success: false, error: 'accessToken is required' });
      return;
    }

    // Verify the token with HubSpot
    const verification = await verifyHubSpotToken(accessToken);
    if (!verification.valid) {
      res.status(401).json({ success: false, error: 'Invalid HubSpot access token' });
      return;
    }

    // Save the connection
    await crmService.saveConnection(userId, CrmProvider.HUBSPOT, accessToken);

    res.json({
      success: true,
      message: 'HubSpot connected successfully',
      data: { provider: 'hubspot', user: verification.user },
    });
  } catch (error: any) {
    logger.error('HubSpot connect error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/crm/hubspot/connect — remove connection
 */
router.delete('/hubspot/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deleted = await crmService.deleteByUserId(userId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'No CRM connection found' });
      return;
    }

    res.json({ success: true, message: 'HubSpot disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/crm/export/hubspot — bulk push leads to HubSpot
 */
router.post('/export/hubspot', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ success: false, error: 'leadIds array is required' });
      return;
    }

    // Get CRM connection
    const connection = await crmService.findByUserId(userId);
    if (!connection || connection.provider !== CrmProvider.HUBSPOT) {
      res.status(400).json({ success: false, error: 'No HubSpot connection found. Please connect first.' });
      return;
    }

    // Fetch leads
    const leads = await companyService.findByIds(leadIds);
    if (leads.length === 0) {
      res.status(404).json({ success: false, error: 'No leads found for the provided IDs' });
      return;
    }

    let success = 0;
    let failed = 0;
    const errors: { leadId: number; error: string }[] = [];

    for (const lead of leads) {
      try {
        await pushLeadToHubSpot(connection.access_token, lead);
        success++;
      } catch (error: any) {
        failed++;
        errors.push({ leadId: lead.id, error: error.message });
        logger.warn(`HubSpot export failed for lead ${lead.id}`, { error: error.message });
      }
    }

    res.json({
      success: true,
      data: { success, failed, total: leads.length, errors },
    });
  } catch (error: any) {
    logger.error('HubSpot export error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
