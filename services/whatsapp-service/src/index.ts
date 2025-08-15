import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { setupSwagger } from './config/swagger.js';
import { mongoConnection } from './db/mongo.js';
import { kafkaService } from './events/kafka.js';
import { correlationMiddleware } from './middlewares/correlation.js';
import conversationsRoutes from './routes/conversations.js';
import healthRoutes from './routes/health.js';
import mediaRoutes from './routes/media.js';
import messagesRoutes from './routes/messages.js';
import sessionsRoutes from './routes/sessions.js';
import webhookRoutes from './routes/webhooks.js';
import { idempotencyService } from './services/idempotency.js';
import { AppError } from './utils/errors.js';

async function bootstrap() {
  const app = express();

  // Initialize services
  try {
    // Connect to MongoDB
    await mongoConnection.connect();

    if (config.ENABLE_KAFKA) {
      await kafkaService.connect();
    }

    // Initialize Redis-based idempotency service if Redis is configured
    if (config.REDIS_URL && idempotencyService.connect) {
      await idempotencyService.connect();
    }
  } catch (error) {
    logger.warn({
      msg: 'Failed to initialize some services, continuing with fallbacks',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Middleware básico
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware de correlação
  app.use(correlationMiddleware);

  // Setup Swagger documentation
  setupSwagger(app);

  // Rotas
  app.use(healthRoutes);
  app.use('/sessions', sessionsRoutes);
  app.use('/messages', messagesRoutes);
  app.use('/conversations', conversationsRoutes);
  app.use('/media', mediaRoutes);
  app.use(webhookRoutes); // Webhook routes at root level

  // Error handler
  app.use((error: Error, req: express.Request, res: express.Response) => {
    if (error instanceof AppError) {
      req.logger.warn({
        msg: 'Application error',
        error: error.message,
        statusCode: error.statusCode,
      });

      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    req.logger.error({
      msg: 'Unhandled error',
      error: error.message,
      stack: error.stack,
    });

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
    });
  });

  // 404 handler
  app.use('*', (req: express.Request, res: express.Response) => {
    req.logger.warn({
      msg: 'Route not found',
      path: req.path,
      method: req.method,
    });

    res.status(StatusCodes.NOT_FOUND).json({
      error: 'Route not found',
    });
  });

  // Iniciar servidor
  const PORT = config.PORT;
  const server = app.listen(PORT, () => {
    logger.info({
      msg: 'WhatsApp Service started',
      port: PORT,
      env: config.NODE_ENV,
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info({ msg: `Received ${signal}, shutting down gracefully` });

    // Close services
    try {
      // Disconnect from MongoDB
      await mongoConnection.disconnect();

      // if (config.ENABLE_KAFKA) {
      //   await kafkaService.disconnect();
      // }
      // if (idempotencyService.disconnect) {
      //   await idempotencyService.disconnect();
      // }
    } catch (error) {
      logger.error({
        msg: 'Error during service shutdown',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    server.close(() => {
      logger.info('Server shut down complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Iniciar aplicação
bootstrap().catch((error) => {
  logger.error({
    msg: 'Failed to start server',
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
