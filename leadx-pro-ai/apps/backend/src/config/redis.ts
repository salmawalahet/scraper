import Redis from 'ioredis';
import { env } from './environment';
import { logger } from '../utils/logger';

export const createRedisConnection = (): Redis => {
  const redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      return Math.min(times * 200, 5000);
    },
  });

  redis.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return redis;
};

// Singleton Redis instance for caching
let cacheRedis: Redis | null = null;

export const getCacheRedis = (): Redis => {
  if (!cacheRedis) {
    cacheRedis = createRedisConnection();
  }
  return cacheRedis;
};

/**
 * Redis cache helper with automatic serialization
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getCacheRedis();
      if (redis.status !== 'ready') return null;
      const value = await redis.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (err) {
      logger.debug(`Cache get failed for key: ${key}, falling back to DB`, { error: err });
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      const redis = getCacheRedis();
      if (redis.status !== 'ready') return;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
    } catch (err) {
      logger.debug(`Cache set failed for key: ${key}`, { error: err });
    }
  },

  async del(key: string): Promise<void> {
    try {
      const redis = getCacheRedis();
      if (redis.status !== 'ready') return;
      await redis.del(key);
    } catch (err) {
      logger.debug(`Cache del failed for key: ${key}`, { error: err });
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const redis = getCacheRedis();
      if (redis.status !== 'ready') return;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      logger.debug(`Cache delPattern failed for pattern: ${pattern}`, { error: err });
    }
  },

  async flush(): Promise<void> {
    try {
      const redis = getCacheRedis();
      if (redis.status !== 'ready') return;
      await redis.flushdb();
    } catch (err) {
      logger.debug('Cache flush failed', { error: err });
    }
  },
};

export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
};
