import 'dotenv/config';
import http from 'http';

import express from 'express';
import fetch from 'node-fetch'; // Se não tiver, instale: npm i node-fetch@3
import { WebSocketServer } from 'ws';

import { config, configHelpers } from './config/env.js';
import {
  correlationMiddleware,
  createBodyParserMiddleware,
  createCorsMiddleware,
  createSecurityMiddleware,
  globalErrorHandler,
  notFoundHandler,
  setupSwaggerDocs
} from './middlewares/index.js';
import { createRateLimitMiddleware } from './middlewares/rateLimit.js';
import { healthRouter } from './routes/index.js';
import protectedRouter from './routes/protected.js';
import proxyRouter from './routes/proxy.js';
import { WebSocketService } from './services/index.js';
import { logger } from './utils/index.js';

async function createApp() {
  const app = express();

  // Rate limiting - agora é async
  const rateLimits = await createRateLimitMiddleware();

  // Middlewares de segurança (ordem importante!)
  app.use(createSecurityMiddleware()); // Helmet primeiro
  app.use(createCorsMiddleware()); // CORS depois do helmet

  // Rate limiting global aplicado em todas as rotas
  app.use(rateLimits.general);

  // Body parsing com limits
  const bodyParsers = createBodyParserMiddleware();
  bodyParsers.forEach(parser => app.use(parser));

  // Middleware de correlação - deve vir depois do body parsing
  app.use(correlationMiddleware);

  // Configurar documentação Swagger (apenas em desenvolvimento)
  setupSwaggerDocs(app);

  // Rotas públicas
  app.use(healthRouter);

  // Proxy/roteamento "fake" inicial (placeholder)
  app.get('/v1', (_req, res) =>
    res.json({ message: 'API Gateway v1 online' })
  );

  // Rotas protegidas com rate limiting por tenant (autenticação específica por rota)
  app.use('/api/v1',
    rateLimits.tenant, // Rate limiting por tenant
    protectedRouter,
    proxyRouter // Rotas de proxy documentadas
  );

  // 🔹 Rotas de ping para testar conexão com outros serviços
  app.get('/ping/ia', async (_req, res) => {
    try {
      const r = await fetch(config.services.AI_SERVICE_URL + '/health');
      res.status(r.status).json(await r.json());
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get('/ping/wa', async (_req, res) => {
    try {
      const r = await fetch(config.services.WHATSAPP_SERVICE_URL + '/health');
      res.status(r.status).json(await r.json());
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get('/ping/funnel', async (_req, res) => {
    try {
      const r = await fetch(config.services.FUNNEL_ENGINE_URL + '/health');
      res.status(r.status).json(await r.json());
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get('/ping/analytics', async (_req, res) => {
    try {
      const r = await fetch(config.services.ANALYTICS_SERVICE_URL + '/health');
      res.status(r.status).json(await r.json());
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Error handlers (devem vir por último!)
  app.use(notFoundHandler); // 404 handler
  app.use(globalErrorHandler); // Global error handler

  return app;
}

async function startServer() {
  const app = await createApp();

  const server = http.createServer(app);

  // Configurar WebSocket Server
  const wsService = WebSocketService.getInstance();
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, request) => {
    wsService.setupConnection(ws, request);
  });

  // Iniciar heartbeat para detectar conexões mortas
  const heartbeatInterval = wsService.startHeartbeat(30000); // 30 segundos

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Graceful shutdown initiated', 'system', 'shutdown');
    clearInterval(heartbeatInterval);
    wss.close(() => {
      server.close(() => {
        logger.info('Server shutdown complete', 'system', 'shutdown');
        process.exit(0);
      });
    });
  });

  const PORT = config.server.PORT;
  server.listen(PORT, () => {
    logger.info('API Gateway started successfully', 'system', 'startup', {
      port: PORT,
      nodeEnv: config.server.NODE_ENV,
      pid: process.pid,
      authEnabled: config.auth.AUTH_ENABLED,
      rateLimitEnabled: config.rateLimit.RATE_LIMIT_ENABLED,
      swaggerEnabled: configHelpers.isSwaggerEnabled(),
      host: config.server.HOST,
      apiVersion: config.server.API_VERSION
    });
    console.log(`[api-gateway] listening on :${PORT}`);
  });
}

// Iniciar servidor
startServer().catch((error) => {
  logger.error('Failed to start server', 'system', 'startup-error', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Export para testes
export { createApp };
