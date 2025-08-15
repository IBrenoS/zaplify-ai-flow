import { Router } from 'express';

import { createAuthMiddleware } from '../middlewares/auth.js';
import { ProxyService } from '../services/index.js';
import { logger } from '../utils/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/ai/conversation:
 *   post:
 *     summary: Proxy para IA Conversational
 *     description: |
 *       Faz proxy das requisições para o serviço de IA Conversacional.
 *
 *       **Recursos:**
 *       - Timeout de 5 segundos
 *       - Propagação automática de headers
 *       - Logs estruturados para auditoria
 *       - Error handling com 502 Bad Gateway
 *
 *       **Requer autenticação** com escopo `ai:conversation`.
 *     tags:
 *       - Proxy Routes - IA
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Mensagem do usuário para a IA
 *                 example: "Olá, como você pode me ajudar?"
 *               context:
 *                 type: object
 *                 description: Contexto adicional para a conversa
 *                 properties:
 *                   user_id:
 *                     type: string
 *                     example: "user123"
 *                   conversation_id:
 *                     type: string
 *                     example: "conv_456"
 *           examples:
 *             simpleMessage:
 *               summary: Mensagem simples
 *               value:
 *                 message: "Qual é o tempo hoje?"
 *             messageWithContext:
 *               summary: Mensagem com contexto
 *               value:
 *                 message: "Continue nossa conversa anterior"
 *                 context:
 *                   user_id: "user123"
 *                   conversation_id: "conv_456"
 *     responses:
 *       200:
 *         description: Resposta da IA obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProxyResponse'
 *             example:
 *               data:
 *                 ok: true
 *                 status: 200
 *                 data:
 *                   conversation_id: "conv_12345"
 *                   response: "Olá! Posso ajudá-lo com informações, análises e tarefas diversas."
 *                   timestamp: "2025-08-11T23:00:00Z"
 *                 correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 tenant_id: "acme-corp"
 *                 responseTime: 150
 *                 success: true
 *       401:
 *         description: Token JWT inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "Missing Authorization header"
 *               timestamp: "2025-08-11T23:00:00.000Z"
 *               correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               tenant_id: "default"
 *       403:
 *         description: Escopo insuficiente para acessar o recurso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "Insufficient permissions"
 *               required_scopes: ["ai:conversation"]
 *               user_scopes: ["ai:read"]
 *               timestamp: "2025-08-11T23:00:00.000Z"
 *               correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               tenant_id: "acme-corp"
 *       502:
 *         description: Serviço de IA indisponível
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "AI service unavailable"
 *               timestamp: "2025-08-11T23:00:00.000Z"
 *               correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               tenant_id: "acme-corp"
 */
router.post('/ai/conversation', createAuthMiddleware(['ai:conversation']), async (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('AI conversation proxy request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method,
    bodySize: JSON.stringify(req.body).length
  });

  try {
    const serviceUrl = process.env.AI_SERVICE_URL || 'http://ia-conversational:8001';
    const targetUrl = `${serviceUrl}/conversation`;

    const proxyResult = await ProxyService.proxyRequest({
      method: 'POST',
      url: targetUrl,
      body: req.body,
      headers: req.headers as Record<string, string>,
      tenantId,
      correlationId,
      config: {
        timeout: 5000,
        propagateHeaders: ['authorization', 'content-type', 'x-correlation-id', 'x-tenant-id']
      }
    });

    if (proxyResult.success) {
      const response = ProxyService.createSuccessResponse(
        proxyResult.data,
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(proxyResult.status).json(response);
    } else {
      const errorResponse = ProxyService.createBadGatewayResponse(
        proxyResult.error || 'AI service unavailable',
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(502).json(errorResponse.data);
    }
  } catch (error) {
    logger.error('AI conversation proxy error', tenantId, correlationId, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(502).json({
      ok: false,
      error: 'AI service unavailable',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

/**
 * @swagger
 * /api/v1/whatsapp/status:
 *   get:
 *     summary: Proxy para WhatsApp Status
 *     description: |
 *       Obtém o status de conexão do serviço WhatsApp.
 *
 *       **Recursos:**
 *       - Verifica conexão com WhatsApp Business API
 *       - Status do webhook e última atividade
 *       - Timeout de 5 segundos
 *       - Propagação automática de headers
 *
 *       **Requer autenticação** com escopo `whatsapp:read`.
 *     tags:
 *       - Proxy Routes - WhatsApp
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *     responses:
 *       200:
 *         description: Status do WhatsApp obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProxyResponse'
 *             example:
 *               data:
 *                 ok: true
 *                 status: 200
 *                 data:
 *                   status: "connected"
 *                   webhook_verified: true
 *                   last_activity: "2025-08-11T23:00:00Z"
 *                   phone_number: "+5511999999999"
 *                   business_account_id: "123456789"
 *                 correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 tenant_id: "acme-corp"
 *                 responseTime: 89
 *                 success: true
 *       401:
 *         description: Token JWT inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Escopo insuficiente para acessar o recurso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Serviço WhatsApp indisponível
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "WhatsApp service unavailable"
 *               timestamp: "2025-08-11T23:00:00.000Z"
 *               correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               tenant_id: "acme-corp"
 */
router.get('/whatsapp/status', createAuthMiddleware(['whatsapp:read']), async (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('WhatsApp status proxy request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method
  });

  try {
    const serviceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://whatsapp-service:8081';
    const targetUrl = `${serviceUrl}/status`;

    const proxyResult = await ProxyService.proxyRequest({
      method: 'GET',
      url: targetUrl,
      headers: req.headers as Record<string, string>,
      tenantId,
      correlationId,
      config: {
        timeout: 5000,
        propagateHeaders: ['authorization', 'x-correlation-id', 'x-tenant-id']
      }
    });

    if (proxyResult.success) {
      const response = ProxyService.createSuccessResponse(
        proxyResult.data,
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(proxyResult.status).json(response);
    } else {
      const errorResponse = ProxyService.createBadGatewayResponse(
        proxyResult.error || 'WhatsApp service unavailable',
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(502).json(errorResponse.data);
    }
  } catch (error) {
    logger.error('WhatsApp status proxy error', tenantId, correlationId, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(502).json({
      ok: false,
      error: 'WhatsApp service unavailable',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

/**
 * @swagger
 * /api/v1/funnel/execute:
 *   post:
 *     summary: Proxy para Funnel Engine
 *     description: |
 *       Executa um funil de automação no Funnel Engine.
 *
 *       **Recursos:**
 *       - Execução de funis com trigger personalizado
 *       - Rastreamento de steps e status de execução
 *       - Timeout de 5 segundos
 *       - Propagação automática de headers
 *
 *       **Requer autenticação** com escopo `funnel:execute`.
 *     tags:
 *       - Proxy Routes - Funnel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - funnel_id
 *             properties:
 *               funnel_id:
 *                 type: string
 *                 description: ID do funil a ser executado
 *                 example: "funnel_12345"
 *               trigger_data:
 *                 type: object
 *                 description: Dados que disparam o funil
 *                 properties:
 *                   user_id:
 *                     type: string
 *                     example: "user123"
 *                   lead_id:
 *                     type: string
 *                     example: "lead456"
 *                   event_type:
 *                     type: string
 *                     example: "form_submitted"
 *                   custom_data:
 *                     type: object
 *                     example: { "source": "website", "campaign": "summer2025" }
 *           examples:
 *             leadCapture:
 *               summary: Captura de lead
 *               value:
 *                 funnel_id: "lead_nurturing_001"
 *                 trigger_data:
 *                   user_id: "user123"
 *                   lead_id: "lead456"
 *                   event_type: "form_submitted"
 *                   custom_data:
 *                     source: "landing_page"
 *                     campaign: "summer2025"
 *             purchaseFlow:
 *               summary: Fluxo de compra
 *               value:
 *                 funnel_id: "purchase_flow_002"
 *                 trigger_data:
 *                   user_id: "user789"
 *                   event_type: "cart_abandoned"
 *                   custom_data:
 *                     cart_value: 150.50
 *                     products: ["prod1", "prod2"]
 *     responses:
 *       200:
 *         description: Funil executado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProxyResponse'
 *             example:
 *               data:
 *                 ok: true
 *                 status: 200
 *                 data:
 *                   execution_id: "exec_67890"
 *                   funnel_id: "funnel_12345"
 *                   status: "running"
 *                   steps_completed: 0
 *                   total_steps: 5
 *                   estimated_completion: "2025-08-11T23:15:00Z"
 *                 correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 tenant_id: "acme-corp"
 *                 responseTime: 234
 *                 success: true
 *       401:
 *         description: Token JWT inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Escopo insuficiente para acessar o recurso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Funnel Engine indisponível
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "Funnel service unavailable"
 *               timestamp: "2025-08-11T23:00:00.000Z"
 *               correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               tenant_id: "acme-corp"
 */
router.post('/funnel/execute', createAuthMiddleware(['funnel:execute']), async (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('Funnel execution proxy request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method,
    bodySize: JSON.stringify(req.body).length
  });

  try {
    const serviceUrl = process.env.FUNNEL_ENGINE_URL || 'http://funnel-engine:8082';
    const targetUrl = `${serviceUrl}/funnel/execute`;

    const proxyResult = await ProxyService.proxyRequest({
      method: 'POST',
      url: targetUrl,
      body: req.body,
      headers: req.headers as Record<string, string>,
      tenantId,
      correlationId,
      config: {
        timeout: 5000,
        propagateHeaders: ['authorization', 'content-type', 'x-correlation-id', 'x-tenant-id']
      }
    });

    if (proxyResult.success) {
      const response = ProxyService.createSuccessResponse(
        proxyResult.data,
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(proxyResult.status).json(response);
    } else {
      const errorResponse = ProxyService.createBadGatewayResponse(
        proxyResult.error || 'Funnel service unavailable',
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(502).json(errorResponse.data);
    }
  } catch (error) {
    logger.error('Funnel execution proxy error', tenantId, correlationId, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(502).json({
      ok: false,
      error: 'Funnel service unavailable',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/real-time:
 *   get:
 *     summary: Proxy para Analytics Real-time
 *     description: |
 *       Obtém dados analíticos em tempo real do serviço de Analytics.
 *
 *       **Recursos:**
 *       - Métricas em tempo real de usuários ativos
 *       - Conversas ativas e mensagens por minuto
 *       - Dados atualizados a cada minuto
 *       - Timeout de 5 segundos
 *
 *       **Requer autenticação** com escopo `analytics:read`.
 *     tags:
 *       - Proxy Routes - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *       - name: timeRange
 *         in: query
 *         description: Intervalo de tempo para as métricas
 *         required: false
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 1h
 *           example: "24h"
 *       - name: metrics
 *         in: query
 *         description: Métricas específicas a serem retornadas
 *         required: false
 *         schema:
 *           type: string
 *           example: "users,conversations,messages"
 *     responses:
 *       200:
 *         description: Dados analíticos obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProxyResponse'
 *             example:
 *               data:
 *                 ok: true
 *                 status: 200
 *                 data:
 *                   active_users: 145
 *                   active_conversations: 23
 *                   messages_per_minute: 67
 *                   timestamp: "2025-08-11T23:00:00Z"
 *                   trends:
 *                     users_trend: "+12%"
 *                     conversations_trend: "+5%"
 *                     messages_trend: "-3%"
 *                   top_channels:
 *                     - channel: "whatsapp"
 *                       percentage: 78
 *                     - channel: "webchat"
 *                       percentage: 22
 *                 correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 tenant_id: "acme-corp"
 *                 responseTime: 98
 *                 success: true
 *       401:
 *         description: Token JWT inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Escopo insuficiente para acessar o recurso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Serviço Analytics indisponível
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "Analytics service unavailable"
 *               timestamp: "2025-08-11T23:00:00.000Z"
 *               correlation_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               tenant_id: "acme-corp"
 */
router.get('/analytics/real-time', createAuthMiddleware(['analytics:read']), async (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('Analytics real-time proxy request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method
  });

  try {
    const serviceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8002';
    const targetUrl = `${serviceUrl}/analytics/real-time`;

    const proxyResult = await ProxyService.proxyRequest({
      method: 'GET',
      url: targetUrl,
      headers: req.headers as Record<string, string>,
      tenantId,
      correlationId,
      config: {
        timeout: 5000,
        propagateHeaders: ['authorization', 'x-correlation-id', 'x-tenant-id']
      }
    });

    if (proxyResult.success) {
      const response = ProxyService.createSuccessResponse(
        proxyResult.data,
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(proxyResult.status).json(response);
    } else {
      const errorResponse = ProxyService.createBadGatewayResponse(
        proxyResult.error || 'Analytics service unavailable',
        correlationId,
        tenantId,
        proxyResult.responseTime
      );
      res.status(502).json(errorResponse.data);
    }
  } catch (error) {
    logger.error('Analytics real-time proxy error', tenantId, correlationId, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(502).json({
      ok: false,
      error: 'Analytics service unavailable',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

export default router;
