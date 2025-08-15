import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  req.logger.info('Health check requested');

  res.status(StatusCodes.OK).json({
    service: 'whatsapp-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
