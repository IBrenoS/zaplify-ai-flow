/**
 * Environment Configuration Loader with Validation
 *
 * Centralizes environment variable loading and validation using zod.
 * Supports multiple environment profiles (.env, .env.development, .env.production)
 * with secure defaults and comprehensive type safety.
 */

import { z } from 'zod';

import { logger } from '../utils/logger.js';

// Load environment-specific .env files
const NODE_ENV = process.env.NODE_ENV || 'development';

// Force loading only the main .env file
try {
  const { config } = await import('dotenv');
  config({ path: '.env', override: true }); // Load only .env file with override

  logger.info('Environment configuration loaded', 'system', 'env-loader', {
    nodeEnv: NODE_ENV,
    envFile: '.env'
  });
} catch {
  logger.warn('Environment file not found, using defaults', 'system', 'env-loader', {
    nodeEnv: NODE_ENV,
    envFile: '.env',
    fallback: 'process.env'
  });
}/**
 * Schema for server configuration
 */
const ServerConfigSchema = z.object({
  PORT: z.coerce.number()
    .min(1024, 'Port must be >= 1024')
    .max(65535, 'Port must be <= 65535')
    .default(8080),

  HOST: z.string()
    .default('0.0.0.0'),

  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug'])
    .default('info'),

  API_VERSION: z.string()
    .default('1.0.0'),

  API_PREFIX: z.string()
    .default('/api/v1')
});

/**
 * Schema for authentication configuration
 */
const AuthConfigSchema = z.object({
  JWT_SECRET: z.string()
    .min(8, 'JWT_SECRET must be at least 8 characters')
    .refine((val) => {
      // In production, require 32+ characters for security
      if (NODE_ENV === 'production' && val.length < 32) {
        return false;
      }
      return true;
    }, 'JWT_SECRET must be at least 32 characters in production environment')
    .default(() => {
      if (NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production environment');
      }
      return 'dev-secret-key-32-chars-minimum-length!';
    }),

  JWT_EXPIRES_IN: z.string()
    .default('24h'),

  AUTH_ENABLED: z.coerce.boolean()
    .default(true),

  JWT_ISSUER: z.string()
    .default('zaplify-api-gateway'),

  JWT_AUDIENCE: z.string()
    .default('zaplify-services')
});

/**
 * Schema for external service URLs
 */
const ServicesConfigSchema = z.object({
  AI_SERVICE_URL: z.string()
    .url('AI_SERVICE_URL must be a valid URL')
    .default('http://localhost:8001'),

  WHATSAPP_SERVICE_URL: z.string()
    .url('WHATSAPP_SERVICE_URL must be a valid URL')
    .default('http://localhost:8002'),

  FUNNEL_ENGINE_URL: z.string()
    .url('FUNNEL_ENGINE_URL must be a valid URL')
    .default('http://localhost:8003'),

  ANALYTICS_SERVICE_URL: z.string()
    .url('ANALYTICS_SERVICE_URL must be a valid URL')
    .default('http://localhost:8004'),

  // Health check timeout for dependent services
  SERVICE_TIMEOUT_MS: z.coerce.number()
    .min(1000, 'Service timeout must be at least 1000ms')
    .max(30000, 'Service timeout must not exceed 30000ms')
    .default(5000)
});

/**
 * Schema for Redis/Cache configuration
 */
const CacheConfigSchema = z.object({
  REDIS_URL: z.string()
    .url('REDIS_URL must be a valid URL')
    .optional(),

  REDIS_HOST: z.string()
    .default('localhost'),

  REDIS_PORT: z.coerce.number()
    .min(1, 'Redis port must be positive')
    .max(65535, 'Redis port must be <= 65535')
    .default(6379),

  REDIS_PASSWORD: z.string()
    .optional(),

  REDIS_DB: z.coerce.number()
    .min(0, 'Redis DB must be >= 0')
    .max(15, 'Redis DB must be <= 15')
    .default(0),

  CACHE_TTL_SECONDS: z.coerce.number()
    .min(1, 'Cache TTL must be at least 1 second')
    .default(300) // 5 minutes
});

/**
 * Schema for rate limiting configuration
 */
const RateLimitConfigSchema = z.object({
  RATE_LIMIT_WINDOW_MS: z.coerce.number()
    .min(1000, 'Rate limit window must be at least 1000ms')
    .default(60000), // 1 minute

  RATE_LIMIT_MAX_REQUESTS: z.coerce.number()
    .min(1, 'Max requests must be at least 1')
    .default(100),

  RATE_LIMIT_MAX_REQUESTS_PER_TENANT: z.coerce.number()
    .min(1, 'Max requests per tenant must be at least 1')
    .default(500),

  RATE_LIMIT_ENABLED: z.coerce.boolean()
    .default(false)
});

/**
 * Schema for CORS configuration
 */
const CorsConfigSchema = z.object({
  CORS_ORIGINS: z.string()
    .transform((val) => val.split(',').map(s => s.trim()).filter(Boolean))
    .default(() => ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080']),

  CORS_CREDENTIALS: z.coerce.boolean()
    .default(true),

  CORS_MAX_AGE: z.coerce.number()
    .min(0, 'CORS max age must be >= 0')
    .default(86400) // 24 hours
});

/**
 * Schema for security configuration
 */
const SecurityConfigSchema = z.object({
  SECURITY_HSTS_ENABLED: z.coerce.boolean()
    .default(true),

  SECURITY_CSP_ENABLED: z.coerce.boolean()
    .default(true),

  SECURITY_FRAME_GUARD_ENABLED: z.coerce.boolean()
    .default(true),

  ALLOWED_HOSTS: z.string()
    .transform((val) => val.split(',').map(s => s.trim()).filter(Boolean))
    .default(() => ['localhost', '127.0.0.1']),

  TRUST_PROXY: z.coerce.boolean()
    .default(false)
});

/**
 * Schema for monitoring and observability
 */
const MonitoringConfigSchema = z.object({
  METRICS_ENABLED: z.coerce.boolean()
    .default(true),

  HEALTH_CHECK_ENABLED: z.coerce.boolean()
    .default(true),

  MOCK_HEALTH: z.coerce.boolean()
    .default(false),

  SWAGGER_ENABLED: z.coerce.boolean()
    .default(() => NODE_ENV === 'development'),

  REQUEST_LOGGING_ENABLED: z.coerce.boolean()
    .default(true),

  ERROR_STACK_TRACE_ENABLED: z.coerce.boolean()
    .default(() => NODE_ENV !== 'production')
});

/**
 * Complete configuration schema combining all sections
 */
const ConfigSchema = z.object({
  server: ServerConfigSchema,
  auth: AuthConfigSchema,
  services: ServicesConfigSchema,
  cache: CacheConfigSchema,
  rateLimit: RateLimitConfigSchema,
  cors: CorsConfigSchema,
  security: SecurityConfigSchema,
  monitoring: MonitoringConfigSchema
});

/**
 * Parse and validate environment variables
 */
function parseEnvironmentConfig() {
  try {
    const rawConfig = {
      server: {
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        NODE_ENV: process.env.NODE_ENV,
        LOG_LEVEL: process.env.LOG_LEVEL,
        API_VERSION: process.env.API_VERSION,
        API_PREFIX: process.env.API_PREFIX
      },
      auth: {
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        AUTH_ENABLED: process.env.AUTH_ENABLED,
        JWT_ISSUER: process.env.JWT_ISSUER,
        JWT_AUDIENCE: process.env.JWT_AUDIENCE
      },
      services: {
        AI_SERVICE_URL: process.env.AI_SERVICE_URL,
        WHATSAPP_SERVICE_URL: process.env.WHATSAPP_SERVICE_URL,
        FUNNEL_ENGINE_URL: process.env.FUNNEL_ENGINE_URL,
        ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL,
        SERVICE_TIMEOUT_MS: process.env.SERVICE_TIMEOUT_MS
      },
      cache: {
        REDIS_URL: process.env.REDIS_URL,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        REDIS_DB: process.env.REDIS_DB,
        CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS
      },
      rateLimit: {
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_MAX_REQUESTS_PER_TENANT: process.env.RATE_LIMIT_MAX_REQUESTS_PER_TENANT,
        RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED
      },
      cors: {
        CORS_ORIGINS: process.env.CORS_ORIGINS,
        CORS_CREDENTIALS: process.env.CORS_CREDENTIALS,
        CORS_MAX_AGE: process.env.CORS_MAX_AGE
      },
      security: {
        SECURITY_HSTS_ENABLED: process.env.SECURITY_HSTS_ENABLED,
        SECURITY_CSP_ENABLED: process.env.SECURITY_CSP_ENABLED,
        SECURITY_FRAME_GUARD_ENABLED: process.env.SECURITY_FRAME_GUARD_ENABLED,
        ALLOWED_HOSTS: process.env.ALLOWED_HOSTS,
        TRUST_PROXY: process.env.TRUST_PROXY
      },
      monitoring: {
        METRICS_ENABLED: process.env.METRICS_ENABLED,
        HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED,
        MOCK_HEALTH: process.env.MOCK_HEALTH,
        SWAGGER_ENABLED: process.env.SWAGGER_ENABLED,
        REQUEST_LOGGING_ENABLED: process.env.REQUEST_LOGGING_ENABLED,
        ERROR_STACK_TRACE_ENABLED: process.env.ERROR_STACK_TRACE_ENABLED
      }
    };

    const validatedConfig = ConfigSchema.parse(rawConfig);

    logger.info('Environment configuration validated successfully', 'system', 'env-validation', {
      nodeEnv: validatedConfig.server.NODE_ENV,
      port: validatedConfig.server.PORT,
      authEnabled: validatedConfig.auth.AUTH_ENABLED,
      rateLimitEnabled: validatedConfig.rateLimit.RATE_LIMIT_ENABLED,
      swaggerEnabled: validatedConfig.monitoring.SWAGGER_ENABLED,
      configSections: Object.keys(validatedConfig)
    });

    return validatedConfig;

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });

      logger.error('Environment configuration validation failed', 'system', 'env-validation', {
        errors: errorMessages,
        nodeEnv: NODE_ENV,
        help: 'Check your .env file and ensure all required variables are set correctly'
      });

      console.error('\n❌ Environment Configuration Error');
      console.error('════════════════════════════════════\n');
      console.error('The following environment variables are invalid or missing:\n');

      errorMessages.forEach((msg: string, index: number) => {
        console.error(`${index + 1}. ${msg}`);
      });

      console.error('\nPlease check your .env file and fix the issues above.');
      console.error(`Current environment: ${NODE_ENV}`);
      console.error(`Expected environment file: .env.${NODE_ENV} (optional, falls back to .env)`);
      console.error('\n════════════════════════════════════');

      process.exit(1);
    }

    logger.error('Unexpected error during environment configuration', 'system', 'env-validation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeEnv: NODE_ENV
    });

    console.error('\n❌ Critical Configuration Error');
    console.error('═══════════════════════════════════════');
    console.error('Failed to load environment configuration.');
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('═══════════════════════════════════════\n');

    process.exit(1);
  }
}

/**
 * Export the validated configuration
 */
export const config = parseEnvironmentConfig();

/**
 * TypeScript type for the configuration
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Helper functions for common configuration checks
 */
export const configHelpers = {
  /**
   * Check if running in development mode
   */
  isDevelopment: () => config.server.NODE_ENV === 'development',

  /**
   * Check if running in production mode
   */
  isProduction: () => config.server.NODE_ENV === 'production',

  /**
   * Check if running in test mode
   */
  isTest: () => config.server.NODE_ENV === 'test',

  /**
   * Check if authentication is enabled
   */
  isAuthEnabled: () => config.auth.AUTH_ENABLED,

  /**
   * Check if rate limiting is enabled
   */
  isRateLimitEnabled: () => config.rateLimit.RATE_LIMIT_ENABLED,

  /**
   * Check if Redis is configured
   */
  isRedisConfigured: () => Boolean(config.cache.REDIS_URL),

  /**
   * Check if Swagger documentation should be enabled
   */
  isSwaggerEnabled: () => config.monitoring.SWAGGER_ENABLED,

  /**
   * Check if health check mock mode is enabled
   */
  isHealthMockEnabled: () => config.monitoring.MOCK_HEALTH,

  /**
   * Get full service URL with health check endpoint
   */
  getServiceHealthUrl: (serviceName: 'ai' | 'whatsapp' | 'funnel' | 'analytics') => {
    const baseUrls = {
      ai: config.services.AI_SERVICE_URL,
      whatsapp: config.services.WHATSAPP_SERVICE_URL,
      funnel: config.services.FUNNEL_ENGINE_URL,
      analytics: config.services.ANALYTICS_SERVICE_URL
    };

    return `${baseUrls[serviceName]}/health`;
  },

  /**
   * Get Redis connection options
   */
  getRedisOptions: () => {
    if (config.cache.REDIS_URL) {
      return { url: config.cache.REDIS_URL };
    }

    return {
      host: config.cache.REDIS_HOST,
      port: config.cache.REDIS_PORT,
      password: config.cache.REDIS_PASSWORD,
      db: config.cache.REDIS_DB
    };
  },

  /**
   * Get CORS origins array
   */
  getCorsOrigins: () => config.cors.CORS_ORIGINS,

  /**
   * Get allowed hosts array
   */
  getAllowedHosts: () => config.security.ALLOWED_HOSTS
};

/**
 * Configuration summary for debugging
 */
export function getConfigSummary() {
  return {
    environment: config.server.NODE_ENV,
    server: {
      host: config.server.HOST,
      port: config.server.PORT,
      apiVersion: config.server.API_VERSION
    },
    features: {
      authEnabled: config.auth.AUTH_ENABLED,
      rateLimitEnabled: config.rateLimit.RATE_LIMIT_ENABLED,
      swaggerEnabled: config.monitoring.SWAGGER_ENABLED,
      metricsEnabled: config.monitoring.METRICS_ENABLED,
      redisConfigured: configHelpers.isRedisConfigured()
    },
    services: {
      ai: config.services.AI_SERVICE_URL,
      whatsapp: config.services.WHATSAPP_SERVICE_URL,
      funnel: config.services.FUNNEL_ENGINE_URL,
      analytics: config.services.ANALYTICS_SERVICE_URL
    },
    security: {
      corsOrigins: config.cors.CORS_ORIGINS.length,
      allowedHosts: config.security.ALLOWED_HOSTS.length,
      hstsEnabled: config.security.SECURITY_HSTS_ENABLED,
      cspEnabled: config.security.SECURITY_CSP_ENABLED
    }
  };
}

// Log configuration summary on load (only in development)
if (configHelpers.isDevelopment()) {
  logger.info('Configuration summary', 'system', 'env-loaded', getConfigSummary());
}
