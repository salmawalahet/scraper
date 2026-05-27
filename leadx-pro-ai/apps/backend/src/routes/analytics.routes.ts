import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', (req, res) => analyticsController.getDashboard(req, res));
router.get('/lead-trends', (req, res) => analyticsController.getLeadTrends(req, res));
router.get('/jobs', (req, res) => analyticsController.getJobAnalytics(req, res));
router.get('/exports', (req, res) => analyticsController.getExportAnalytics(req, res));
router.get('/quality', (req, res) => analyticsController.getQualityDistribution(req, res));
router.get('/activity', (req, res) => analyticsController.getRecentActivity(req, res));
router.get('/query-wise', (req, res) => analyticsController.getQueryWiseStats(req, res));
router.get('/query-wise/:jobId/export', (req, res) => analyticsController.exportQueryWise(req, res));

export default router;

