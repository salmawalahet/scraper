import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { registerSchema, loginSchema, refreshSchema } from '../validations/auth.validation';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), (req, res) => authController.register(req, res));
router.post('/login', authLimiter, validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', validate(refreshSchema), (req, res) => authController.refresh(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.get('/profile', authenticate, (req, res) => authController.profile(req, res));

export default router;
