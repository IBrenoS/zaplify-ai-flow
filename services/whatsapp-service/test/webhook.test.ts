import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kafkaService } from '../src/events/kafka.js';
import { correlationMiddleware } from '../src/middlewares/correlation.js';
import webhookRoutes from '../src/routes/webhooks.js';
import { idempotencyService } from '../src/services/idempotency.js';

// Mock the services
vi.mock('../src/events/kafka.js');
vi.mock('../src/services/idempotency.js');
vi.mock('../src/config/env.js', () => ({
  config: {
    EVOLUTION_WEBHOOK_SECRET: 'test_webhook_secret',
    ENABLE_KAFKA: true,
    REDIS_URL: undefined,
  },
}));

const mockKafkaService = vi.mocked(kafkaService);
const mockIdempotencyService = vi.mocked(idempotencyService);

// Test app setup
function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(correlationMiddleware);
  app.use('/', webhookRoutes);
  return app;
}

// Helper to create HMAC signature
function createSignature(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('Webhook Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();

    // Setup default mocks
    mockIdempotencyService.isDuplicate.mockResolvedValue(false);
    mockIdempotencyService.markProcessed.mockResolvedValue();
    mockKafkaService.publishEvent.mockResolvedValue();
  });

  describe('POST /webhook', () => {
    const validMessageReceived = {
      event: 'messages.upsert',
      instance: 'test-session',
      data: {
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          id: 'msg-123',
        },
        messageTimestamp: 1234567890,
        message: {
          conversation: 'Hello World',
        },
      },
    };

    const validMessageAck = {
      event: 'messages.update',
      instance: 'test-session',
      data: {
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
          id: 'msg-456',
        },
        update: {
          status: 2, // delivered
        },
      },
    };

    it('should process valid webhook with correct signature', async () => {
      const payload = JSON.stringify(validMessageReceived);
      const signature = createSignature(payload, 'test_webhook_secret');

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Webhook processed successfully',
      });

      expect(mockIdempotencyService.isDuplicate).toHaveBeenCalledWith('msg-123', 'default');
      expect(mockIdempotencyService.markProcessed).toHaveBeenCalledWith('msg-123', 'default');
      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'conversation.message_received',
          version: 1,
          tenant_id: 'default',
          source: 'whatsapp-service',
          data: expect.objectContaining({
            sessionId: 'test-session',
            messageId: 'msg-123',
            from: '5511999999999@s.whatsapp.net',
            to: 'test-session',
            text: 'Hello World',
          }),
        })
      );
    });

    it('should process message acknowledgment webhook', async () => {
      const payload = JSON.stringify(validMessageAck);
      const signature = createSignature(payload, 'test_webhook_secret');

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Webhook processed successfully',
      });

      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'conversation.message_ack',
          data: expect.objectContaining({
            sessionId: 'test-session',
            messageId: 'msg-456',
            status: 'delivered',
          }),
        })
      );
    });

    it('should reject webhook with missing signature', async () => {
      const payload = JSON.stringify(validMessageReceived);

      const response = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body).toEqual({
        ok: false,
        error: 'Missing signature',
      });

      expect(mockIdempotencyService.isDuplicate).not.toHaveBeenCalled();
      expect(mockKafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify(validMessageReceived);
      const invalidSignature = 'sha256=invalid_signature';

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', invalidSignature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body).toEqual({
        ok: false,
        error: 'Invalid signature',
      });

      expect(mockIdempotencyService.isDuplicate).not.toHaveBeenCalled();
      expect(mockKafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should handle duplicate messages (idempotency)', async () => {
      mockIdempotencyService.isDuplicate.mockResolvedValue(true);

      const payload = JSON.stringify(validMessageReceived);
      const signature = createSignature(payload, 'test_webhook_secret');

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Duplicate message ignored',
      });

      expect(mockIdempotencyService.isDuplicate).toHaveBeenCalledWith('msg-123', 'default');
      expect(mockIdempotencyService.markProcessed).not.toHaveBeenCalled();
      expect(mockKafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should handle invalid webhook payload gracefully', async () => {
      const invalidPayload = JSON.stringify({
        invalid: 'payload',
      });
      const signature = createSignature(invalidPayload, 'test_webhook_secret');

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(invalidPayload)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Webhook received but payload invalid',
      });

      expect(mockIdempotencyService.isDuplicate).not.toHaveBeenCalled();
      expect(mockKafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should continue processing even if Kafka fails', async () => {
      mockKafkaService.publishEvent.mockRejectedValue(new Error('Kafka error'));

      const payload = JSON.stringify(validMessageReceived);
      const signature = createSignature(payload, 'test_webhook_secret');

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Webhook processed successfully',
      });

      expect(mockIdempotencyService.isDuplicate).toHaveBeenCalled();
      expect(mockIdempotencyService.markProcessed).toHaveBeenCalled();
    });

    it('should extract media information from message', async () => {
      const mediaMessage = {
        event: 'messages.upsert',
        instance: 'test-session',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
            fromMe: false,
            id: 'msg-media',
          },
          message: {
            imageMessage: {
              url: 'https://example.com/image.jpg',
              mimetype: 'image/jpeg',
            },
          },
        },
      };

      const payload = JSON.stringify(mediaMessage);
      const signature = createSignature(payload, 'test_webhook_secret');

      await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageId: 'msg-media',
            mediaUrls: ['media_present'],
          }),
        })
      );
    });

    it('should handle extended text messages', async () => {
      const extendedTextMessage = {
        event: 'messages.upsert',
        instance: 'test-session',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
            fromMe: false,
            id: 'msg-extended',
          },
          message: {
            extendedTextMessage: {
              text: 'Extended text with link',
              contextInfo: {},
            },
          },
        },
      };

      const payload = JSON.stringify(extendedTextMessage);
      const signature = createSignature(payload, 'test_webhook_secret');

      await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageId: 'msg-extended',
            text: 'Extended text with link',
          }),
        })
      );
    });

    it('should map message status correctly', async () => {
      const statusTypes = [
        { status: 1, expected: 'sent' },
        { status: 2, expected: 'delivered' },
        { status: 3, expected: 'read' },
        { status: 99, expected: 'status_99' },
      ];

      for (const { status, expected } of statusTypes) {
        const ackMessage = {
          ...validMessageAck,
          data: {
            ...validMessageAck.data,
            key: { ...validMessageAck.data.key, id: `msg-${status}` },
            update: { status },
          },
        };

        const payload = JSON.stringify(ackMessage);
        const signature = createSignature(payload, 'test_webhook_secret');

        await request(app)
          .post('/webhook')
          .set('x-signature', signature)
          .set('Content-Type', 'application/json')
          .send(payload)
          .expect(200);

        expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              messageId: `msg-${status}`,
              status: expected,
            }),
          })
        );
      }
    });

    it('should propagate correlation headers correctly', async () => {
      const payload = JSON.stringify(validMessageReceived);
      const signature = createSignature(payload, 'test_webhook_secret');

      const response = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .set('x-correlation-id', 'test-correlation-123')
        .set('x-tenant-id', 'tenant-456')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe('test-correlation-123');
      expect(response.headers['x-tenant-id']).toBe('tenant-456');

      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          correlation_id: 'test-correlation-123',
          tenant_id: 'tenant-456',
        })
      );
    });
  });

  describe('Webhook without signature (EVOLUTION_WEBHOOK_SECRET not set)', () => {
    it('should process webhook without signature verification when secret not configured', async () => {
      // Temporarily override config for this test
      const originalSecret = (await import('../src/config/env.js')).config.EVOLUTION_WEBHOOK_SECRET;
      (await import('../src/config/env.js')).config.EVOLUTION_WEBHOOK_SECRET = undefined;

      const payload = JSON.stringify({
        event: 'messages.upsert',
        instance: 'test-session',
        data: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
            fromMe: false,
            id: 'msg-no-secret',
          },
          message: { conversation: 'Hello without secret' },
        },
      });

      const response = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        message: 'Webhook processed successfully',
      });

      expect(mockKafkaService.publishEvent).toHaveBeenCalled();

      // Restore original config
      (await import('../src/config/env.js')).config.EVOLUTION_WEBHOOK_SECRET = originalSecret;
    });
  });
});
