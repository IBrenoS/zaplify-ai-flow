import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  tenant_id?: string;
  user_id?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requireJWT = process.env.REQUIRE_JWT === 'true';
  const jwtSecret = process.env.JWT_SECRET;
  const correlationId = (req as any).correlationId || req.headers['x-correlation-id'] as string || `req-${Date.now()}`;

  // If JWT is not required, proceed without validation but still parse if present
  if (!requireJWT) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ') && jwtSecret) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        req.user = decoded;

        // Override tenant_id from JWT if present
        if (decoded.tenant_id) {
          req.headers['x-tenant-id'] = decoded.tenant_id;
        }
      } catch {
        // In optional mode, ignore invalid tokens and continue
      }
    }

    return next();
  }

  // JWT is required - check if secret is configured
  if (!jwtSecret) {
    res.status(500).json({
      ok: false,
      error: 'Server configuration error',
      correlation_id: correlationId,
    });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      ok: false,
      error: 'Unauthorized',
      correlation_id: correlationId,
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      ok: false,
      error: 'Unauthorized',
      correlation_id: correlationId,
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = decoded;

    // Override tenant_id from JWT if present
    if (decoded.tenant_id) {
      req.headers['x-tenant-id'] = decoded.tenant_id;
    }

    next();
  } catch {
    res.status(401).json({
      ok: false,
      error: 'Unauthorized',
      correlation_id: correlationId,
    });
  }
}
