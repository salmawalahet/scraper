import { Router } from 'express';
import { exportController } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';
import { exportLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authenticate);

router.post('/', exportLimiter, (req, res) => exportController.create(req, res));
router.get('/', (req, res) => exportController.list(req, res));
router.get('/:id/download', (req, res) => exportController.download(req, res));
router.delete('/:id', (req, res) => exportController.delete(req, res));

export default router;
