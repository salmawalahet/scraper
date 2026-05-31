import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { authenticate } from '../middleware/auth.middleware';
import { getCache, setCache } from '../utils/cache';
import { db } from '../database/pool';
import { RowDataPacket } from 'mysql2/promise';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate);

// GET /api/leads/metadata — cached aggregate data (categories, priorities, etc.)
router.get('/metadata', async (req, res) => {
  try {
    const userId = (req as any).user!.userId;
    const cacheKey = `leads:metadata:${userId}`;

    const cached = await getCache<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json({ success: true, data: cached });
      return;
    }

    // Distinct categories
    const [catRows] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT COALESCE(sc.category, 'Uncategorized') as value
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL
       ORDER BY value`,
      [userId],
    );

    // Distinct priorities
    const [priRows] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT sc.lead_priority as value
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL AND sc.lead_priority IS NOT NULL
       ORDER BY value`,
      [userId],
    );

    // Verification status counts
    const [verRows] = await db.query<RowDataPacket[]>(
      `SELECT sc.verification_status as status, COUNT(*) as count
       FROM scraped_companies sc
       JOIN scrape_jobs sj ON sc.job_id = sj.id
       WHERE sj.user_id = ? AND sc.deleted_at IS NULL
       GROUP BY sc.verification_status`,
      [userId],
    );

    const metadata = {
      categories: catRows.map((r) => r.value),
      priorities: priRows.map((r) => r.value),
      verificationCounts: verRows.map((r) => ({ status: r.status, count: Number(r.count) })),
    };

    await setCache(cacheKey, metadata, 300); // 5 min TTL
    res.setHeader('X-Cache', 'MISS');
    res.json({ success: true, data: metadata });
  } catch (error) {
    logger.error('Get leads metadata failed', { error });
    res.status(500).json({ success: false, error: 'Failed to load leads metadata' });
  }
});

router.get('/', (req, res) => leadController.search(req, res));
router.get('/categories', (req, res) => leadController.getCategories(req, res));
router.get('/:id', (req, res) => leadController.getById(req, res));
router.post('/bulk', (req, res) => leadController.bulkAction(req, res));
router.post('/:id/ai-enrich', (req, res) => leadController.aiEnrich(req, res));

export default router;
