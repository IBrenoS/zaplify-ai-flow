import { randomUUID } from 'crypto';

import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/index.js';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Lê headers ou gera defaults
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default';

  // Injeta em req e res
  req.correlationId = correlationId;
  req.tenantId = tenantId;
  res.correlationId = correlationId;
  res.tenantId = tenantId;

  // Define headers de resposta
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-tenant-id', tenantId);

  // Log da requisição
  logger.info(
    `Incoming request: ${req.method} ${req.path}`,
    tenantId,
    correlationId,
    {
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    }
  );

  next();
}
