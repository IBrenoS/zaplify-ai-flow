import express from 'express';
import fetch from 'node-fetch';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { correlationMiddleware } from '../middlewares/correlation.js';
import proxyRouter from '../routes/proxy.js';

// Mock do fetch
vi.mock('node-fetch');
const mockFetch = vi.mocked(fetch);

// Mock do logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock do middleware de auth
vi.mock('../middlewares/auth.js', () => ({
  createAuthMiddleware: vi.fn(() => (req: any, res: any, next: any) => {
    req.user = {
      userId: 'test-user',
      tenantId: 'test-tenant',
      scopes: ['ai:conversation', 'whatsapp:read', 'funnel:execute', 'analytics:read']
    };
    next();
  })
}));

describe('Proxy Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);
    app.use('/api/v1', proxyRouter);

    vi.clearAllMocks();

    // Mock de variáveis de ambiente
    process.env.AI_SERVICE_URL = 'http://ia-conversational:8001';
    process.env.WHATSAPP_SERVICE_URL = 'http://whatsapp-service:8081';
    process.env.FUNNEL_ENGINE_URL = 'http://funnel-engine:8082';
    process.env.ANALYTICS_SERVICE_URL = 'http://analytics-service:8002';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/v1/ai/conversation', () => {
    it('deve fazer proxy para serviço de IA com sucesso', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({
          conversation_id: 'conv_12345',
          response: 'Hello, how can I help you?'
        }))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const requestBody = {
        message: 'Hello AI',
        context: { user_id: 'test-user' }
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/conversation')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body.data.ok).toBe(true);
      expect(response.body.data.data).toEqual({
        conversation_id: 'conv_12345',
        response: 'Hello, how can I help you?'
      });
      expect(response.body.data.correlation_id).toBeDefined();
      expect(response.body.data.tenant_id).toBe('test-tenant');
      expect(response.body.data.responseTime).toBeDefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://ia-conversational:8001/conversation',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'x-tenant-id': 'test-tenant'
          })
        })
      );
    });

    it('deve retornar 502 quando serviço de IA falha', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND ia-conversational'));

      const requestBody = {
        message: 'Hello AI'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/conversation')
        .send(requestBody)
        .expect(502);

      // Assert
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Downstream service error');
      expect(response.body.correlation_id).toBeDefined();
      expect(response.body.tenant_id).toBe('test-tenant');
    });

    it('deve retornar 502 quando serviço de IA retorna 500', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue('{"error":"Internal AI service error"}')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const requestBody = {
        message: 'Hello AI'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/ai/conversation')
        .send(requestBody)
        .expect(502);

      // Assert
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('AI service unavailable');
    });
  });

  describe('GET /api/v1/whatsapp/status', () => {
    it('deve fazer proxy para serviço WhatsApp com sucesso', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({
          status: 'connected',
          webhook_verified: true,
          last_activity: '2025-08-11T23:00:00Z'
        }))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .get('/api/v1/whatsapp/status')
        .expect(200);

      // Assert
      expect(response.body.data.ok).toBe(true);
      expect(response.body.data.data.status).toBe('connected');
      expect(response.body.data.correlation_id).toBeDefined();
      expect(response.body.data.tenant_id).toBe('test-tenant');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://whatsapp-service:8081/status',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-tenant-id': 'test-tenant'
          })
        })
      );
    });

    it('deve retornar 502 quando serviço WhatsApp falha', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Act
      const response = await request(app)
        .get('/api/v1/whatsapp/status')
        .expect(502);

      // Assert
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Downstream service error');
    });
  });

  describe('POST /api/v1/funnel/execute', () => {
    it('deve fazer proxy para serviço Funnel com sucesso', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({
          execution_id: 'exec_67890',
          funnel_id: 'funnel_123',
          status: 'running',
          steps_completed: 0
        }))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const requestBody = {
        funnel_id: 'funnel_123',
        trigger_data: { user_id: 'test-user' }
      };

      // Act
      const response = await request(app)
        .post('/api/v1/funnel/execute')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(response.body.data.ok).toBe(true);
      expect(response.body.data.data.execution_id).toBe('exec_67890');
      expect(response.body.data.correlation_id).toBeDefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://funnel-engine:8082/funnel/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
    });

    it('deve retornar 502 quando serviço Funnel falha', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Service timeout'));

      const requestBody = {
        funnel_id: 'funnel_123'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/funnel/execute')
        .send(requestBody)
        .expect(502);

      // Assert
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Downstream service error');
    });
  });

  describe('GET /api/v1/analytics/real-time', () => {
    it('deve fazer proxy para serviço Analytics com sucesso', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({
          active_users: 145,
          active_conversations: 23,
          messages_per_minute: 67,
          timestamp: '2025-08-11T23:00:00Z'
        }))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      const response = await request(app)
        .get('/api/v1/analytics/real-time')
        .expect(200);

      // Assert
      expect(response.body.data.ok).toBe(true);
      expect(response.body.data.data.active_users).toBe(145);
      expect(response.body.data.correlation_id).toBeDefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://analytics-service:8002/analytics/real-time',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-tenant-id': 'test-tenant'
          })
        })
      );
    });

    it('deve retornar 502 quando serviço Analytics falha', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      const response = await request(app)
        .get('/api/v1/analytics/real-time')
        .expect(502);

      // Assert
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Downstream service error');
    });
  });

  describe('Header Propagation', () => {
    it('deve propagar x-correlation-id e x-tenant-id', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ success: true }))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      await request(app)
        .post('/api/v1/ai/conversation')
        .set('x-correlation-id', 'custom-correlation-123')
        .send({ message: 'test' })
        .expect(200);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-correlation-id': 'custom-correlation-123',
            'x-tenant-id': 'test-tenant'
          })
        })
      );
    });

    it('deve propagar Authorization header', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        text: vi.fn().mockResolvedValue(JSON.stringify({ success: true }))
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      // Act
      await request(app)
        .post('/api/v1/ai/conversation')
        .set('Authorization', 'Bearer test-token-123')
        .send({ message: 'test' })
        .expect(200);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'authorization': 'Bearer test-token-123'
          })
        })
      );
    });
  });
});
