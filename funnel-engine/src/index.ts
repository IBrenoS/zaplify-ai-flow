import config from '@/config';
import { CacheService } from '@/services/cache-service';
import { ExecutionEngine } from '@/services/execution-engine';
import { FunnelService } from '@/services/funnel-service';
import { MetricsService } from '@/services/metrics-service';
import { NodeExecutorFactory } from '@/services/node-executor-factory';
import { QueueService } from '@/services/queue-service';
import { TriggerManager } from '@/services/trigger-manager';
import { Logger } from '@/utils/logger';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

class FunnelEngineServer {
  private app: express.Application;
  private logger: Logger;
  private funnelService: FunnelService;
  private executionEngine: ExecutionEngine;
  private triggerManager: TriggerManager;
  private queueService: QueueService;
  private cacheService: CacheService;
  private metricsService: MetricsService;

  constructor() {
    this.app = express();
    this.logger = new Logger();
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private initializeServices(): void {
    // Initialize core services
    this.cacheService = new CacheService();
    this.queueService = new QueueService();
    this.metricsService = new MetricsService();

    // Initialize node executor factory
    const nodeExecutorFactory = new NodeExecutorFactory();

    // Initialize execution engine
    this.executionEngine = new ExecutionEngine(
      nodeExecutorFactory,
      this.queueService,
      this.cacheService,
      this.metricsService,
      this.logger
    );

    // Initialize funnel service
    this.funnelService = new FunnelService(this.cacheService, this.logger);

    // Initialize trigger manager
    this.triggerManager = new TriggerManager(
      this.executionEngine,
      this.funnelService,
      this.queueService,
      this.logger
    );
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? [config.API_GATEWAY_URL]
        : true,
      credentials: true
    }));

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: config.SERVICE_NAME,
        version: config.SERVICE_VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Funnel routes
    this.app.get('/funnels', async (req, res) => {
      try {
        const funnels = await this.funnelService.getAllFunnels();
        res.json({ success: true, data: funnels });
      } catch (error) {
        this.logger.error('Error getting funnels:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/funnels/:id', async (req, res) => {
      try {
        const funnel = await this.funnelService.getFunnelById(req.params.id);
        if (!funnel) {
          return res.status(404).json({ success: false, error: 'Funnel not found' });
        }
        res.json({ success: true, data: funnel });
      } catch (error) {
        this.logger.error('Error getting funnel:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/funnels/:id/execute', async (req, res) => {
      try {
        const funnelId = req.params.id;
        const { triggerId, variables = {} } = req.body;

        const funnel = await this.funnelService.getFunnelById(funnelId);
        if (!funnel) {
          return res.status(404).json({ success: false, error: 'Funnel not found' });
        }

        if (!funnel.isActive) {
          return res.status(400).json({ success: false, error: 'Funnel is not active' });
        }

        const execution = await this.executionEngine.executeFunnel(funnel, triggerId, variables);
        res.json({ success: true, data: execution });
      } catch (error) {
        this.logger.error('Error executing funnel:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Execution routes
    this.app.get('/executions/:id', async (req, res) => {
      try {
        const execution = await this.executionEngine.getExecutionContext(req.params.id);
        if (!execution) {
          return res.status(404).json({ success: false, error: 'Execution not found' });
        }
        res.json({ success: true, data: execution });
      } catch (error) {
        this.logger.error('Error getting execution:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/executions/:id/cancel', async (req, res) => {
      try {
        const success = await this.executionEngine.cancelExecution(req.params.id);
        res.json({ success, message: success ? 'Execution cancelled' : 'Execution not found or not running' });
      } catch (error) {
        this.logger.error('Error cancelling execution:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/executions', async (req, res) => {
      try {
        const activeExecutions = this.executionEngine.getActiveExecutions();
        res.json({ success: true, data: activeExecutions });
      } catch (error) {
        this.logger.error('Error getting active executions:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Trigger routes
    this.app.post('/triggers/:id/activate', async (req, res) => {
      try {
        const success = await this.triggerManager.activateTrigger(req.params.id);
        res.json({ success, message: success ? 'Trigger activated' : 'Trigger not found' });
      } catch (error) {
        this.logger.error('Error activating trigger:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/triggers/:id/deactivate', async (req, res) => {
      try {
        const success = await this.triggerManager.deactivateTrigger(req.params.id);
        res.json({ success, message: success ? 'Trigger deactivated' : 'Trigger not found' });
      } catch (error) {
        this.logger.error('Error deactivating trigger:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Webhook endpoint
    this.app.post('/webhook/:triggerId', async (req, res) => {
      try {
        const triggerId = req.params.triggerId;
        const payload = {
          id: `webhook_${Date.now()}`,
          event: 'webhook_received',
          data: req.body,
          timestamp: new Date(),
          source: req.get('User-Agent') || 'unknown',
          headers: req.headers as Record<string, string>
        };

        await this.triggerManager.handleWebhook(triggerId, payload);
        res.json({ success: true, message: 'Webhook processed' });
      } catch (error) {
        this.logger.error('Error processing webhook:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Metrics routes
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.metricsService.getMetrics();
        res.json({ success: true, data: metrics });
      } catch (error) {
        this.logger.error('Error getting metrics:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Error handling middleware
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize services
      await this.cacheService.initialize();
      await this.queueService.initialize();
      await this.metricsService.initialize();
      await this.triggerManager.initialize();

      // Start server
      this.app.listen(config.PORT, config.HOST, () => {
        this.logger.info(`🚀 Funnel Engine Server started on ${config.HOST}:${config.PORT}`);
        this.logger.info(`Environment: ${config.NODE_ENV}`);
        this.logger.info(`Service: ${config.SERVICE_NAME} v${config.SERVICE_VERSION}`);
      });

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Funnel Engine Server...');

    // Graceful shutdown
    await this.triggerManager.shutdown();
    await this.queueService.shutdown();
    await this.cacheService.shutdown();

    this.logger.info('Server shutdown complete');
  }
}

// Start server
const server = new FunnelEngineServer();

// Handle process signals
process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default server;
