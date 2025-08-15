import { Router } from 'express';

import { createAuthMiddleware } from '../middlewares/auth.js';
import { logger } from '../utils/index.js';

import proxyRouter from './proxy.js';
import websocketRouter from './websocket.js';

const router = Router();

// Rotas WebSocket
router.use(websocketRouter);

// Rotas de Proxy para serviços downstream
router.use(proxyRouter);

/**
 * POST /api/v1/whatsapp/send-message
 * Rota para envio de mensagens WhatsApp
 * Requer scopes: ['whatsapp:send', 'whatsapp:write'] ou ['whatsapp:admin']
 */
router.post('/whatsapp/send-message', createAuthMiddleware(['whatsapp:send']), (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('WhatsApp send message request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method,
    bodySize: JSON.stringify(req.body).length
  });

  // TODO: Implementar proxy para whatsapp-service
  res.json({
    ok: true,
    message: 'WhatsApp send message endpoint',
    data: {
      message_id: `msg_${Date.now()}`,
      status: 'queued',
      tenant_id: tenantId,
      user_id: userId
    },
    timestamp: new Date().toISOString(),
    correlation_id: correlationId
  });
});

/**
 * POST /api/v1/analytics/export
 * Rota para exportação de analytics
 * Requer scopes: ['analytics:export', 'analytics:read'] ou ['analytics:admin']
 */
router.post('/analytics/export', createAuthMiddleware(['analytics:export']), (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('Analytics export request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method,
    bodySize: JSON.stringify(req.body).length
  });

  // TODO: Implementar proxy para analytics-service
  res.json({
    ok: true,
    message: 'Analytics export endpoint',
    data: {
      export_id: `exp_${Date.now()}`,
      status: 'processing',
      tenant_id: tenantId,
      user_id: userId
    },
    timestamp: new Date().toISOString(),
    correlation_id: correlationId
  });
});

export default router;
