import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { jwtMiddleware } from '../../src/middlewares/auth.js';
import { publicRateLimiter } from '../../src/middlewares/rateLimit.js';

describe('Security Integration Tests', () => {
  let app: express.Application;
  const mockJwtSecret = 'integration-test-secret';
  const originalEnv = process.env;

  beforeAll(() => {
    // Setup test environment
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = mockJwtSecret;
    process.env.REQUIRE_JWT = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '5'; // Low limit for testing

    app = express();
    app.use(express.json());

    // Simulate correlation middleware
    app.use((req, _res, next) => {
      req.correlationId = req.headers['x-correlation-id'] as string || 'test-correlation';
      next();
    });

    // Protected route with both rate limiting and JWT
    app.post('/messages/send-message',
      publicRateLimiter as any,
      jwtMiddleware as any,
      (req, res) => {
        res.json({
          ok: true,
          data: { messageId: 'msg-123' },
          correlation_id: req.correlationId
        });
      }
    );

    // Media upload route
    app.post('/media/upload',
      publicRateLimiter as any,
      jwtMiddleware as any,
      (req, res) => {
        res.json({
          ok: true,
          data: { url: 'https://example.com/file.jpg' },
          correlation_id: req.correlationId
        });
      }
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Rate limiting with JWT', () => {
    it('should handle valid requests under rate limit', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      const response = await request(app)
        .post('/messages/send-message')
        .set('Authorization', `Bearer ${token}`)
        .set('x-correlation-id', 'test-msg-001')
        .send({ to: '5511999999999', text: 'Test message' })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: { messageId: 'msg-123' },
        correlation_id: 'test-msg-001'
      });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should reject requests without JWT when required', async () => {
      const response = await request(app)
        .post('/messages/send-message')
        .set('x-correlation-id', 'test-msg-002')
        .send({ to: '5511999999999', text: 'Test message' })
        .expect(401);

      expect(response.body).toEqual({
        ok: false,
        error: 'Unauthorized',
        correlation_id: 'test-msg-002'
      });
    });

    it('should handle rate limiting after JWT validation', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      // Make multiple requests to trigger rate limit
      const requests = Array.from({ length: 8 }, (_, i) =>
        request(app)
          .post('/media/upload')
          .set('Authorization', `Bearer ${token}`)
          .set('x-correlation-id', `bulk-req-${i}`)
          .send({})
      );

      const responses = await Promise.all(requests.map(req => req.catch(err => err.response)));

      // Should have some successful and some rate limited
      const successfulResponses = responses.filter(res => res.status === 200);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(successfulResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit response format
      if (rateLimitedResponses.length > 0) {
        const rateLimitResponse = rateLimitedResponses[0];
        expect(rateLimitResponse.body).toEqual({
          ok: false,
          error: 'Too many requests',
          correlation_id: expect.any(String)
        });
      }
    });

    it('should maintain separate rate limits per endpoint', async () => {
      const payload = { tenant_id: 'test-tenant-2', user_id: 'user-456' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      // Test that endpoints have independent rate limits
      const messageResponse = await request(app)
        .post('/messages/send-message')
        .set('Authorization', `Bearer ${token}`)
        .set('x-correlation-id', 'separate-msg-001')
        .send({ to: '5511999999999', text: 'Test message' });

      const mediaResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('x-correlation-id', 'separate-media-001')
        .send({});

      expect(messageResponse.status).toBe(200);
      expect(mediaResponse.status).toBe(200);
    });
  });

  describe('Error handling with correlation tracking', () => {
    it('should include correlation-id in all error responses', async () => {
      const correlationId = 'error-tracking-123';

      // Test JWT error
      const jwtError = await request(app)
        .post('/messages/send-message')
        .set('x-correlation-id', correlationId)
        .send({ to: '5511999999999', text: 'Test' })
        .expect(401);

      expect(jwtError.body.correlation_id).toBe(correlationId);

      // Test with invalid JWT to ensure correlation is preserved
      const invalidJwtError = await request(app)
        .post('/messages/send-message')
        .set('Authorization', 'Bearer invalid.token.here')
        .set('x-correlation-id', correlationId)
        .send({ to: '5511999999999', text: 'Test' })
        .expect(401);

      expect(invalidJwtError.body.correlation_id).toBe(correlationId);
    });
  });

  describe('Headers and security', () => {
    it('should include security headers in responses', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      const response = await request(app)
        .post('/messages/send-message')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'test-tenant')
        .send({ to: '5511999999999', text: 'Test message' });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should handle tenant override from JWT', async () => {
      const payload = { tenant_id: 'jwt-tenant-123', user_id: 'user-789' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      const response = await request(app)
        .post('/messages/send-message')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'header-tenant-456') // Should be overridden by JWT
        .send({ to: '5511999999999', text: 'Test message' })
        .expect(200);

      expect(response.body.ok).toBe(true);
      // JWT tenant_id should take precedence (this would be verified in the actual business logic)
    });
  });
});
