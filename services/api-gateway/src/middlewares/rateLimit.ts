import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

import { config, configHelpers } from '../config/env.js';
import { logger } from '../utils/index.js';

// Configurar cliente Redis se URL estiver disponível
async function createRedisStore() {
  if (!configHelpers.isRedisConfigured()) {
    logger.info('Rate limit using memory store (no Redis URL configured)', 'system', 'startup', {
      redisConfigured: false,
      storeType: 'memory'
    });
    return null;
  }

  try {
    const redisOptions = configHelpers.getRedisOptions();
    const client = createClient(redisOptions);

    client.on('error', (error) => {
      logger.error('Redis client error for rate limiting', 'system', 'redis-error', {
        error: error.message,
        redisHost: config.cache.REDIS_HOST,
        redisPort: config.cache.REDIS_PORT
      });
    });

    await client.connect();

    logger.info('Rate limit using Redis store', 'system', 'startup', {
      redisConfigured: true,
      storeType: 'redis',
      redisHost: config.cache.REDIS_HOST,
      redisPort: config.cache.REDIS_PORT
    });

    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
    });
  } catch (error) {
    logger.error('Failed to connect to Redis for rate limiting, falling back to memory store', 'system', 'redis-error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'memory'
    });
    return null;
  }
}

export async function createRateLimitMiddleware() {
  if (!config.rateLimit.RATE_LIMIT_ENABLED) {
    logger.info('Rate limiting disabled by configuration', 'system', 'startup');
    // Return pass-through middleware if rate limiting is disabled
    return {
      general: (_req: any, _res: any, next: any) => next(),
      tenant: (_req: any, _res: any, next: any) => next()
    };
  }

  const isDevelopment = configHelpers.isDevelopment();

  // Configurações baseadas no ambiente
  const windowMs = config.rateLimit.RATE_LIMIT_WINDOW_MS;
  const maxRequests = config.rateLimit.RATE_LIMIT_MAX_REQUESTS;
  const maxRequestsPerTenant = config.rateLimit.RATE_LIMIT_MAX_REQUESTS_PER_TENANT;

  // Tentar criar store Redis
  const redisStore = await createRedisStore();

  logger.info('Rate limit middleware configured', 'system', 'startup', {
    isDevelopment,
    windowMs,
    maxRequests,
    maxRequestsPerTenant,
    storeType: redisStore ? 'redis' : 'memory'
  });

  // Configuração comum para ambos os rate limiters
  const commonConfig = {
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    ...(redisStore && { store: redisStore })
  };

  // Rate limit global por IP (backup de segurança)
  const generalRateLimit = rateLimit({
    ...commonConfig,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Usar a função auxiliar ipKeyGenerator para IPv6
      return ipKeyGenerator(req.ip || req.connection?.remoteAddress || 'unknown');
    },
    message: (req: any) => {
      const correlationId = req.correlationId || 'unknown';

      logger.warn('Rate limit exceeded (global)', req.ip, correlationId, {
        path: req.path,
        method: req.method,
        limit: maxRequests,
        windowMs,
        storeType: redisStore ? 'redis' : 'memory'
      });

      return {
        ok: false,
        error: 'Too many requests from this IP',
        retry_after: Math.ceil(windowMs / 1000),
        limit: maxRequests,
        window_ms: windowMs,
        timestamp: new Date().toISOString(),
        correlation_id: correlationId
      };
    }
  });

  // Rate limit por tenant (para usuários autenticados)
  const tenantRateLimit = rateLimit({
    ...commonConfig,
    max: maxRequestsPerTenant,
    keyGenerator: (req) => {
      // Usar tenant_id como chave se disponível, senão IP
      const tenantId = req.user?.tenantId || req.tenantId;
      return tenantId ? `tenant:${tenantId}` : `ip:${ipKeyGenerator(req.ip || req.connection?.remoteAddress || 'unknown')}`;
    },
    message: (req: any) => {
      const correlationId = req.correlationId || 'unknown';
      const tenantId = req.user?.tenantId || req.tenantId || 'default';
      const userId = req.user?.userId || 'anonymous';

      logger.warn('Rate limit exceeded (tenant)', tenantId, correlationId, {
        userId,
        path: req.path,
        method: req.method,
        limit: maxRequestsPerTenant,
        windowMs,
        storeType: redisStore ? 'redis' : 'memory'
      });

      return {
        ok: false,
        error: 'Too many requests for this tenant',
        retry_after: Math.ceil(windowMs / 1000),
        limit: maxRequestsPerTenant,
        window_ms: windowMs,
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        tenant_id: tenantId
      };
    }
  });

  return {
    general: generalRateLimit,
    tenant: tenantRateLimit
  };
}
