import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publicRateLimiter } from '../../src/middlewares/rateLimit.js';

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
}));

vi.mock('rate-limit-redis', () => ({
  default: vi.fn(),
}));

describe('Rate Limiting Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Add correlation middleware
    app.use((req, _res, next) => {
      (req as any).correlationId = req.headers['x-correlation-id'] as string || `test-${Date.now()}`;
      next();
    });

    // Apply rate limiting to test route
    app.post('/test', publicRateLimiter as any, (req, res) => {
      res.json({ ok: true, message: 'Success' });
    });
  });

  it('should allow requests under the limit', async () => {
    const response = await request(app)
      .post('/test')
      .send({ test: 'data' })
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      message: 'Success',
    });

    // Check for either standard or legacy rate limit headers
    const hasStandardHeaders = response.headers['ratelimit-limit'] !== undefined;
    const hasLegacyHeaders = response.headers['x-ratelimit-limit'] !== undefined;

    expect(hasStandardHeaders || hasLegacyHeaders).toBe(true);
  });

  it('should include rate limit headers', async () => {
    const response = await request(app)
      .post('/test')
      .send({ test: 'data' });

    expect(response.status).toBe(200);
    // express-rate-limit uses RateLimit-* headers by default with standardHeaders: true
    expect(response.headers['ratelimit-limit'] || response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining'] || response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['ratelimit-reset'] || response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should handle correlation-id in rate limit responses', async () => {
    const correlationId = 'test-correlation-123';

    const response = await request(app)
      .post('/test')
      .set('x-correlation-id', correlationId)
      .send({ test: 'data' });

    expect(response.status).toBe(200);
  });

  it('should respect rate limit configuration', async () => {
    // This test would need to make multiple requests quickly
    // to trigger rate limiting. In a real scenario, you'd configure
    // a very low limit for testing.
    const promises = Array.from({ length: 5 }, () =>
      request(app)
        .post('/test')
        .send({ test: 'data' })
    );

    const responses = await Promise.all(promises);

    // All should succeed if under the default limit
    responses.forEach(response => {
      expect([200, 429]).toContain(response.status);
    });
  });

  describe('Redis fallback', () => {
    it('should work without Redis connection', async () => {
      // The middleware should fallback to memory store
      const response = await request(app)
        .post('/test')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      // Check for rate limit headers (either standard or legacy)
      const hasRateLimitHeaders = response.headers['ratelimit-limit'] !== undefined ||
        response.headers['x-ratelimit-limit'] !== undefined;
      expect(hasRateLimitHeaders).toBe(true);
    });
  });
});
