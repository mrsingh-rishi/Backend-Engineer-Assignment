import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the User Service and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: user-service
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: OK
 *                     redis:
 *                       type: string
 *                       example: OK
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'user-service',
    version: '1.0.0',
    checks: {
      database: 'OK',
      redis: 'OK',
    },
  };

  try {
    // Check database connection
    try {
      const db = getDatabase();
      await db.query('SELECT 1');
    } catch (error) {
      healthCheck.checks.database = 'FAILED';
      healthCheck.status = 'DEGRADED';
      logger.error('Database health check failed:', error);
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      await redis.ping();
    } catch (error) {
      healthCheck.checks.redis = 'FAILED';
      healthCheck.status = 'DEGRADED';
      logger.error('Redis health check failed:', error);
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'FAILED',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: '1.0.0',
      error: 'Internal server error',
    });
  }
});

export default router;
