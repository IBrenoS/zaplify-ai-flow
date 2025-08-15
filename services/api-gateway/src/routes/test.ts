import { Router } from 'express';

import { WebSocketService } from '../services/websocket.js';

const router = Router();

// Rota para testar broadcast
router.post('/test/broadcast', (req, res) => {
  const { tenant_id, message } = req.body;

  if (!tenant_id || !message) {
    return res.status(400).json({
      error: 'tenant_id e message são obrigatórios'
    });
  }

  const broadcastData = {
    type: 'test_broadcast',
    data: {
      message,
      timestamp: new Date().toISOString(),
      sent_by: 'test_api'
    }
  };

  // Usar o WebSocketService para broadcast
  const service = WebSocketService.getInstance();
  const sent = service.broadcastToTenant(tenant_id, broadcastData);

  res.json({
    success: true,
    tenant_id,
    connections_sent: sent,
    message: broadcastData
  });
});

// Rota para testar broadcast global
router.post('/test/broadcast-all', (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'message é obrigatório'
    });
  }

  const broadcastData = {
    type: 'global_broadcast',
    data: {
      message,
      timestamp: new Date().toISOString(),
      sent_by: 'test_api'
    }
  };

  // Usar o WebSocketService para broadcast global
  const service = WebSocketService.getInstance();
  const sent = service.broadcastToAll(broadcastData);

  res.json({
    success: true,
    connections_sent: sent,
    message: broadcastData
  });
});

// Rota para obter estatísticas das conexões
router.get('/test/connections', (req, res) => {
  const service = WebSocketService.getInstance();
  const stats = service.getConnectionStats();

  res.json(stats);
});

export default router;
