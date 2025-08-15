import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { correlationMiddleware } from './middlewares/correlation.js';
import healthRoutes from './routes/health.js';
import { AppError } from './utils/errors.js';

async function bootstrap() {
  const app = express();

  // Middleware básico
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware de correlação
  app.use(correlationMiddleware);

  // Rotas
  app.use(healthRoutes);

  // Error handler
  app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
  const gracefulShutdown = (signal: string) => {
    logger.info({ msg: `Received ${signal}, shutting down gracefully` });

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
