import { Router } from 'express';

import { createAuthMiddleware } from '../middlewares/auth.js';
import { WebSocketService } from '../services/index.js';
import { logger } from '../utils/index.js';

const router = Router();

/**
 * @swagger
 * /api/v1/websocket/stats/public:
 *   get:
 *     summary: Estatísticas WebSocket (Público)
 *     description: |
 *       Obtém estatísticas básicas das conexões WebSocket ativas.
 *
 *       **Recursos:**
 *       - Número total de conexões ativas
 *       - Distribuição por tenant
 *       - Tempo de última atividade
 *       - **Não requer autenticação** - endpoint público para testes
 *     tags:
 *       - WebSocket Management
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *     responses:
 *       200:
 *         description: Estatísticas WebSocket obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - data
 *                 - timestamp
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalConnections:
 *                       type: number
 *                       example: 42
 *                     tenantStats:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                       example:
 *                         tenant1: 15
 *                         tenant2: 27
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-11T23:00:00Z"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-11T23:00:00.000Z"
 *                 correlation_id:
 *                   type: string
 *                   format: uuid
 *                   example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 tenant_id:
 *                   type: string
 *                   example: "public"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/websocket/stats/public', (req, res) => {
  const correlationId = req.correlationId || 'unknown';

  try {
    const wsService = WebSocketService.getInstance();
    const stats = wsService.getConnectionStats();

    res.json({
      ok: true,
      data: stats,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: 'public'
    });
  } catch (error) {
    logger.error('Error getting WebSocket stats (public)', 'public', correlationId, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: 'public'
    });
  }
});

/**
 * @swagger
 * /api/v1/websocket/stats:
 *   get:
 *     summary: Estatísticas WebSocket (Autenticado)
 *     description: |
 *       Obtém estatísticas detalhadas das conexões WebSocket ativas.
 *
 *       **Recursos:**
 *       - Estatísticas completas por tenant
 *       - Métricas de conexão e desconexão
 *       - Informações de última atividade
 *       - Logs de auditoria
 *
 *       **Requer autenticação** com escopo `websocket:read`.
 *     tags:
 *       - WebSocket Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *     responses:
 *       200:
 *         description: Estatísticas WebSocket obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - data
 *                 - timestamp
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Estatísticas detalhadas das conexões WebSocket
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 correlation_id:
 *                   type: string
 *                   format: uuid
 *                 tenant_id:
 *                   type: string
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
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/websocket/stats', createAuthMiddleware(['websocket:read']), (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('WebSocket stats request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method
  });

  try {
    const wsService = WebSocketService.getInstance();
    const stats = wsService.getConnectionStats();

    res.json({
      ok: true,
      data: stats,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  } catch (error) {
    logger.error('Error getting WebSocket stats', tenantId, correlationId, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

/**
 * @swagger
 * /api/v1/broadcast/tenant/{tenantId}:
 *   post:
 *     summary: Broadcast para Tenant Específico
 *     description: |
 *       Faz broadcast de uma mensagem para todas as conexões WebSocket de um tenant específico.
 *
 *       **Recursos:**
 *       - Envio direcionado por tenant
 *       - Suporte a tipos de mensagem personalizados
 *       - Logs estruturados para auditoria
 *       - Retorna contagem de conexões alcançadas
 *
 *       **Requer autenticação** com escopo `websocket:broadcast`.
 *     tags:
 *       - WebSocket Broadcasting
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *       - name: tenantId
 *         in: path
 *         required: true
 *         description: ID do tenant para receber o broadcast
 *         schema:
 *           type: string
 *           example: "acme-corp"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 description: Tipo da mensagem de broadcast
 *                 example: "notification"
 *               data:
 *                 type: object
 *                 description: Dados da mensagem
 *                 example:
 *                   title: "Nova mensagem"
 *                   message: "Você tem uma nova conversa"
 *           examples:
 *             notification:
 *               summary: Notificação
 *               value:
 *                 type: "notification"
 *                 data:
 *                   title: "Nova mensagem"
 *                   message: "Você tem uma nova conversa"
 *             systemAlert:
 *               summary: Alerta do sistema
 *               value:
 *                 type: "system_alert"
 *                 data:
 *                   level: "warning"
 *                   message: "Manutenção programada em 30 minutos"
 *     responses:
 *       200:
 *         description: Broadcast enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - ok
 *                 - data
 *                 - timestamp
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     target_tenant:
 *                       type: string
 *                       example: "acme-corp"
 *                     message_type:
 *                       type: string
 *                       example: "notification"
 *                     connections_sent:
 *                       type: number
 *                       example: 15
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 correlation_id:
 *                   type: string
 *                   format: uuid
 *                 tenant_id:
 *                   type: string
 *       400:
 *         description: Dados de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               ok: false
 *               error: "Message type is required"
 *               timestamp: "2025-08-11T23:00:00.000Z"
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
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/broadcast/tenant/:tenantId', createAuthMiddleware(['websocket:broadcast']), (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';
  const targetTenantId = req.params.tenantId;

  logger.info('WebSocket tenant broadcast request received', tenantId, correlationId, {
    userId,
    targetTenantId,
    path: req.path,
    method: req.method,
    bodySize: JSON.stringify(req.body).length
  });

  try {
    const { type, data } = req.body;

    if (!type) {
      return res.status(400).json({
        ok: false,
        error: 'Message type is required',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: tenantId
      });
    }

    const wsService = WebSocketService.getInstance();
    const message = {
      type,
      correlation_id: correlationId,
      tenant_id: targetTenantId,
      data: data || {},
      timestamp: new Date().toISOString()
    };

    const sentCount = wsService.broadcastToTenant(targetTenantId, message);

    logger.info('WebSocket tenant broadcast completed', tenantId, correlationId, {
      userId,
      targetTenantId,
      messageType: type,
      sentCount
    });

    res.json({
      ok: true,
      data: {
        target_tenant: targetTenantId,
        message_type: type,
        connections_sent: sentCount
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  } catch (error) {
    logger.error('Error broadcasting to tenant', tenantId, correlationId, {
      userId,
      targetTenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

/**
 * POST /api/v1/broadcast/all
 * Rota para fazer broadcast global para todas as conexões
 * Requer scopes: ['websocket:broadcast:global'] ou ['admin']
 */
router.post('/broadcast/all', createAuthMiddleware(['websocket:broadcast:global']), (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId || 'anonymous';

  logger.info('WebSocket global broadcast request received', tenantId, correlationId, {
    userId,
    path: req.path,
    method: req.method,
    bodySize: JSON.stringify(req.body).length
  });

  try {
    const { type, data } = req.body;

    if (!type) {
      return res.status(400).json({
        ok: false,
        error: 'Message type is required',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: tenantId
      });
    }

    const wsService = WebSocketService.getInstance();
    const message = {
      type,
      correlation_id: correlationId,
      tenant_id: 'system',
      data: data || {},
      timestamp: new Date().toISOString()
    };

    const sentCount = wsService.broadcastToAll(message);

    logger.info('WebSocket global broadcast completed', tenantId, correlationId, {
      userId,
      messageType: type,
      sentCount
    });

    res.json({
      ok: true,
      data: {
        message_type: type,
        connections_sent: sentCount
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  } catch (error) {
    logger.error('Error broadcasting globally', tenantId, correlationId, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: tenantId
    });
  }
});

/**
 * POST /api/v1/broadcast/tenant/:tenantId/public
 * Rota pública para fazer broadcast para um tenant específico (para testes)
 * Não requer autenticação
 */
router.post('/broadcast/tenant/:tenantId/public', (req, res) => {
  const correlationId = req.correlationId || 'unknown';
  const targetTenantId = req.params.tenantId;

  try {
    const { type, data } = req.body;

    if (!type) {
      return res.status(400).json({
        ok: false,
        error: 'Message type is required',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: 'public'
      });
    }

    const wsService = WebSocketService.getInstance();
    const message = {
      type,
      correlation_id: correlationId,
      tenant_id: targetTenantId,
      data: data || {},
      timestamp: new Date().toISOString()
    };

    const sentCount = wsService.broadcastToTenant(targetTenantId, message);

    res.json({
      ok: true,
      data: {
        target_tenant: targetTenantId,
        message_type: type,
        connections_sent: sentCount
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: 'public'
    });
  } catch (error) {
    logger.error('Error broadcasting to tenant (public)', 'public', correlationId, {
      targetTenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      ok: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      tenant_id: 'public'
    });
  }
});

export default router;
