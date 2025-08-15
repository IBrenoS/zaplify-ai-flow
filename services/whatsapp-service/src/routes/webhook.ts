import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { config } from '../config/env.js';
import { kafkaService, type EventEnvelope } from '../events/kafka.js';
import { type Message } from '../models/Message.js';
import { idempotencyService } from '../services/idempotency.js';
import { messageService } from '../services/messageService.js';
import { sessionService } from '../services/sessionService.js';

const router = Router();

// Evolution webhook payload schemas
const baseWebhookSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      id: z.string(),
    }),
    messageTimestamp: z.number().optional(),
    message: z.record(z.unknown()).optional(),
    messageStubType: z.number().optional(),
    messageStubParameters: z.array(z.string()).optional(),
  }).passthrough(),
});

const messageReceivedSchema = baseWebhookSchema.extend({
  event: z.literal('messages.upsert'),
});

const messageAckSchema = baseWebhookSchema.extend({
  event: z.literal('messages.update'),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      id: z.string(),
    }),
    update: z.record(z.unknown()).optional(),
  }).passthrough(),
});

const webhookSchema = z.union([messageReceivedSchema, messageAckSchema]);

interface WebhookRequest extends Request {
  rawBody?: Buffer;
}

// Middleware to capture raw body for HMAC verification
export const rawBodyMiddleware = (req: WebhookRequest, res: Response, next: () => void) => {
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    req.body = req.rawBody.toString('utf8');
    try {
      req.body = JSON.parse(req.body);
    } catch {
      req.body = {};
    }
    next();
  });
};

// Verify HMAC signature
function verifySignature(body: Buffer, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

// Extract message data from webhook payload
function extractMessageData(payload: z.infer<typeof webhookSchema>): {
  sessionId: string;
  from?: string;
  to?: string;
  messageId: string;
  text?: string;
  mediaUrls?: string[];
  status?: string;
} {
  const { instance, data } = payload;
  const messageId = data.key.id;

  // Basic data common to all message types
  const messageData = {
    sessionId: instance,
    messageId,
    from: data.key.fromMe ? instance : data.key.remoteJid,
    to: data.key.fromMe ? data.key.remoteJid : instance,
  };

  if (payload.event === 'messages.upsert') {
    // Message received
    const message = data.message;
    let text: string | undefined;
    const mediaUrls: string[] = [];

    if (message) {
      // Extract text content
      if (typeof message === 'object' && message !== null) {
        const msgObj = message as Record<string, unknown>;
        if ('conversation' in msgObj && typeof msgObj.conversation === 'string') {
          text = msgObj.conversation;
        } else if ('extendedTextMessage' in msgObj &&
          typeof msgObj.extendedTextMessage === 'object' &&
          msgObj.extendedTextMessage !== null) {
          const extMsg = msgObj.extendedTextMessage as Record<string, unknown>;
          if ('text' in extMsg && typeof extMsg.text === 'string') {
            text = extMsg.text;
          }
        }

        // Extract media URLs (simplified - would need more robust extraction in production)
        if ('imageMessage' in msgObj || 'videoMessage' in msgObj ||
          'audioMessage' in msgObj || 'documentMessage' in msgObj) {
          // In a real implementation, you'd extract the actual media URL from the message
          // For now, we'll indicate that media is present
          mediaUrls.push('media_present');
        }
      }
    }

    return {
      ...messageData,
      text,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    };
  } else if (payload.event === 'messages.update') {
    // Message acknowledgment
    const update = 'update' in data ? data.update as Record<string, unknown> : undefined;
    const status = update && 'status' in update ? update.status as number : undefined;

    let statusText: string | undefined;
    switch (status) {
      case 1:
        statusText = 'sent';
        break;
      case 2:
        statusText = 'delivered';
        break;
      case 3:
        statusText = 'read';
        break;
      default:
        statusText = status ? `status_${status}` : undefined;
    }

    return {
      ...messageData,
      status: statusText,
    };
  }

  return messageData;
}

// POST /webhook - Receive Evolution webhooks
router.post('/webhook', rawBodyMiddleware, async (req: WebhookRequest, res: Response) => {
  try {
    // Verify HMAC signature if secret is configured
    if (config.EVOLUTION_WEBHOOK_SECRET) {
      const signature = req.headers['x-signature'] as string;

      if (!signature) {
        req.logger.warn({
          msg: 'Webhook received without signature',
          ip: req.ip,
        });
        return res.status(StatusCodes.UNAUTHORIZED).json({
          ok: false,
          error: 'Missing signature',
        });
      }

      if (!req.rawBody) {
        req.logger.error({
          msg: 'Raw body not captured for signature verification',
        });
        return res.status(StatusCodes.BAD_REQUEST).json({
          ok: false,
          error: 'Unable to verify signature',
        });
      }

      const isValidSignature = verifySignature(
        req.rawBody,
        signature,
        config.EVOLUTION_WEBHOOK_SECRET
      );

      if (!isValidSignature) {
        req.logger.warn({
          msg: 'Invalid webhook signature',
          ip: req.ip,
        });
        return res.status(StatusCodes.UNAUTHORIZED).json({
          ok: false,
          error: 'Invalid signature',
        });
      }
    }

    // Parse and validate webhook payload
    const parseResult = webhookSchema.safeParse(req.body);

    if (!parseResult.success) {
      req.logger.warn({
        msg: 'Invalid webhook payload',
        errors: parseResult.error.errors,
      });
      // Return 200 to avoid Evolution retrying invalid payloads
      return res.status(StatusCodes.OK).json({
        ok: true,
        message: 'Webhook received but payload invalid',
      });
    }

    const webhookData = parseResult.data;
    const messageData = extractMessageData(webhookData);

    req.logger.info({
      msg: 'Webhook received',
      event: webhookData.event,
      sessionId: messageData.sessionId,
      messageId: messageData.messageId,
      fromMe: webhookData.data.key.fromMe,
    });

    // Check for idempotency
    const isDuplicate = await idempotencyService.isDuplicate(
      messageData.messageId,
      req.tenantId
    );

    if (isDuplicate) {
      req.logger.info({
        msg: 'Duplicate webhook message ignored',
        messageId: messageData.messageId,
      });
      return res.status(StatusCodes.OK).json({
        ok: true,
        message: 'Duplicate message ignored',
      });
    }

    // Mark as processed (do this early to prevent race conditions)
    await idempotencyService.markProcessed(messageData.messageId, req.tenantId);

    // Save message to MongoDB
    try {
      if (webhookData.event === 'messages.upsert') {
        // This is a new message - save it
        const phoneNumber = messageData.from || messageData.to || '';

        await messageService.saveMessage({
          tenant_id: req.tenantId,
          messageId: messageData.messageId,
          direction: webhookData.data.key.fromMe ? 'out' : 'in',
          from: messageData.from || '',
          to: messageData.to || '',
          text: messageData.text,
          mediaUrls: messageData.mediaUrls,
          timestamps: {
            createdAt: new Date(webhookData.data.messageTimestamp ? webhookData.data.messageTimestamp * 1000 : Date.now()),
            updatedAt: new Date(),
          },
          status: undefined,
        });

        // Update or create session
        await sessionService.upsertSession(
          req.tenantId,
          messageData.sessionId,
          'open',
          phoneNumber
        );
      } else if (webhookData.event === 'messages.update' && messageData.status) {
        // This is a message status update
        const statusMap: Record<string, NonNullable<Message['status']>> = {
          'sent': 'sent',
          'delivered': 'delivered',
          'read': 'read',
          'pending': 'pending',
          'failed': 'failed',
        };

        const status = statusMap[messageData.status];
        if (status) {
          await messageService.updateMessageStatus(
            req.tenantId,
            messageData.messageId,
            status
          );
        }
      }
    } catch (dbError) {
      req.logger.error({
        msg: 'Failed to save message to database',
        messageId: messageData.messageId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      // Continue processing - don't fail the webhook for DB errors
    }

    // Determine event name
    let eventName: string;
    if (webhookData.event === 'messages.upsert') {
      eventName = 'conversation.message_received';
    } else if (webhookData.event === 'messages.update') {
      eventName = 'conversation.message_ack';
    } else {
      eventName = `conversation.unknown`;
    }

    // Create event envelope
    const eventEnvelope: EventEnvelope = {
      event_name: eventName,
      version: 1,
      timestamp: new Date().toISOString(),
      tenant_id: req.tenantId,
      correlation_id: req.correlationId,
      source: 'whatsapp-service',
      data: {
        ...messageData,
        raw: webhookData,
      },
    };

    // Publish event asynchronously (don't wait for completion)
    setImmediate(async () => {
      try {
        await kafkaService.publishEvent(eventEnvelope);
      } catch (error) {
        req.logger.error({
          msg: 'Failed to publish webhook event',
          messageId: messageData.messageId,
          eventName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    req.logger.info({
      msg: 'Webhook processed successfully',
      messageId: messageData.messageId,
      eventName,
      hasText: !!messageData.text,
      hasMedia: !!(messageData.mediaUrls && messageData.mediaUrls.length > 0),
    });

    // Always return 200 for valid webhooks (even if Kafka fails)
    res.status(StatusCodes.OK).json({
      ok: true,
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    req.logger.error({
      msg: 'Error processing webhook',
      error: error instanceof Error ? error.message : String(error),
    });

    // Return 200 to prevent Evolution from retrying
    res.status(StatusCodes.OK).json({
      ok: true,
      message: 'Webhook received but processing failed',
    });
  }
});

export default router;
