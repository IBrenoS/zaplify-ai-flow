import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { evolutionClient } from '../clients/evolution.js';
import { jwtMiddleware } from '../middlewares/auth.js';
import { publicRateLimiter } from '../middlewares/rateLimit.js';
import { ExternalServiceError } from '../utils/errors.js';

const router = Router();

// Validation schema for send message
const sendMessageSchema = z.object({
  sessionId: z.string().optional(),
  to: z.string().min(1, 'Phone number is required'),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
}).refine(
  (data) => data.text || data.mediaUrl,
  {
    message: 'Either text or mediaUrl must be provided',
  }
);

interface SendMessageRequest extends Request {
  body: z.infer<typeof sendMessageSchema>;
}

// POST /send-message - Send text or media message
router.post('/send-message', publicRateLimiter as any, jwtMiddleware, async (req: SendMessageRequest, res: Response) => {
  try {
    // Validate request body
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        ok: false,
        error: 'Validation failed',
        details: validation.error.issues,
        correlation_id: req.correlationId,
      });
    }

    const { sessionId = req.tenantId || 'default', to, text, mediaUrl } = validation.data;

    req.logger.info({
      msg: 'Sending message',
      sessionId,
      to,
      hasText: !!text,
      hasMedia: !!mediaUrl,
    });

    let result;
    let messageType: 'text' | 'media';

    if (mediaUrl) {
      // Send media message
      messageType = 'media';
      result = await evolutionClient.sendMedia(sessionId, to, mediaUrl, text);
    } else if (text) {
      // Send text message
      messageType = 'text';
      result = await evolutionClient.sendText(sessionId, to, text);
    } else {
      // This should not happen due to validation, but just in case
      return res.status(StatusCodes.BAD_REQUEST).json({
        ok: false,
        error: 'Either text or mediaUrl must be provided',
        correlation_id: req.correlationId,
      });
    }

    req.logger.info({
      msg: 'Message sent successfully',
      sessionId,
      to,
      messageType,
      messageId: result.key.id,
    });

    res.status(StatusCodes.OK).json({
      ok: true,
      messageId: result.key.id,
      sessionId,
      to,
      type: messageType,
      correlationId: req.correlationId,
    });
  } catch (error) {
    req.logger.error({
      msg: 'Failed to send message',
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ExternalServiceError) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        ok: false,
        error: error.message,
        correlation_id: req.correlationId,
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: 'Internal server error',
      correlation_id: req.correlationId,
    });
  }
});

export default router;
