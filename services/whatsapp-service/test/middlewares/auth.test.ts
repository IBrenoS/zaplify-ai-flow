import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { jwtMiddleware } from '../../src/middlewares/auth.js';

describe('JWT Authentication Middleware', () => {
  let app: express.Application;
  const mockJwtSecret = 'test-jwt-secret';
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = mockJwtSecret;

    app = express();
    app.use(express.json());

    // Add correlation middleware
    app.use((req, _res, next) => {
      (req as any).correlationId = req.headers['x-correlation-id'] as string || `test-${Date.now()}`;
      next();
    });

    // Apply JWT middleware to test route
    app.post('/protected', jwtMiddleware as any, (req, res) => {
      res.json({
        ok: true,
        message: 'Protected resource accessed',
        user: (req as any).user
      });
    });

    app.post('/public', (req, res) => {
      res.json({ ok: true, message: 'Public resource' });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when REQUIRE_JWT is false', () => {
    beforeEach(() => {
      process.env.REQUIRE_JWT = 'false';
    });

    it('should allow requests without JWT token', async () => {
      const response = await request(app)
        .post('/protected')
        .send({ test: 'data' })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Protected resource accessed',
        user: undefined,
      });
    });

    it('should include user payload for JWT tokens', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${token}`)
        .send({ test: 'data' })
        .expect(200);

      expect(response.body.user).toMatchObject(payload);
    });
  });

  describe('when REQUIRE_JWT is true', () => {
    beforeEach(() => {
      process.env.REQUIRE_JWT = 'true';
    });

    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .post('/protected')
        .send({ test: 'data' })
        .expect(401);

      expect(response.body).toEqual({
        ok: false,
        error: 'Unauthorized',
        correlation_id: expect.any(String),
      });
    });

    it('should reject requests with invalid Authorization format', async () => {
      const response = await request(app)
        .post('/protected')
        .set('Authorization', 'Invalid format')
        .send({ test: 'data' })
        .expect(401);

      expect(response.body).toEqual({
        ok: false,
        error: 'Unauthorized',
        correlation_id: expect.any(String),
      });
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .post('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({ test: 'data' })
        .expect(401);

      expect(response.body).toEqual({
        ok: false,
        error: 'Unauthorized',
        correlation_id: expect.any(String),
      });
    });

    it('should reject expired JWT tokens', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '-1h' }); // Expired

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${token}`)
        .send({ test: 'data' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should accept valid JWT token', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${token}`)
        .send({ test: 'data' })
        .expect(200);

      expect(response.body.user).toMatchObject(payload);
    });

    it('should override tenant_id from header if JWT tenant_id is provided', async () => {
      const payload = { tenant_id: 'jwt-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, mockJwtSecret, { expiresIn: '1h' });

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'header-tenant')
        .send({ test: 'data' })
        .expect(200);

      expect(response.body.user).toMatchObject(payload);
    });
  });

  describe('correlation-id handling', () => {
    beforeEach(() => {
      process.env.REQUIRE_JWT = 'true';
    });

    it('should include correlation-id in error responses', async () => {
      const correlationId = 'test-correlation-456';

      const response = await request(app)
        .post('/protected')
        .set('x-correlation-id', correlationId)
        .send({ test: 'data' })
        .expect(401);

      expect(response.body.correlation_id).toBe(correlationId);
    });

    it('should generate correlation-id if not provided', async () => {
      const response = await request(app)
        .post('/protected')
        .send({ test: 'data' })
        .expect(401);

      expect(response.body.correlation_id).toBeDefined();
      expect(typeof response.body.correlation_id).toBe('string');
    });
  });

  describe('missing JWT_SECRET', () => {
    beforeEach(() => {
      delete process.env.JWT_SECRET;
      process.env.REQUIRE_JWT = 'true';
    });

    it('should reject all requests when JWT_SECRET is missing', async () => {
      const payload = { tenant_id: 'test-tenant', user_id: 'user-123' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${token}`)
        .send({ test: 'data' })
        .expect(500);

      expect(response.body.error).toBe('Server configuration error');
    });
  });
});
