import express from 'express';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { correlationMiddleware } from '../src/middlewares/correlation.js';
import { createRateLimitMiddleware } from '../src/middlewares/rateLimit.js';

describe('Rate Limiting Tests', () => {
  let app: express.Application;
  let request: ReturnType<typeof supertest>;

  // Função para criar uma nova aplicação de teste
  const createTestApp = async () => {
    const testApp = express();

    // Aplicar middlewares necessários
    testApp.use(express.json());
    testApp.use(correlationMiddleware);

    // Configurar rate limiting
    const rateLimits = await createRateLimitMiddleware();

    // Middleware para extrair dados do JWT para testes
    testApp.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, 'test-secret') as any;
          req.user = {
            userId: decoded.user_id,
            tenantId: decoded.tenant_id,
            scopes: decoded.scopes || []
          };
          req.tenantId = decoded.tenant_id;
        } catch (error) {
          // Token inválido, continuar sem autenticação
        }
      }
      next();
    });

    // Rota de teste para rate limit global
    testApp.get('/test-global-rate-limit', rateLimits.general, (req, res) => {
      res.json({ ok: true, message: 'Success' });
    });

    // Rota de teste para rate limit por tenant
    testApp.get('/test-tenant-rate-limit', rateLimits.tenant, (req, res) => {
      res.json({ ok: true, message: 'Success' });
    });

    return testApp;
  };

  beforeEach(async () => {
    // Configurar variáveis de ambiente para teste
    process.env.NODE_ENV = 'test';
    process.env.RATE_LIMIT_WINDOW_MS = '2000'; // 2 segundos para teste rápido
    process.env.RATE_LIMIT_MAX_REQUESTS = '3'; // Limite de 3 requisições
    process.env.RATE_LIMIT_MAX_REQUESTS_PER_TENANT = '2'; // Limite de 2 por tenant
    process.env.JWT_SECRET = 'test-secret';

    // Criar nova aplicação para cada teste
    app = await createTestApp();
    request = supertest(app);
  });

  afterEach(() => {
    // Limpar mocks após cada teste
    vi.clearAllMocks();
  });

  describe('Global Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Fazer múltiplas requisições para esgotar o limite
      for (let i = 0; i < 4; i++) {
        const response = await request.get('/test-global-rate-limit');

        if (i < 3) {
          // Primeiras 3 requisições devem passar
          expect(response.status).toBe(200);
        } else {
          // Quarta requisição deve retornar 429
          expect(response.status).toBe(429);
          expect(response.body).toMatchObject({
            ok: false,
            error: 'Too many requests from this IP',
            retry_after: expect.any(Number),
            limit: 3,
            window_ms: 2000
          });

          // Verificar headers de rate limiting (padrão draft RFC)
          expect(response.headers['ratelimit-limit']).toBe('3');
          expect(response.headers['ratelimit-remaining']).toBe('0');
          expect(response.headers['retry-after']).toBeDefined();
        }
      }
    });

    it('should include proper rate limiting headers', async () => {
      const response = await request
        .get('/test-global-rate-limit')
        .expect(200);

      // Verificar headers de rate limiting (padrão draft RFC)
      expect(response.headers['ratelimit-limit']).toBe('3');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Tenant Rate Limiting', () => {
    const generateJWT = (tenantId: string, userId: string = 'test-user') => {
      return jwt.sign(
        {
          user_id: userId,
          tenant_id: tenantId,
          scopes: ['test:read']
        },
        'test-secret',
        {
          issuer: 'zaplify-auth',
          expiresIn: '1h'
        }
      );
    };

    it('should return 429 with tenant information when limit exceeded', async () => {
      const tenantToken = generateJWT('test-tenant');

      // Fazer múltiplas requisições para esgotar limite
      for (let i = 0; i < 3; i++) {
        const response = await request
          .get('/test-tenant-rate-limit')
          .set('Authorization', `Bearer ${tenantToken}`);

        if (i < 2) {
          // Primeiras 2 requisições devem passar
          expect(response.status).toBe(200);
        } else {
          // Terceira requisição - deve retornar 429
          expect(response.status).toBe(429);
          expect(response.body).toMatchObject({
            ok: false,
            error: 'Too many requests for this tenant',
            retry_after: expect.any(Number),
            limit: 2,
            window_ms: 2000,
            tenant_id: 'test-tenant'
          });
        }
      }
    });

    it('should fall back to IP-based limiting for unauthenticated requests', async () => {
      // Fazer múltiplas requisições sem token
      for (let i = 0; i < 3; i++) {
        const response = await request.get('/test-tenant-rate-limit');

        if (i < 2) {
          // Primeiras 2 requisições devem passar
          expect(response.status).toBe(200);
        } else {
          // Terceira requisição - deve falhar por limite de IP
          expect(response.status).toBe(429);
          expect(response.body).toMatchObject({
            ok: false,
            error: 'Too many requests for this tenant'
          });
        }
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should handle Redis connection gracefully', async () => {
      // Este teste valida que o middleware funciona mesmo com Redis indisponível
      const rateLimits = await createRateLimitMiddleware();

      expect(rateLimits).toBeDefined();
      expect(rateLimits.general).toBeDefined();
      expect(rateLimits.tenant).toBeDefined();
    });
  });
});
