import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { HealthCheckService } from '../services/index.js';
import type { DeepHealthResponse } from '../types/index.js';
import { logger } from '../utils/index.js';

const healthRouter = Router();
const healthCheckService = new HealthCheckService();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check Agregado
 *     description: |
 *       Verifica o status do API Gateway e de todos os serviços downstream.
 *
 *       **Comportamento:**
 *       - Sempre retorna HTTP 200 (para não derrubar o gateway)
 *       - Agrega status de 4 serviços: IA, WhatsApp, Funnel, Analytics
 *       - Timeout de 5s por serviço
 *       - Propaga headers de correlação
 *
 *       **Não requer autenticação** - endpoint público para monitoring.
 *     tags:
 *       - Health Check
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *       - $ref: '#/components/parameters/tenantId'
 *     responses:
 *       200:
 *         description: Status do gateway e serviços dependentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             examples:
 *               allHealthy:
 *                 summary: Todos os serviços saudáveis
 *                 value:
 *                   ok: true
 *                   service: api-gateway
 *                   deps:
 *                     ia:
 *                       ok: true
 *                       service: ia
 *                       responseTime: 45
 *                     whatsapp:
 *                       ok: true
 *                       service: whatsapp
 *                       responseTime: 67
 *                     funnel:
 *                       ok: true
 *                       service: funnel
 *                       responseTime: 89
 *                     analytics:
 *                       ok: true
 *                       service: analytics
 *                       responseTime: 123
 *                   tenant_id: default
 *                   correlation_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *                   timestamp: "2025-08-11T23:00:00.000Z"
 *               someUnhealthy:
 *                 summary: Alguns serviços indisponíveis
 *                 value:
 *                   ok: true
 *                   service: api-gateway
 *                   deps:
 *                     ia:
 *                       ok: true
 *                       service: ia
 *                       responseTime: 45
 *                     whatsapp:
 *                       ok: false
 *                       service: whatsapp
 *                       error: "HTTP 500"
 *                       responseTime: 120
 *                     funnel:
 *                       ok: true
 *                       service: funnel
 *                       responseTime: 67
 *                     analytics:
 *                       ok: false
 *                       service: analytics
 *                       error: "Connection timeout"
 *                       responseTime: 5000
 *                   tenant_id: default
 *                   correlation_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *                   timestamp: "2025-08-11T23:00:00.000Z"
 */
healthRouter.get('/health', async (req: Request, res: Response) => {
  const { correlationId, tenantId } = req;

  try {
    logger.info(
      'Processing /health deep check request',
      tenantId,
      correlationId
    );

    // Executa health check de todos os serviços
    const deps = await healthCheckService.checkAllServices(correlationId, tenantId);

    // Monta resposta - sempre 200 para diagnóstico
    const response: DeepHealthResponse = {
      ok: true, // Sempre true - objetivo é diagnóstico, não derrubar gateway
      service: 'api-gateway',
      deps,
      tenant_id: tenantId,
      correlation_id: correlationId,
      timestamp: new Date().toISOString()
    };

    // Log estruturado do resultado
    const healthySvcs = Object.values(deps).filter((d: any) => d.ok).length;
    const totalSvcs = Object.values(deps).length;

    logger.info(
      `Health check completed: ${healthySvcs}/${totalSvcs} services healthy`,
      tenantId,
      correlationId,
      {
        healthyServices: healthySvcs,
        totalServices: totalSvcs,
        services: Object.entries(deps).reduce((acc, [name, status]) => {
          const s = status as any;
          acc[name] = { ok: s.ok, responseTime: s.responseTime };
          return acc;
        }, {} as Record<string, any>)
      }
    );

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      'Error during health check',
      tenantId,
      correlationId,
      { error: errorMessage }
    );

    // Mesmo com erro interno, retorna 200 para não derrubar o gateway
    const errorResponse: DeepHealthResponse = {
      ok: true,
      service: 'api-gateway',
      deps: {
        ia: { ok: false, service: 'ia', error: 'Health check failed' },
        whatsapp: { ok: false, service: 'whatsapp', error: 'Health check failed' },
        funnel: { ok: false, service: 'funnel', error: 'Health check failed' },
        analytics: { ok: false, service: 'analytics', error: 'Health check failed' }
      },
      tenant_id: tenantId,
      correlation_id: correlationId,
      timestamp: new Date().toISOString()
    };

    res.status(StatusCodes.OK).json(errorResponse);
  }
});

export { healthRouter };
