import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '../utils/index.js';

interface ErrorResponse {
  ok: false;
  error: string;
  timestamp: string;
  correlation_id?: string;
  tenant_id?: string;
}

export function globalErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.tenantId || 'unknown';

  // Log estruturado do erro
  logger.error(
    `Unhandled error: ${error.message}`,
    tenantId,
    correlationId,
    {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    }
  );

  // Determinar status code
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let errorMessage = 'Internal server error';

  // Personalizar status codes para tipos específicos de erro
  if (error.name === 'ValidationError') {
    statusCode = StatusCodes.BAD_REQUEST;
    errorMessage = 'Validation error';
  } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    statusCode = StatusCodes.UNAUTHORIZED;
    errorMessage = 'Unauthorized';
  } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
    statusCode = StatusCodes.FORBIDDEN;
    errorMessage = 'Forbidden';
  } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    statusCode = StatusCodes.NOT_FOUND;
    errorMessage = 'Not found';
  } else if (error.message.includes('CORS')) {
    statusCode = StatusCodes.FORBIDDEN;
    errorMessage = 'CORS policy violation';
  } else if (error.message.includes('payload') || error.message.includes('limit')) {
    statusCode = StatusCodes.REQUEST_TOO_LONG;
    errorMessage = 'Request entity too large';
  }

  // Em desenvolvimento, expor mais detalhes do erro
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment && statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    errorMessage = error.message;
  }

  // Response padronizado
  const errorResponse: ErrorResponse = {
    ok: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    correlation_id: correlationId,
    tenant_id: tenantId
  };

  // Garantir que headers de correlação estão presentes
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-tenant-id', tenantId);

  res.status(statusCode).json(errorResponse);
}

// Handler para rotas não encontradas
export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = req.correlationId || 'unknown';
  const tenantId = req.tenantId || 'unknown';

  logger.warn(
    `Route not found: ${req.method} ${req.path}`,
    tenantId,
    correlationId,
    {
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    }
  );

  const errorResponse: ErrorResponse = {
    ok: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
    correlation_id: correlationId,
    tenant_id: tenantId
  };

  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-tenant-id', tenantId);
  res.status(StatusCodes.NOT_FOUND).json(errorResponse);
}
