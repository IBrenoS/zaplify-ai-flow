/**
 * Proxy routes for microservices
 */

import { NextFunction, Request, Response, Router } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Proxy configuration for each microservice
const createServiceProxy = (target: string, pathRewrite?: { [key: string]: string }): Options => ({
  target,
  changeOrigin: true,
  pathRewrite,
  onError: (err, req, res) => {
    logger.error(`Proxy error for ${target}:`, err);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: target
      });
    }
  },
  onProxyReq: (proxyReq, req: AuthenticatedRequest) => {
    // Add user context to proxied requests
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.id);
      proxyReq.setHeader('X-User-Email', req.user.email);
      if (req.user.role) {
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
    }

    // Add correlation ID for tracing
    const correlationId = req.get('X-Correlation-ID') || generateCorrelationId();
    proxyReq.setHeader('X-Correlation-ID', correlationId);

    logger.debug(`Proxying ${req.method} ${req.url} to ${proxyReq.getHeader('host')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to proxied responses
    res.setHeader('Access-Control-Allow-Origin', config.CORS_ORIGINS.join(','));
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    logger.debug(`Proxy response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  }
});

// AI Service routes
router.use('/ai', createProxyMiddleware(createServiceProxy(
  config.SERVICES.AI_SERVICE,
  { '^/api/ai': '/api/v1' }
)));

// WhatsApp Service routes
router.use('/whatsapp', createProxyMiddleware(createServiceProxy(
  config.SERVICES.WHATSAPP_SERVICE,
  { '^/api/whatsapp': '/api/v1' }
)));

// Analytics Service routes
router.use('/analytics', createProxyMiddleware(createServiceProxy(
  config.SERVICES.ANALYTICS_SERVICE,
  { '^/api/analytics': '/api/v1' }
)));

// Funnel Service routes
router.use('/funnel', createProxyMiddleware(createServiceProxy(
  config.SERVICES.FUNNEL_SERVICE,
  { '^/api/funnel': '/api/v1' }
)));

// Direct routes for backward compatibility
router.use('/assistants', createProxyMiddleware(createServiceProxy(
  config.SERVICES.AI_SERVICE,
  { '^/api/assistants': '/api/v1/assistants' }
)));

router.use('/conversations', createProxyMiddleware(createServiceProxy(
  config.SERVICES.AI_SERVICE,
  { '^/api/conversations': '/api/v1/conversations' }
)));

// Utility function to generate correlation IDs
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Error handling for proxy routes
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Proxy route error:', err);

  if (!res.headersSent) {
    res.status(500).json({
      error: 'Proxy error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

export { router as proxyRoutes };
