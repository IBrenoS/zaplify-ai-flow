import express from 'express';
import nock from 'nock';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config/env.js';
import { correlationMiddleware } from '../src/middlewares/correlation.js';
import messagesRoutes from '../src/routes/messages.js';

describe('Messages Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);
    app.use('/messages', messagesRoutes);

    // Error handler for tests
    app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
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

  describe('POST /messages/send-message', () => {
    it('should send text message successfully', async () => {
      const sessionId = 'test-session';
      const to = '5511999999999';
      const text = 'Hello, World!';

      const mockResponse = {
        success: true,
        data: {
          key: {
            remoteJid: to,
            fromMe: true,
            id: 'message-123',
          },
          message: {
            messageId: 'message-123',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .post(`/message/sendText/${sessionId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .post('/messages/send-message')
        .send({ sessionId, to, text })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        messageId: 'message-123',
        sessionId,
        to,
        type: 'text',
        correlationId: expect.any(String),
      });
    });

    it('should send media message successfully', async () => {
      const sessionId = 'test-session';
      const to = '5511999999999';
      const mediaUrl = 'https://example.com/image.jpg';
      const text = 'Check this image!';

      const mockResponse = {
        success: true,
        data: {
          key: {
            remoteJid: to,
            fromMe: true,
            id: 'media-message-123',
          },
          message: {
            messageId: 'media-message-123',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .post(`/message/sendMedia/${sessionId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .post('/messages/send-message')
        .send({ sessionId, to, mediaUrl, text })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        messageId: 'media-message-123',
        sessionId,
        to,
        type: 'media',
        correlationId: expect.any(String),
      });
    });

    it('should use tenant ID as default session ID', async () => {
      const tenantId = 'tenant-456';
      const to = '5511999999999';
      const text = 'Hello from tenant!';

      const mockResponse = {
        success: true,
        data: {
          key: {
            remoteJid: to,
            fromMe: true,
            id: 'tenant-message-123',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .post(`/message/sendText/${tenantId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .post('/messages/send-message')
        .set('x-tenant-id', tenantId)
        .send({ to, text })
        .expect(200);

      expect(response.body.sessionId).toBe(tenantId);
      expect(response.body.messageId).toBe('tenant-message-123');
    });

    it('should return 400 when neither text nor mediaUrl provided', async () => {
      const response = await request(app)
        .post('/messages/send-message')
        .send({ to: '5511999999999' })
        .expect(400);

      expect(response.body).toEqual({
        ok: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: 'Either text or mediaUrl must be provided',
          }),
        ]),
        correlation_id: expect.any(String),
      });
    });

    it('should return 400 when to field is missing', async () => {
      const response = await request(app)
        .post('/messages/send-message')
        .send({ text: 'Hello' })
        .expect(400);

      expect(response.body).toEqual({
        ok: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['to'],
          }),
        ]),
        correlation_id: expect.any(String),
      });
    });

    it('should return 400 when mediaUrl is invalid', async () => {
      const response = await request(app)
        .post('/messages/send-message')
        .send({
          to: '5511999999999',
          mediaUrl: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body).toEqual({
        ok: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: 'Invalid url',
            path: ['mediaUrl'],
          }),
        ]),
        correlation_id: expect.any(String),
      });
    });

    it('should return 502 on Evolution API text error', async () => {
      const sessionId = 'test-session';
      const to = '5511999999999';
      const text = 'Hello, World!';

      nock(config.EVOLUTION_BASE_URL)
        .post(`/message/sendText/${sessionId}`)
        .reply(500, {
          message: 'Internal server error',
        });

      const response = await request(app)
        .post('/messages/send-message')
        .send({ sessionId, to, text })
        .expect(502);

      expect(response.body).toEqual({
        ok: false,
        error: expect.stringContaining('Evolution API sendText failed'),
        correlation_id: expect.any(String),
      });
    });

    it('should return 502 on Evolution API media error', async () => {
      const sessionId = 'test-session';
      const to = '5511999999999';
      const mediaUrl = 'https://example.com/image.jpg';

      nock(config.EVOLUTION_BASE_URL)
        .post(`/message/sendMedia/${sessionId}`)
        .reply(400, {
          message: 'Invalid media URL',
        });

      const response = await request(app)
        .post('/messages/send-message')
        .send({ sessionId, to, mediaUrl })
        .expect(502);

      expect(response.body).toEqual({
        ok: false,
        error: expect.stringContaining('Evolution API sendMedia failed'),
        correlation_id: expect.any(String),
      });
    });

    it('should include correlation headers in response', async () => {
      const sessionId = 'test-session';
      const to = '5511999999999';
      const text = 'Hello, World!';
      const correlationId = 'test-correlation-456';

      const mockResponse = {
        success: true,
        data: {
          key: {
            remoteJid: to,
            fromMe: true,
            id: 'message-456',
          },
        },
      };

      nock(config.EVOLUTION_BASE_URL)
        .post(`/message/sendText/${sessionId}`)
        .reply(200, mockResponse);

      const response = await request(app)
        .post('/messages/send-message')
        .set('x-correlation-id', correlationId)
        .send({ sessionId, to, text })
        .expect(200);

      expect(response.body.correlationId).toBe(correlationId);
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});
