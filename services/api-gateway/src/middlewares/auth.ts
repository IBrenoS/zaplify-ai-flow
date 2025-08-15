import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { config, configHelpers } from '../config/env.js';
import type { AuthenticatedUser, JWTPayload } from '../types/index.js';
import { logger } from '../utils/index.js';

/**
 * Verifica se o usuário tem um scope de nível superior que inclui o scope requisitado
 */
function hasHigherScope(userScopes: string[], requiredScope: string): boolean {
  // Mapeamento de hierarquia de scopes
  const scopeHierarchy: Record<string, string[]> = {
    // AI scopes
    'ai:admin': ['ai:read', 'ai:write', 'ai:conversation'],
    'ai:write': ['ai:read', 'ai:conversation'],

    // Funnel scopes
    'funnel:admin': ['funnel:read', 'funnel:write', 'funnel:execute'],
    'funnel:write': ['funnel:read', 'funnel:execute'],

    // WhatsApp scopes
    'whatsapp:admin': ['whatsapp:read', 'whatsapp:write', 'whatsapp:send'],
    'whatsapp:write': ['whatsapp:read', 'whatsapp:send'],

    // Analytics scopes
    'analytics:admin': ['analytics:read', 'analytics:write', 'analytics:export'],
    'analytics:write': ['analytics:read', 'analytics:export'],
  };

  // Verificar se algum scope do usuário inclui o scope requisitado
  return userScopes.some(userScope => {
    const includedScopes = scopeHierarchy[userScope] || [];
    return includedScopes.includes(requiredScope);
  });
}

export function createAuthMiddleware(requiredScopes: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Verificar se autenticação está habilitada
    if (!configHelpers.isAuthEnabled()) {
      // Criar usuário mock para desenvolvimento
      req.user = {
        userId: 'dev-user',
        tenantId: req.tenantId || 'dev-tenant',
        scopes: ['*'] // Usuário mock tem acesso total
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const correlationId = req.correlationId || 'unknown';
    const tenantId = req.tenantId || 'unknown';

    // Verificar se Authorization header existe
    if (!authHeader) {
      logger.warn('Authentication failed: Missing Authorization header', tenantId, correlationId, {
        path: req.path,
        method: req.method
      });

      res.status(StatusCodes.UNAUTHORIZED).json({
        ok: false,
        error: 'Missing Authorization header',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: tenantId
      });
      return;
    }

    // Verificar formato Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Authentication failed: Invalid Authorization header format', tenantId, correlationId, {
        authHeader: authHeader.substring(0, 20) + '...', // Log parcial por segurança
        path: req.path,
        method: req.method
      });

      res.status(StatusCodes.UNAUTHORIZED).json({
        ok: false,
        error: 'Invalid Authorization header format. Expected: Bearer <token>',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: tenantId
      });
      return;
    }

    const token = parts[1];
    const jwtSecret = config.auth.JWT_SECRET;

    try {
      // Verificar e decodificar JWT
      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer: config.auth.JWT_ISSUER
      }) as JWTPayload;

      // Criar objeto do usuário autenticado
      const user: AuthenticatedUser = {
        userId: decoded.sub,
        tenantId: decoded.tenant_id || 'default',
        scopes: decoded.scopes || []
      };

      // Verificar escopos necessários
      if (requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope =>
          user.scopes.includes(scope) ||
          hasHigherScope(user.scopes, scope)
        );

        if (!hasRequiredScopes) {
          logger.warn('Authorization failed: Insufficient scopes', user.tenantId, correlationId, {
            userId: user.userId,
            userScopes: user.scopes,
            requiredScopes,
            path: req.path,
            method: req.method
          });

          res.status(StatusCodes.FORBIDDEN).json({
            ok: false,
            error: 'Insufficient permissions',
            required_scopes: requiredScopes,
            user_scopes: user.scopes,
            timestamp: new Date().toISOString(),
            correlation_id: correlationId,
            tenant_id: user.tenantId
          });
          return;
        }
      }

      // Anexar usuário ao request
      req.user = user;

      // Atualizar tenantId no request com o valor do JWT (mais confiável)
      req.tenantId = user.tenantId;
      res.tenantId = user.tenantId;

      logger.debug('Authentication successful', user.tenantId, correlationId, {
        userId: user.userId,
        scopes: user.scopes,
        path: req.path,
        method: req.method
      });

      next();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';

      logger.warn('Authentication failed: Invalid token', tenantId, correlationId, {
        error: errorMessage,
        path: req.path,
        method: req.method
      });

      res.status(StatusCodes.UNAUTHORIZED).json({
        ok: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: tenantId
      });
    }
  };
}

// Helper para criar middleware sem escopos (apenas autenticação)
export const authMiddleware = createAuthMiddleware();

// Helpers para escopos específicos
export const requireAIScope = createAuthMiddleware(['ai:read']);
export const requireFunnelScope = createAuthMiddleware(['funnel:write']);
export const requireWhatsAppScope = createAuthMiddleware(['whatsapp:write']);
export const requireAnalyticsScope = createAuthMiddleware(['analytics:write']);
