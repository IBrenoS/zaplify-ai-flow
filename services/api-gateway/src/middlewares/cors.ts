import cors from 'cors';

import { config, configHelpers } from '../config/env.js';
import { logger } from '../utils/index.js';

export function createCorsMiddleware() {
  const corsOrigins = config.cors.CORS_ORIGINS;
  const isDevelopment = configHelpers.isDevelopment();

  // Em desenvolvimento, fallback permissivo se não houver CORS_ORIGINS
  const corsOptions: cors.CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Sempre permitir requests sem origin (ex: Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Se há whitelist configurada, usar ela
      if (corsOrigins.length > 0) {
        if (corsOrigins.includes(origin)) {
          logger.debug(`CORS: Origin ${origin} allowed (whitelist)`, 'system', 'cors');
          return callback(null, true);
        } else {
          logger.warn(`CORS: Origin ${origin} blocked (not in whitelist)`, 'system', 'cors', {
            origin,
            allowedOrigins: corsOrigins
          });
          return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
        }
      }

      // Fallback: em dev sem whitelist, permitir tudo; em prod, bloquear
      if (isDevelopment) {
        logger.debug(`CORS: Origin ${origin} allowed (development fallback)`, 'system', 'cors');
        return callback(null, true);
      } else {
        logger.warn(`CORS: Origin ${origin} blocked (production without whitelist)`, 'system', 'cors');
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      }
    },
    credentials: config.cors.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-correlation-id',
      'x-tenant-id'
    ],
    exposedHeaders: ['x-correlation-id', 'x-tenant-id'],
    maxAge: config.cors.CORS_MAX_AGE
  };

  logger.info('CORS middleware configured', 'system', 'startup', {
    corsOrigins,
    isDevelopment,
    hasWhitelist: corsOrigins.length > 0,
    credentials: config.cors.CORS_CREDENTIALS,
    maxAge: config.cors.CORS_MAX_AGE
  });

  return cors(corsOptions);
}
