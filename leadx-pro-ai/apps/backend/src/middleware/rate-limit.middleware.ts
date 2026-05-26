import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '@leadx/shared';
import { env } from '../config/environment';

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: env.NODE_ENV === 'development' ? 1000 : env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' ? 10000 : env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
});

/**
 * Strict limiter for auth endpoints (5 requests per 15 minutes)
 */
export const authLimiter = rateLimit({
  windowMs: env.NODE_ENV === 'development' ? 1000 : 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again in 15 minutes',
  },
});

/**
 * Scrape endpoint limiter (10 requests per minute)
 */
export const scrapeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many scrape requests, please try again in a minute',
  },
});

/**
 * Export endpoint limiter (5 requests per minute)
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many export requests, please try again in a minute',
  },
});
