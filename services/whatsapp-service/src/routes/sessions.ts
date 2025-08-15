import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { evolutionClient } from '../clients/evolution.js';
import { sessionService } from '../services/sessionService.js';
import { ExternalServiceError } from '../utils/errors.js';

const router = Router();

interface ConnectRequest extends Request {
  body: {
    sessionId?: string;
  };
}

interface SessionRequest extends Request {
  query: {
    sessionId?: string;
  };
}

// POST /connect - Start a new session
router.post('/connect', async (req: ConnectRequest, res: Response) => {
  try {
    const { sessionId = req.tenantId || 'default' } = req.body;

    req.logger.info({
      msg: 'Starting WhatsApp session',
      sessionId,
    });

    const result = await evolutionClient.startSession(sessionId);

    // Save session status to MongoDB
    try {
      await sessionService.upsertSession(
        req.tenantId,
        sessionId,
        'connecting' // Evolution session is starting
      );
    } catch (dbError) {
      req.logger.warn({
        msg: 'Failed to save session to database',
        sessionId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      // Continue - don't fail for DB errors
    }

    req.logger.info({
      msg: 'Session started successfully',
      sessionId,
      status: result.instance.status,
    });

    res.status(StatusCodes.OK).json({
      ok: true,
      sessionId,
      status: result.instance.status,
      qrCode: result.qrcode?.base64,
      correlationId: req.correlationId,
    });
  } catch (error) {
    req.logger.error({
      msg: 'Failed to start session',
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

// GET /qr-code - Get QR code for session
router.get('/qr-code', async (req: SessionRequest, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        ok: false,
        error: 'sessionId is required',
        correlation_id: req.correlationId,
      });
    }

    req.logger.info({
      msg: 'Getting QR code for session',
      sessionId,
    });

    const result = await evolutionClient.getQRCode(sessionId);

    req.logger.info({
      msg: 'QR code retrieved successfully',
      sessionId,
      hasQRCode: !!result.qrcode?.base64,
    });

    res.status(StatusCodes.OK).json({
      ok: true,
      sessionId,
      qr: result.qrcode?.base64,
      status: result.instance?.status,
      correlationId: req.correlationId,
    });
  } catch (error) {
    req.logger.error({
      msg: 'Failed to get QR code',
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

// GET /status - Get session status
router.get('/status', async (req: SessionRequest, res: Response) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        ok: false,
        error: 'sessionId is required',
        correlation_id: req.correlationId,
      });
    }

    req.logger.info({
      msg: 'Getting session status',
      sessionId,
    });

    const result = await evolutionClient.getStatus(sessionId);

    // Update session status in MongoDB
    try {
      const statusMap: Record<string, import('../models/Session.js').Session['status']> = {
        'open': 'open',
        'connecting': 'connecting',
        'close': 'close',
        'qrcode': 'creating',
      };

      const mongoStatus = statusMap[result.instance.status] || 'connecting';

      await sessionService.upsertSession(
        req.tenantId,
        sessionId,
        mongoStatus
      );
    } catch (dbError) {
      req.logger.warn({
        msg: 'Failed to update session status in database',
        sessionId,
        status: result.instance.status,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      // Continue - don't fail for DB errors
    }

    req.logger.info({
      msg: 'Session status retrieved successfully',
      sessionId,
      status: result.instance.status,
    });

    res.status(StatusCodes.OK).json({
      ok: true,
      sessionId,
      status: result.instance.status,
      correlationId: req.correlationId,
    });
  } catch (error) {
    req.logger.error({
      msg: 'Failed to get session status',
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
