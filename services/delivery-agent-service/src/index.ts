import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/config';
import { connectDatabase } from './config/database';
import { getKafkaProducer, initializeKafka } from './config/kafka';
import { connectRedis } from './config/redis';
import { swaggerSpec } from './config/swagger';
import { logger } from './utils/logger';

// Import services
import { DeliveryAgentService } from './services/DeliveryAgentService';
import { DeliveryOrderService } from './services/DeliveryOrderService';

// Import controllers
import { DeliveryAgentController } from './controllers/DeliveryAgentController';
import { DeliveryOrderController } from './controllers/DeliveryOrderController';

// Import routes
import { createAgentRoutes } from './routes/agentRoutes';
import { createOrderRoutes } from './routes/orderRoutes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

class DeliveryAgentApp {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url} - ${req.ip}`);
      next();
    });
  }

  private async setupRoutes(): Promise<void> {
    try {
      // Connect to database
      const db = await connectDatabase();
      logger.info('Database connected successfully');

      // Connect to Redis
      await connectRedis();
      logger.info('Redis connected successfully');

      // Initialize Kafka producer
      const kafkaProducer = await getKafkaProducer();
      logger.info('Kafka producer connected successfully');

      // Initialize services
      const deliveryAgentService = new DeliveryAgentService(db, kafkaProducer);
      const deliveryOrderService = new DeliveryOrderService(db, kafkaProducer);

      // Initialize controllers
      const deliveryAgentController = new DeliveryAgentController(deliveryAgentService);
      const deliveryOrderController = new DeliveryOrderController(deliveryOrderService);

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.status(200).json({
          status: 'healthy',
          service: 'delivery-agent-service',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      });

      // API documentation
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

      // API routes
      this.app.use('/api/agents', createAgentRoutes(deliveryAgentController));
      this.app.use('/api/orders', createOrderRoutes(deliveryOrderController));

      // 404 handler
      this.app.use(notFoundHandler);

      // Error handling middleware
      this.app.use(errorHandler);

      logger.info('Routes setup completed');
    } catch (error) {
      logger.error('Failed to setup routes:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      // Initialize Kafka first
      await initializeKafka();
      
      await this.setupRoutes();

      this.server = createServer(this.app);

      this.server.listen(config.port, () => {
        logger.info(`🚀 Delivery Agent Service running on port ${config.port}`);
        logger.info(`📚 API Documentation: http://localhost:${config.port}/api-docs`);
        logger.info(`🏥 Health Check: http://localhost:${config.port}/health`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the application
const app = new DeliveryAgentApp();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default app;
