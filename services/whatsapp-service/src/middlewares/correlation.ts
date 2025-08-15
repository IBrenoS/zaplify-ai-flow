import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { createChildLogger, logger } from '../config/logger.js';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      tenantId: string;
      logger: typeof logger;
    }
  }
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extrair ou gerar correlation-id
  const correlationId = req.headers['x-correlation-id'] as string || randomUUID();

  // Extrair ou gerar tenant-id (padrão: 'default')
  const tenantId = req.headers['x-tenant-id'] as string || 'default';

  // Adicionar aos headers da request
  req.correlationId = correlationId;
  req.tenantId = tenantId;

  // Criar logger contextual para esta request
  req.logger = createChildLogger({ correlation_id: correlationId, tenant_id: tenantId });

  // Propagar nos headers de resposta
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-tenant-id', tenantId);

  req.logger.debug({
    msg: 'Request received',
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  next();
}
