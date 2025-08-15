import { beforeAll, describe, expect, it } from 'vitest';

import { config, configHelpers, getConfigSummary } from '../src/config/env.js';

describe('Environment Configuration Tests', () => {
  beforeAll(() => {
    // Garantir que estamos em ambiente de teste
    process.env.NODE_ENV = 'test';
  });

  describe('Configuration Loading', () => {
    it('should load configuration successfully', () => {
      expect(config).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.services).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.monitoring).toBeDefined();
    });

    it('should have valid server configuration', () => {
      expect(config.server.PORT).toBeTypeOf('number');
      expect(config.server.PORT).toBeGreaterThan(1023);
      expect(config.server.PORT).toBeLessThan(65536);

      expect(config.server.HOST).toBeTypeOf('string');
      expect(config.server.NODE_ENV).toMatch(/^(development|production|test)$/);
      expect(config.server.LOG_LEVEL).toMatch(/^(error|warn|info|debug)$/);
    });

    it('should have valid authentication configuration', () => {
      expect(config.auth.JWT_SECRET).toBeTypeOf('string');
      expect(config.auth.JWT_SECRET.length).toBeGreaterThanOrEqual(32);

      expect(config.auth.JWT_EXPIRES_IN).toBeTypeOf('string');
      expect(config.auth.AUTH_ENABLED).toBeTypeOf('boolean');
      expect(config.auth.JWT_ISSUER).toBeTypeOf('string');
      expect(config.auth.JWT_AUDIENCE).toBeTypeOf('string');
    });

    it('should have valid services configuration', () => {
      expect(config.services.AI_SERVICE_URL).toMatch(/^https?:\/\/.+/);
      expect(config.services.WHATSAPP_SERVICE_URL).toMatch(/^https?:\/\/.+/);
      expect(config.services.FUNNEL_ENGINE_URL).toMatch(/^https?:\/\/.+/);
      expect(config.services.ANALYTICS_SERVICE_URL).toMatch(/^https?:\/\/.+/);

      expect(config.services.SERVICE_TIMEOUT_MS).toBeTypeOf('number');
      expect(config.services.SERVICE_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
      expect(config.services.SERVICE_TIMEOUT_MS).toBeLessThanOrEqual(30000);
    });

    it('should have valid rate limiting configuration', () => {
      expect(config.rateLimit.RATE_LIMIT_WINDOW_MS).toBeTypeOf('number');
      expect(config.rateLimit.RATE_LIMIT_WINDOW_MS).toBeGreaterThanOrEqual(1000);

      expect(config.rateLimit.RATE_LIMIT_MAX_REQUESTS).toBeTypeOf('number');
      expect(config.rateLimit.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);

      expect(config.rateLimit.RATE_LIMIT_MAX_REQUESTS_PER_TENANT).toBeTypeOf('number');
      expect(config.rateLimit.RATE_LIMIT_MAX_REQUESTS_PER_TENANT).toBeGreaterThan(0);

      expect(config.rateLimit.RATE_LIMIT_ENABLED).toBeTypeOf('boolean');
    });

    it('should have valid CORS configuration', () => {
      expect(config.cors.CORS_ORIGINS).toBeInstanceOf(Array);
      expect(config.cors.CORS_CREDENTIALS).toBeTypeOf('boolean');
      expect(config.cors.CORS_MAX_AGE).toBeTypeOf('number');
      expect(config.cors.CORS_MAX_AGE).toBeGreaterThanOrEqual(0);
    });

    it('should have valid security configuration', () => {
      expect(config.security.SECURITY_HSTS_ENABLED).toBeTypeOf('boolean');
      expect(config.security.SECURITY_CSP_ENABLED).toBeTypeOf('boolean');
      expect(config.security.SECURITY_FRAME_GUARD_ENABLED).toBeTypeOf('boolean');
      expect(config.security.ALLOWED_HOSTS).toBeInstanceOf(Array);
      expect(config.security.TRUST_PROXY).toBeTypeOf('boolean');
    });

    it('should have valid monitoring configuration', () => {
      expect(config.monitoring.METRICS_ENABLED).toBeTypeOf('boolean');
      expect(config.monitoring.HEALTH_CHECK_ENABLED).toBeTypeOf('boolean');
      expect(config.monitoring.SWAGGER_ENABLED).toBeTypeOf('boolean');
      expect(config.monitoring.REQUEST_LOGGING_ENABLED).toBeTypeOf('boolean');
      expect(config.monitoring.ERROR_STACK_TRACE_ENABLED).toBeTypeOf('boolean');
    });
  });

  describe('Configuration Helpers', () => {
    it('should correctly identify environment', () => {
      // Em testes, NODE_ENV deveria ser 'test'
      expect(configHelpers.isTest()).toBe(true);
      expect(configHelpers.isDevelopment()).toBe(false);
      expect(configHelpers.isProduction()).toBe(false);
    });

    it('should provide authentication status', () => {
      const isAuthEnabled = configHelpers.isAuthEnabled();
      expect(isAuthEnabled).toBeTypeOf('boolean');
      expect(isAuthEnabled).toBe(config.auth.AUTH_ENABLED);
    });

    it('should provide rate limiting status', () => {
      const isRateLimitEnabled = configHelpers.isRateLimitEnabled();
      expect(isRateLimitEnabled).toBeTypeOf('boolean');
      expect(isRateLimitEnabled).toBe(config.rateLimit.RATE_LIMIT_ENABLED);
    });

    it('should provide Redis configuration status', () => {
      const isRedisConfigured = configHelpers.isRedisConfigured();
      expect(isRedisConfigured).toBeTypeOf('boolean');
    });

    it('should provide Swagger enabled status', () => {
      const isSwaggerEnabled = configHelpers.isSwaggerEnabled();
      expect(isSwaggerEnabled).toBeTypeOf('boolean');
      expect(isSwaggerEnabled).toBe(config.monitoring.SWAGGER_ENABLED);
    });

    it('should generate service health URLs', () => {
      const aiHealthUrl = configHelpers.getServiceHealthUrl('ai');
      expect(aiHealthUrl).toBe(config.services.AI_SERVICE_URL + '/health');

      const whatsappHealthUrl = configHelpers.getServiceHealthUrl('whatsapp');
      expect(whatsappHealthUrl).toBe(config.services.WHATSAPP_SERVICE_URL + '/health');

      const funnelHealthUrl = configHelpers.getServiceHealthUrl('funnel');
      expect(funnelHealthUrl).toBe(config.services.FUNNEL_ENGINE_URL + '/health');

      const analyticsHealthUrl = configHelpers.getServiceHealthUrl('analytics');
      expect(analyticsHealthUrl).toBe(config.services.ANALYTICS_SERVICE_URL + '/health');
    });

    it('should provide Redis connection options', () => {
      const redisOptions = configHelpers.getRedisOptions();
      expect(redisOptions).toBeTypeOf('object');

      if (config.cache.REDIS_URL) {
        expect(redisOptions).toHaveProperty('url');
      } else {
        expect(redisOptions).toHaveProperty('host');
        expect(redisOptions).toHaveProperty('port');
        expect(redisOptions).toHaveProperty('db');
      }
    });

    it('should provide CORS origins', () => {
      const corsOrigins = configHelpers.getCorsOrigins();
      expect(corsOrigins).toBeInstanceOf(Array);
      expect(corsOrigins).toEqual(config.cors.CORS_ORIGINS);
    });

    it('should provide allowed hosts', () => {
      const allowedHosts = configHelpers.getAllowedHosts();
      expect(allowedHosts).toBeInstanceOf(Array);
      expect(allowedHosts).toEqual(config.security.ALLOWED_HOSTS);
    });
  });

  describe('Configuration Summary', () => {
    it('should generate configuration summary', () => {
      const summary = getConfigSummary();

      expect(summary).toBeTypeOf('object');
      expect(summary).toHaveProperty('environment');
      expect(summary).toHaveProperty('server');
      expect(summary).toHaveProperty('features');
      expect(summary).toHaveProperty('services');
      expect(summary).toHaveProperty('security');

      // Verificar estrutura do server
      expect(summary.server).toHaveProperty('host');
      expect(summary.server).toHaveProperty('port');
      expect(summary.server).toHaveProperty('apiVersion');

      // Verificar estrutura das features
      expect(summary.features).toHaveProperty('authEnabled');
      expect(summary.features).toHaveProperty('rateLimitEnabled');
      expect(summary.features).toHaveProperty('swaggerEnabled');
      expect(summary.features).toHaveProperty('metricsEnabled');
      expect(summary.features).toHaveProperty('redisConfigured');

      // Verificar estrutura dos services
      expect(summary.services).toHaveProperty('ai');
      expect(summary.services).toHaveProperty('whatsapp');
      expect(summary.services).toHaveProperty('funnel');
      expect(summary.services).toHaveProperty('analytics');

      // Verificar estrutura da security
      expect(summary.security).toHaveProperty('corsOrigins');
      expect(summary.security).toHaveProperty('allowedHosts');
      expect(summary.security).toHaveProperty('hstsEnabled');
      expect(summary.security).toHaveProperty('cspEnabled');
    });

    it('should have correct values in summary', () => {
      const summary = getConfigSummary();

      expect(summary.environment).toBe(config.server.NODE_ENV);
      expect(summary.server.host).toBe(config.server.HOST);
      expect(summary.server.port).toBe(config.server.PORT);
      expect(summary.server.apiVersion).toBe(config.server.API_VERSION);

      expect(summary.features.authEnabled).toBe(config.auth.AUTH_ENABLED);
      expect(summary.features.rateLimitEnabled).toBe(config.rateLimit.RATE_LIMIT_ENABLED);
      expect(summary.features.swaggerEnabled).toBe(config.monitoring.SWAGGER_ENABLED);
      expect(summary.features.metricsEnabled).toBe(config.monitoring.METRICS_ENABLED);

      expect(summary.services.ai).toBe(config.services.AI_SERVICE_URL);
      expect(summary.services.whatsapp).toBe(config.services.WHATSAPP_SERVICE_URL);
      expect(summary.services.funnel).toBe(config.services.FUNNEL_ENGINE_URL);
      expect(summary.services.analytics).toBe(config.services.ANALYTICS_SERVICE_URL);

      expect(summary.security.corsOrigins).toBe(config.cors.CORS_ORIGINS.length);
      expect(summary.security.allowedHosts).toBe(config.security.ALLOWED_HOSTS.length);
      expect(summary.security.hstsEnabled).toBe(config.security.SECURITY_HSTS_ENABLED);
      expect(summary.security.cspEnabled).toBe(config.security.SECURITY_CSP_ENABLED);
    });
  });

  describe('Environment-specific Defaults', () => {
    it('should use appropriate defaults for test environment', () => {
      // Em teste, algumas configurações devem ter valores específicos
      expect(config.server.NODE_ENV).toBe('test');

      // JWT_SECRET deve ter pelo menos 32 caracteres
      expect(config.auth.JWT_SECRET.length).toBeGreaterThanOrEqual(32);

      // URLs de serviços devem ser válidas
      expect(config.services.AI_SERVICE_URL).toMatch(/^https?:\/\/.+/);
      expect(config.services.WHATSAPP_SERVICE_URL).toMatch(/^https?:\/\/.+/);
      expect(config.services.FUNNEL_ENGINE_URL).toMatch(/^https?:\/\/.+/);
      expect(config.services.ANALYTICS_SERVICE_URL).toMatch(/^https?:\/\/.+/);
    });

    it('should have valid array configurations', () => {
      // CORS_ORIGINS deve ser um array
      expect(config.cors.CORS_ORIGINS).toBeInstanceOf(Array);
      expect(config.cors.CORS_ORIGINS.length).toBeGreaterThan(0);

      // ALLOWED_HOSTS deve ser um array
      expect(config.security.ALLOWED_HOSTS).toBeInstanceOf(Array);
      expect(config.security.ALLOWED_HOSTS.length).toBeGreaterThan(0);
    });

    it('should have sensible numeric ranges', () => {
      // PORT deve estar em range válido
      expect(config.server.PORT).toBeGreaterThan(1023);
      expect(config.server.PORT).toBeLessThan(65536);

      // Timeouts devem estar em ranges sensíveis
      expect(config.services.SERVICE_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
      expect(config.services.SERVICE_TIMEOUT_MS).toBeLessThanOrEqual(30000);

      // Rate limits devem ser positivos
      expect(config.rateLimit.RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
      expect(config.rateLimit.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
      expect(config.rateLimit.RATE_LIMIT_MAX_REQUESTS_PER_TENANT).toBeGreaterThan(0);

      // Cache TTL deve ser positivo
      expect(config.cache.CACHE_TTL_SECONDS).toBeGreaterThan(0);

      // CORS max age deve ser não-negativo
      expect(config.cors.CORS_MAX_AGE).toBeGreaterThanOrEqual(0);
    });
  });
});
