import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_NAME: z.string().default('LeadX Pro AI'),
  APP_VERSION: z.string().default('1.0.0'),

  // MySQL
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('leadx_pro_ai'),
  DB_CONNECTION_LIMIT: z.coerce.number().default(20),
  DB_QUEUE_LIMIT: z.coerce.number().default(0),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.coerce.number().default(0),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Scraper
  SCRAPER_CONCURRENCY: z.coerce.number().default(3),
  SCRAPER_TIMEOUT: z.coerce.number().default(30000),
  SCRAPER_MAX_RETRIES: z.coerce.number().default(3),
  SCRAPER_BROWSER: z.enum(['puppeteer', 'playwright']).default('puppeteer'),

  // Logging
  LOG_LEVEL: z.string().default('debug'),
  LOG_DIR: z.string().default('./logs'),

  // Export
  EXPORT_DIR: z.string().default('./exports'),

  // Integrations
  GOOGLE_SHEETS_API_KEY: z.string().default(''),
  HUBSPOT_API_KEY: z.string().default(''),
  ZOHO_API_KEY: z.string().default(''),
  WEBHOOK_SECRET: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
