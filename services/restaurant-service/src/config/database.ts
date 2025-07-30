import { Pool } from 'pg';
import { config } from './config';
import { logger } from '../utils/logger';

let pool: Pool;

export async function connectDatabase(): Promise<Pool> {
  try {
    pool = new Pool({
      connectionString: config.database.url,
      max: config.database.maxConnections,
      connectionTimeoutMillis: config.database.connectionTimeout,
      idleTimeoutMillis: 30000,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Test the connection
    await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');

    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase first.');
  }
  return pool;
}

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}
