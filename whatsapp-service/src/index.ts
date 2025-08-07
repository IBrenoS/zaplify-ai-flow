/**
 * Zaplify WhatsApp Service
 * Handles WhatsApp integration using whatsapp-web.js
 */

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import { config } from './config';
import { healthRoutes } from './routes/health';
import { whatsappRoutes } from './routes/whatsapp';
import { WhatsAppManager } from './services/whatsappManager';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize WhatsApp Manager
const whatsappManager = new WhatsAppManager();

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes(whatsappManager));

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('WhatsApp Service error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = config.PORT || 8001;

app.listen(PORT, () => {
  logger.info(`🚀 WhatsApp Service running on port ${PORT}`);
  logger.info(`📱 Environment: ${config.NODE_ENV}`);

  // Initialize WhatsApp clients
  whatsappManager.initialize();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  whatsappManager.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  whatsappManager.destroy();
  process.exit(0);
});

export { app, whatsappManager };
