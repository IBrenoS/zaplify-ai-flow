/**
 * Zaplify AI Flow - API Gateway
 * Central routing and authentication service
 */

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { healthRoutes } from './routes/health';
import { proxyRoutes } from './routes/proxy';
import { logger } from './utils/logger';
import { setupWebSocket } from './websocket';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.CORS_ORIGINS,
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...config.ALLOWED_ORIGINS],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api', authMiddleware);
app.use('/api', proxyRoutes);

// WebSocket setup
setupWebSocket(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
const PORT = config.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`📡 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 CORS origins: ${config.CORS_ORIGINS.join(', ')}`);

  // Log service endpoints
  logger.info('🎯 Microservices:');
  logger.info(`   IA Service: ${config.SERVICES.AI_SERVICE}`);
  logger.info(`   WhatsApp Service: ${config.SERVICES.WHATSAPP_SERVICE}`);
  logger.info(`   Analytics Service: ${config.SERVICES.ANALYTICS_SERVICE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app, io, server };
