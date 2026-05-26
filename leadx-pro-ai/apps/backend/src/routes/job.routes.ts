import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { authenticate } from '../middleware/auth.middleware';
import { scrapeLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);

router.post('/', scrapeLimiter, (req, res) => jobController.create(req, res));
router.get('/', (req, res) => jobController.list(req, res));
router.get('/stats', (req, res) => jobController.getStats(req, res));
router.get('/:id', (req, res) => jobController.getById(req, res));
router.post('/:id/pause', (req, res) => jobController.pause(req, res));
router.post('/:id/resume', (req, res) => jobController.resume(req, res));
router.post('/:id/cancel', (req, res) => jobController.cancel(req, res));
router.post('/:id/retry', (req, res) => jobController.retry(req, res));
router.delete('/:id', (req, res) => jobController.delete(req, res));

export default router;
