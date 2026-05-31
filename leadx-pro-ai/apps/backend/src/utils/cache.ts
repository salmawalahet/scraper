import { getCacheRedis } from '../config/redis';
import { logger } from './logger';

/**
 * Get a cached value by key.
 * Returns null on miss or if Redis is unavailable.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getCacheRedis();
    if (redis.status !== 'ready') return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.debug(`Cache GET miss (key=${key})`, { error: err });
    return null;
  }
}

/**
 * Set a cached value with a TTL (in seconds).
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const redis = getCacheRedis();
    if (redis.status !== 'ready') return;
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(key, ttlSeconds, payload);
    logger.debug(`Cache SET (key=${key}, ttl=${ttlSeconds}s)`);
  } catch (err) {
    logger.debug(`Cache SET failed (key=${key})`, { error: err });
  }
}

/**
 * Invalidate all keys matching a glob pattern.
 * Uses SCAN + DEL to avoid blocking Redis (unlike KEYS).
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = getCacheRedis();
    if (redis.status !== 'ready') return;

    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.debug(`Cache INVALIDATED ${totalDeleted} key(s) matching "${pattern}"`);
    }
  } catch (err) {
    logger.error('Cache invalidation error', { pattern, error: err });
  }
}
