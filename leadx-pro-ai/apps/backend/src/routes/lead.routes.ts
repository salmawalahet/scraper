import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => leadController.search(req, res));
router.get('/categories', (req, res) => leadController.getCategories(req, res));
router.get('/:id', (req, res) => leadController.getById(req, res));
router.post('/bulk', (req, res) => leadController.bulkAction(req, res));

export default router;
