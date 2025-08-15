import { randomUUID } from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import nock from 'nock';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Import middlewares and routes
import {
  correlationMiddleware,
  createBodyParserMiddleware,
  createCorsMiddleware,
  createSecurityMiddleware,
  globalErrorHandler,
  notFoundHandler
} from '../src/middlewares/index.js';
import { createRateLimitMiddleware } from '../src/middlewares/rateLimit.js';
import protectedRouter from '../src/routes/protected.js';
import proxyRouter from '../src/routes/proxy.js';

describe('Proxy Endpoint Tests', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    // Configure test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_ISSUER = 'zaplify-auth';
    process.env.AI_SERVICE_URL = 'http://ia-service:8001';
    process.env.WHATSAPP_SERVICE_URL = 'http://whatsapp-service:8081';
    process.env.FUNNEL_ENGINE_URL = 'http://funnel-engine:8082';
    process.env.ANALYTICS_SERVICE_URL = 'http://analytics-service:8002';

    // Generate valid JWT token for tests
    validToken = jwt.sign(
      {
        user_id: 'test-user',
        tenant_id: 'test-tenant',
        scopes: ['analytics:read', 'ai:conversation', 'whatsapp:read', 'funnel:execute']
      },
      process.env.JWT_SECRET,
      {
        issuer: process.env.JWT_ISSUER,
        expiresIn: '1h'
      }
    );

    // Create test app
    app = express();

    // Apply middlewares (same order as main app)
    app.use(createSecurityMiddleware());
    app.use(createCorsMiddleware());

    const rateLimits = await createRateLimitMiddleware();
    app.use(rateLimits.general);

    const bodyParsers = createBodyParserMiddleware();
    bodyParsers.forEach(parser => app.use(parser));

    app.use(correlationMiddleware);

    // Add protected routes with proxy
    app.use('/api/v1',
      rateLimits.tenant,
      protectedRouter,
      proxyRouter
    );

    // Error handlers
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
  });

  beforeEach(() => {
    // Clean nock before each test
    nock.cleanAll();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  describe('Analytics Proxy - Successful Response', () => {
    it('should proxy /api/v1/analytics/real-time and return 200', async () => {
      const mockResponse = {
        ok: true,
        data: {
          activeUsers: 125,
          conversions: 8,
          responseTime: 250
        },
        timestamp: new Date().toISOString()
      };

      // Mock successful analytics service response
      nock('http://analytics-service:8002')
        .get('/analytics/real-time')
        .reply(200, mockResponse);

      const correlationId = randomUUID();

      const response = await request(app)
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-correlation-id', correlationId)
        .set('x-tenant-id', 'test-tenant')
        .expect(200);

      // Validate response body matches downstream (check data field content)
      expect(response.body.data.data).toEqual(mockResponse);

      // Validate correlation header propagation
      expect(response.headers['x-correlation-id']).toBe(correlationId);
      expect(response.headers['x-tenant-id']).toBe('test-tenant');
    });

    it('should propagate headers to downstream service', async () => {
      const correlationId = randomUUID();
      const tenantId = 'proxy-test-tenant';

      // Mock with header validation
      nock('http://analytics-service:8002')
        .get('/analytics/real-time')
        .matchHeader('x-correlation-id', correlationId)
        .matchHeader('x-tenant-id', tenantId)
        .matchHeader('authorization', `Bearer ${validToken}`)
        .reply(200, { ok: true, headers_received: true });

      await request(app)
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-correlation-id', correlationId)
        .set('x-tenant-id', tenantId)
        .expect(200);

      // Verify all nock interceptors were called
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('Proxy - Downstream Failure (502)', () => {
    it('should return 502 when downstream service is unavailable', async () => {
      // Mock service unavailable
      nock('http://analytics-service:8002')
        .get('/analytics/real-time')
        .replyWithError('ECONNREFUSED');

      const correlationId = randomUUID();

      const response = await request(app)
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-correlation-id', correlationId)
        .expect(502);

      // Validate error response structure (no 'Bad Gateway' in message)
      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Downstream service error'),
        tenant_id: 'test-tenant',
        correlation_id: expect.any(String),
      });

      // Headers should still be propagated
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });

    it('should return 502 when downstream returns 500', async () => {
      // Mock internal server error
      nock('http://analytics-service:8002')
        .get('/analytics/real-time')
        .reply(500, { error: 'Internal Server Error', message: 'Database connection failed' });

      const response = await request(app)
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(502);

      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Analytics service unavailable');
      // Note: service field might not be present in the actual error response
    });

    it('should handle timeout scenarios', async () => {
      // Mock delayed response (longer than 5s timeout)
      nock('http://analytics-service:8002')
        .get('/analytics/real-time')
        .delay(6000) // 6 seconds delay
        .reply(200, { ok: true });

      const response = await request(app)
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(502);

      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Downstream service error');
    });
  });

  describe('Multiple Proxy Routes', () => {
    it('should proxy AI conversation endpoint', async () => {
      const mockAIResponse = {
        conversation_id: 'conv_123',
        response: 'Hello! How can I help you today?',
        tokens_used: 25
      };

      nock('http://ia-service:8001')
        .post('/conversation')
        .reply(200, mockAIResponse);

      const response = await request(app)
        .post('/api/v1/ai/conversation')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ message: 'Hello' })
        .expect(200);

      expect(response.body.data.data).toEqual(mockAIResponse);
    });

    it('should proxy WhatsApp status endpoint', async () => {
      const mockWAResponse = {
        status: 'connected',
        session_id: 'wa_session_123',
        last_activity: new Date().toISOString()
      };

      nock('http://whatsapp-service:8081')
        .get('/status')
        .reply(200, mockWAResponse);

      const response = await request(app)
        .get('/api/v1/whatsapp/status')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.data).toEqual(mockWAResponse);
    });

    it('should proxy Funnel execution endpoint', async () => {
      const mockFunnelResponse = {
        execution_id: 'exec_456',
        funnel_id: 'funnel_123',
        status: 'started',
        steps_completed: 0
      };

      nock('http://funnel-engine:8082')
        .post('/funnel/execute')
        .reply(200, mockFunnelResponse);

      const response = await request(app)
        .post('/api/v1/funnel/execute')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ funnel_id: 'funnel_123' })
        .expect(200);

      expect(response.body.data.data).toEqual(mockFunnelResponse);
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 without valid token', async () => {
      await request(app)
        .get('/api/v1/analytics/real-time')
        .expect(401);
    });

    it('should return 403 with insufficient scopes', async () => {
      // Create token with limited scopes
      const limitedToken = jwt.sign(
        {
          user_id: 'limited-user',
          tenant_id: 'test-tenant',
          scopes: ['ai:read'] // Missing analytics:read
        },
        process.env.JWT_SECRET!,
        {
          issuer: process.env.JWT_ISSUER,
          expiresIn: '1h'
        }
      );

      await request(app)
        .get('/api/v1/analytics/real-time')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });
  });
});
