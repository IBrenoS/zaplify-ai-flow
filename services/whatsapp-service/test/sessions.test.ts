import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import nock from 'nock';
import { correlationMiddleware } from '../src/middlewares/correlation.js';
import sessionsRoutes from '../src/routes/sessions.js';
import { config } from '../src/config/env.js';

describe('Sessions Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);
    app.use('/sessions', sessionsRoutes);

    // Error handler for tests
    app.use((error: Error, req: express.Request, res: express.Response) => {
      res.status(500).json({
        ok: false,
        error: error.message,
        correlation_id: req.correlationId,
      });
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('POST /sessions/connect', () => {
    it('should start session successfully - happy path', async () => {
      const sessionId = 'test-session';
      const mockResponse = {
        success: true,
        data: {
          instance: {
            instanceName: sessionId,
            status: 'created',
          },
          qrcode: {
            base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .post(`/instance/create/${sessionId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .post('/sessions/connect')
        .send({ sessionId })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        sessionId,
        status: 'created',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        correlationId: expect.any(String),
      });
    });

    it('should use tenant ID as default session ID', async () => {
      const tenantId = 'tenant-123';
      const mockResponse = {
        success: true,
        data: {
          instance: {
            instanceName: tenantId,
            status: 'created',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .post(`/instance/create/${tenantId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .post('/sessions/connect')
        .set('x-tenant-id', tenantId)
        .send({})
        .expect(200);

      expect(response.body.sessionId).toBe(tenantId);
    });

    it('should return 502 on Evolution API 5xx error', async () => {
      const sessionId = 'test-session';

      nock(config.EVOLUTION_BASE_URL)
        .post(`/instance/create/${sessionId}`)
        .reply(500, {
          message: 'Internal server error',
        });

      const response = await request(app)
        .post('/sessions/connect')
        .send({ sessionId })
        .expect(502);

      expect(response.body).toEqual({
        ok: false,
        error: expect.stringContaining('Evolution API startSession failed'),
        correlation_id: expect.any(String),
      });
    });

    it('should return 502 on Evolution API 4xx error', async () => {
      const sessionId = 'test-session';

      nock(config.EVOLUTION_BASE_URL)
        .post(`/instance/create/${sessionId}`)
        .reply(400, {
          message: 'Bad request',
        });

      const response = await request(app)
        .post('/sessions/connect')
        .send({ sessionId })
        .expect(502);

      expect(response.body).toEqual({
        ok: false,
        error: expect.stringContaining('Evolution API startSession failed'),
        correlation_id: expect.any(String),
      });
    });
  });

  describe('GET /sessions/qr-code', () => {
    it('should get QR code successfully - happy path', async () => {
      const sessionId = 'test-session';
      const mockResponse = {
        success: true,
        data: {
          qrcode: {
            base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          },
          instance: {
            instanceName: sessionId,
            status: 'disconnected',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .get(`/instance/connect/${sessionId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .get('/sessions/qr-code')
        .query({ sessionId })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        sessionId,
        qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        status: 'disconnected',
        correlationId: expect.any(String),
      });
    });

    it('should return 400 when sessionId is missing', async () => {
      const response = await request(app)
        .get('/sessions/qr-code')
        .expect(400);

      expect(response.body).toEqual({
        ok: false,
        error: 'sessionId is required',
        correlation_id: expect.any(String),
      });
    });

    it('should return 502 on Evolution API error', async () => {
      const sessionId = 'test-session';

      nock(config.EVOLUTION_BASE_URL)
        .get(`/instance/connect/${sessionId}`)
        .reply(503, {
          message: 'Service unavailable',
        });

      const response = await request(app)
        .get('/sessions/qr-code')
        .query({ sessionId })
        .expect(502);

      expect(response.body).toEqual({
        ok: false,
        error: expect.stringContaining('Evolution API getQRCode failed'),
        correlation_id: expect.any(String),
      });
    });
  });

  describe('GET /sessions/status', () => {
    it('should get status successfully - happy path', async () => {
      const sessionId = 'test-session';
      const mockResponse = {
        success: true,
        data: {
          instance: {
            instanceName: sessionId,
            status: 'open',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .get(`/instance/connectionState/${sessionId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .get('/sessions/status')
        .query({ sessionId })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        sessionId,
        status: 'open',
        correlationId: expect.any(String),
      });
    });

    it('should return 400 when sessionId is missing', async () => {
      const response = await request(app)
        .get('/sessions/status')
        .expect(400);

      expect(response.body).toEqual({
        ok: false,
        error: 'sessionId is required',
        correlation_id: expect.any(String),
      });
    });

    it('should return 502 on Evolution API error', async () => {
      const sessionId = 'test-session';

      nock(config.EVOLUTION_BASE_URL)
        .get(`/instance/connectionState/${sessionId}`)
        .reply(500, {
          error: 'Database connection failed',
        });

      const response = await request(app)
        .get('/sessions/status')
        .query({ sessionId })
        .expect(502);

      expect(response.body).toEqual({
        ok: false,
        error: expect.stringContaining('Evolution API getStatus failed'),
        correlation_id: expect.any(String),
      });
    });
  });

  describe('Correlation and Tenant headers', () => {
    it('should propagate correlation headers in all responses', async () => {
      const sessionId = 'test-session';
      const correlationId = 'test-correlation-123';

      nock(config.EVOLUTION_BASE_URL)
        .get(`/instance/connectionState/${sessionId}`)
        .reply(200, {
          success: true,
          data: {
            instance: {
              instanceName: sessionId,
              status: 'open',
            },
          },
        });

      const response = await request(app)
        .get('/sessions/status')
        .query({ sessionId })
        .set('x-correlation-id', correlationId)
        .expect(200);

      expect(response.body.correlationId).toBe(correlationId);
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});
