import { randomUUID } from 'crypto';
import express from 'express';
import nock from 'nock';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Import middlewares and routes
import {
  correlationMiddleware,
  createBodyParserMiddleware,
  createCorsMiddleware,
  createSecurityMiddleware,
  globalErrorHandler,
  notFoundHandler
} from '../src/middlewares/index.js';
import { healthRouter } from '../src/routes/index.js';

describe('Health Endpoint Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Configure test environment variables
    process.env.NODE_ENV = 'test';
    process.env.AI_SERVICE_URL = 'http://ia-service:8001';
    process.env.WHATSAPP_SERVICE_URL = 'http://whatsapp-service:8081';
    process.env.FUNNEL_ENGINE_URL = 'http://funnel-engine:8082';
    process.env.ANALYTICS_SERVICE_URL = 'http://analytics-service:8002';

    // Create test app
    app = express();

    // Apply middlewares (same order as main app)
    app.use(createSecurityMiddleware());
    app.use(createCorsMiddleware());

    const bodyParsers = createBodyParserMiddleware();
    bodyParsers.forEach(parser => app.use(parser));

    app.use(correlationMiddleware);

    // Add health routes
    app.use(healthRouter);

    // Error handlers
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
  });

  afterAll(() => {
    // Clean up nock after all tests
    nock.cleanAll();
  });

  it('should return 200 with ok:true and deps structure', async () => {
    // Mock all service health endpoints to return success
    nock('http://ia-service:8001')
      .get('/health')
      .reply(200, { ok: true, service: 'ia-conversational' });

    nock('http://whatsapp-service:8081')
      .get('/health')
      .reply(200, { ok: true, service: 'whatsapp' });

    nock('http://funnel-engine:8082')
      .get('/health')
      .reply(200, { ok: true, service: 'funnel' });

    nock('http://analytics-service:8002')
      .get('/health')
      .reply(200, { ok: true, service: 'analytics' });

    const correlationId = randomUUID();
    const tenantId = 'test-tenant';

    const response = await request(app)
      .get('/health')
      .set('x-correlation-id', correlationId)
      .set('x-tenant-id', tenantId)
      .expect(200);

    // Validate response structure
    expect(response.body).toMatchObject({
      ok: true,
      service: 'api-gateway',
      deps: {
        ia: expect.objectContaining({
          ok: expect.any(Boolean),
          service: expect.any(String)
        }),
        whatsapp: expect.objectContaining({
          ok: expect.any(Boolean),
          service: expect.any(String)
        }),
        funnel: expect.objectContaining({
          ok: expect.any(Boolean),
          service: expect.any(String)
        }),
        analytics: expect.objectContaining({
          ok: expect.any(Boolean),
          service: expect.any(String)
        })
      },
      tenant_id: tenantId,
      correlation_id: correlationId,
      timestamp: expect.any(String)
    });

    // Validate correlation header is propagated
    expect(response.headers['x-correlation-id']).toBe(correlationId);
    expect(response.headers['x-tenant-id']).toBe(tenantId);
  });

  it('should return 200 even when some services are down', async () => {
    // Mock mixed responses - some healthy, some down
    nock('http://localhost:8001')
      .get('/health')
      .reply(200, { ok: true }); // IA service up

    nock('http://localhost:8002')
      .get('/health')
      .reply(500, { ok: false }); // WhatsApp service down

    // Note: Not mocking funnel and analytics to simulate failure

    const response = await request(app)
      .get('/health')
      .expect(200);

    // Even when services are down, health endpoint returns 200
    expect(response.body.ok).toBe(true);
    expect(response.body.deps).toBeDefined();

    // Verify specific service states based on our mocks
    expect(response.body.deps.ia.ok).toBe(true);
    expect(response.body.deps.whatsapp.ok).toBe(false);
    expect(response.body.deps.funnel.ok).toBe(false);
    expect(response.body.deps.analytics.ok).toBe(false);
  }); it('should generate correlation-id when not provided', async () => {
    // Mock all services for this test
    nock('http://ia-service:8001')
      .get('/health')
      .reply(200, { ok: true, service: 'ia' });

    nock('http://whatsapp-service:8081')
      .get('/health')
      .reply(200, { ok: true, service: 'whatsapp' });

    nock('http://funnel-engine:8082')
      .get('/health')
      .reply(200, { ok: true, service: 'funnel' });

    nock('http://analytics-service:8002')
      .get('/health')
      .reply(200, { ok: true, service: 'analytics' });

    const response = await request(app)
      .get('/health')
      .expect(200);

    // Should generate correlation-id automatically
    expect(response.body.correlation_id).toBeDefined();
    expect(response.body.correlation_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Should default tenant_id to 'default'
    expect(response.body.tenant_id).toBe('default');

    // Headers should match response
    expect(response.headers['x-correlation-id']).toBe(response.body.correlation_id);
    expect(response.headers['x-tenant-id']).toBe('default');
  });

  it('should include response time tracking for deps', async () => {
    // Mock services with delays
    nock('http://ia-service:8001')
      .get('/health')
      .delay(100)
      .reply(200, { ok: true, service: 'ia' });

    nock('http://whatsapp-service:8081')
      .get('/health')
      .delay(50)
      .reply(200, { ok: true, service: 'whatsapp' });

    nock('http://funnel-engine:8082')
      .get('/health')
      .reply(200, { ok: true, service: 'funnel' });

    nock('http://analytics-service:8002')
      .get('/health')
      .reply(200, { ok: true, service: 'analytics' });

    const response = await request(app)
      .get('/health')
      .expect(200);

    // Should include responseTime for each service
    expect(response.body.deps.ia.responseTime).toBeGreaterThan(0);
    expect(response.body.deps.whatsapp.responseTime).toBeGreaterThan(0);
    expect(response.body.deps.funnel.responseTime).toBeGreaterThan(0);
    expect(response.body.deps.analytics.responseTime).toBeGreaterThan(0);

    // Services with delay should have higher response times (very tolerant expectations)
    expect(response.body.deps.ia.responseTime).toBeGreaterThan(3);
    expect(response.body.deps.whatsapp.responseTime).toBeGreaterThan(3);
  });
});
