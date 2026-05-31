import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/environment';
import { generalLimiter } from './middleware/rate-limit.middleware';
import { httpLogStream } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import leadRoutes from './routes/lead.routes';
import exportRoutes from './routes/export.routes';
import analyticsRoutes from './routes/analytics.routes';
import webhooksRoutes from './routes/webhooks.routes';
import crmRoutes from './routes/crm.routes';
import { db } from './database/pool';
import { getCacheRedis } from './config/redis';

const app = express();

// ============================================
// Security Middleware
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================
// Body Parsing & Utilities
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ============================================
// Logging
// ============================================
app.use(morgan('combined', { stream: httpLogStream }));

// ============================================
// Rate Limiting
// ============================================
app.use('/api/', generalLimiter);

// ============================================
// Health Check
// ============================================
app.get('/api/health', async (_req, res) => {
  const dbHealthy = await db.healthCheck();
  let redisHealthy = false;
  try {
    const redis = getCacheRedis();
    await redis.ping();
    redisHealthy = true;
  } catch {}

  res.json({
    success: true,
    data: {
      status: dbHealthy && redisHealthy ? 'healthy' : 'degraded',
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: env.APP_VERSION,
    },
  });
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/crm', crmRoutes);

// ============================================
// 404 Handler
// ============================================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ============================================
// Global Error Handler
// ============================================
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;
