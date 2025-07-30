import { config } from './config';
import { logger } from '../utils/logger';

let redisClient: any;

export async function connectRedis(): Promise<any> {
  try {
    const IORedis = require('ioredis');
    redisClient = new IORedis(config.redis.url, {
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error: Error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('ready', () => {
      logger.info('Redis is ready to receive commands');
    });

    // Test the connection
    await redisClient.ping();

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): any {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call connectRedis first.');
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

// Helper functions for caching
export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  try {
    const client = getRedisClient();
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  } catch (error) {
    logger.error('Error setting cache:', error);
    // Don't throw error to prevent cache failures from breaking the app
  }
}

export async function getCache(key: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error('Error getting cache:', error);
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.error('Error deleting cache:', error);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    logger.error('Error deleting cache pattern:', error);
  }
}
