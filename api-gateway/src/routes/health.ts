/**
 * Health check routes
 */

import { Request, Response, Router } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0',
    environment: config.NODE_ENV
  });
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0',
    environment: config.NODE_ENV,
    services: {
      ai_service: await checkServiceHealth(config.SERVICES.AI_SERVICE),
      whatsapp_service: await checkServiceHealth(config.SERVICES.WHATSAPP_SERVICE),
      analytics_service: await checkServiceHealth(config.SERVICES.ANALYTICS_SERVICE),
      funnel_service: await checkServiceHealth(config.SERVICES.FUNNEL_SERVICE)
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    uptime: Math.round(process.uptime())
  };

  const allServicesHealthy = Object.values(healthCheck.services).every(
    service => service.status === 'healthy'
  );

  const statusCode = allServicesHealthy ? 200 : 503;

  res.status(statusCode).json(healthCheck);
});

// Check individual service health
async function checkServiceHealth(serviceUrl: string): Promise<{
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();

    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'healthy',
        responseTime
      };
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}`
      };
    }

  } catch (error) {
    logger.warn(`Health check failed for ${serviceUrl}:`, error);
    return {
      status: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { router as healthRoutes };
