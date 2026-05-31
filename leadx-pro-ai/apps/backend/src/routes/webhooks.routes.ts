import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { webhookService } from '../services/webhooks/webhook.service';
import { WebhookEvent } from '@leadx/shared';

const router = Router();

router.use(authenticate);

/**
 * GET /api/webhooks — list user's endpoints
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const endpoints = await webhookService.findByUserId(userId);
    res.json({ success: true, data: endpoints });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks — create a new endpoint
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { url, events } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: 'URL is required' });
      return;
    }

    try {
      new URL(url);
    } catch {
      res.status(400).json({ success: false, error: 'Invalid URL format' });
      return;
    }

    // Validate events
    const validEvents = Object.values(WebhookEvent) as string[];
    const eventList: string[] = events && Array.isArray(events) ? events : validEvents;
    const invalidEvents = eventList.filter((e) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({ success: false, error: `Invalid events: ${invalidEvents.join(', ')}` });
      return;
    }

    const endpoint = await webhookService.create(userId, url, eventList);
    res.status(201).json({ success: true, data: endpoint });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/webhooks/:id — delete an endpoint
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const endpointId = parseInt(req.params.id, 10);

    if (isNaN(endpointId)) {
      res.status(400).json({ success: false, error: 'Invalid endpoint ID' });
      return;
    }

    const deleted = await webhookService.delete(endpointId, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Webhook endpoint not found' });
      return;
    }

    res.json({ success: true, message: 'Webhook endpoint deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/webhooks/:id/deliveries — list recent delivery logs
 */
router.get('/:id/deliveries', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const endpointId = parseInt(req.params.id, 10);

    if (isNaN(endpointId)) {
      res.status(400).json({ success: false, error: 'Invalid endpoint ID' });
      return;
    }

    const deliveries = await webhookService.getDeliveries(endpointId, userId);
    res.json({ success: true, data: deliveries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
