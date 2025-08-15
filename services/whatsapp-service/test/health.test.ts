import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { correlationMiddleware } from '../src/middlewares/correlation.js';
import healthRoutes from '../src/routes/health.js';

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);
    app.use(healthRoutes);
  });

  describe('GET /health', () => {
    it('should return health status with 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        service: 'whatsapp-service',
        status: 'ok',
        timestamp: expect.any(String),
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include correlation headers in response', async () => {
      const response = await request(app)
        .get('/health')
        .set('x-correlation-id', 'test-correlation-123')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe('test-correlation-123');
    });

    it('should set default tenant-id when not provided', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-tenant-id']).toBe('default');
    });

    it('should propagate custom tenant-id', async () => {
      const customTenantId = 'custom-tenant';

      const response = await request(app)
        .get('/health')
        .set('x-tenant-id', customTenantId)
        .expect(200);

      expect(response.headers['x-tenant-id']).toBe(customTenantId);
    });
  });
});
