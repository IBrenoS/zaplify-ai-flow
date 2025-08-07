/**
 * Authentication middleware
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip auth for health checks and certain endpoints
    const skipAuthPaths = ['/health', '/api/health', '/api/auth/login', '/api/auth/register'];

    if (skipAuthPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;

      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      logger.debug(`Authenticated user: ${req.user.email}`);
      next();

    } catch (jwtError) {
      logger.warn('Invalid JWT token', { token: token.substring(0, 20) + '...' });
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }

  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error'
    });
  }
};

// Optional: Middleware for role-based access
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
