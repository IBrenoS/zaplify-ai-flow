import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { messageService } from '../services/messageService.js';
import { sessionService } from '../services/sessionService.js';

const router = Router();

// Validation schemas
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const conversationParamsSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const directionSchema = z.object({
  direction: z.enum(['in', 'out']).optional(),
});

/**
 * GET /conversations
 * Get conversations for a tenant with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { limit, offset } = paginationSchema.parse(req.query);

    const conversations = await messageService.getConversations(tenantId, limit, offset);

    logger.info({
      msg: 'Conversations retrieved',
      tenantId,
      count: conversations.length,
      limit,
      offset,
    });

    res.json({
      conversations,
      pagination: {
        limit,
        offset,
        count: conversations.length,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to get conversations',
      tenantId: req.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /conversations/:from/:to/messages
 * Get messages for a specific conversation
 */
router.get('/:from/:to/messages', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { from, to } = conversationParamsSchema.parse(req.params);
    const { limit, offset } = paginationSchema.parse(req.query);

    const messages = await messageService.getConversationMessages(
      tenantId,
      from,
      to,
      limit,
      offset
    );

    const totalCount = await messageService.getMessageCount(tenantId, from, to);

    logger.info({
      msg: 'Conversation messages retrieved',
      tenantId,
      from,
      to,
      count: messages.length,
      totalCount,
      limit,
      offset,
    });

    res.json({
      messages,
      pagination: {
        limit,
        offset,
        count: messages.length,
        total: totalCount,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to get conversation messages',
      tenantId: req.tenantId,
      from: req.params.from,
      to: req.params.to,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /messages
 * Get all messages for a tenant with optional filtering
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { limit, offset } = paginationSchema.parse(req.query);
    const { direction } = directionSchema.parse(req.query);

    const messages = await messageService.getMessagesByTenant(
      tenantId,
      limit,
      offset,
      direction
    );

    const totalCount = await messageService.getMessageCount(tenantId);

    logger.info({
      msg: 'Messages retrieved',
      tenantId,
      count: messages.length,
      totalCount,
      direction,
      limit,
      offset,
    });

    res.json({
      messages,
      pagination: {
        limit,
        offset,
        count: messages.length,
        total: totalCount,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to get messages',
      tenantId: req.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /sessions
 * Get sessions for a tenant with pagination
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { limit, offset } = paginationSchema.parse(req.query);

    const sessions = await sessionService.getSessionsByTenant(tenantId, limit, offset);
    const totalCount = await sessionService.getSessionCount(tenantId);

    logger.info({
      msg: 'Sessions retrieved',
      tenantId,
      count: sessions.length,
      totalCount,
      limit,
      offset,
    });

    res.json({
      sessions,
      pagination: {
        limit,
        offset,
        count: sessions.length,
        total: totalCount,
      },
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to get sessions',
      tenantId: req.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /conversations/:from/:to
 * Delete all messages for a conversation
 */
router.delete('/:from/:to', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string;
    const { from, to } = conversationParamsSchema.parse(req.params);

    const deletedCount = await messageService.deleteConversationMessages(
      tenantId,
      from,
      to
    );

    logger.info({
      msg: 'Conversation deleted',
      tenantId,
      from,
      to,
      deletedCount,
    });

    res.json({
      message: 'Conversation deleted successfully',
      deletedCount,
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to delete conversation',
      tenantId: req.tenantId,
      from: req.params.from,
      to: req.params.to,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
