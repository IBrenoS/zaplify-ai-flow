import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import WebSocket from 'ws';

import { WebSocketService } from './services/websocket.js';

describe('WebSocket Service', () => {
  let wsService: WebSocketService;
  let mockRequest: any;
  let mockWebSocket: any;

  beforeEach(() => {
    wsService = WebSocketService.getInstance();

    // Limpar conexões entre testes (singleton)
    (wsService as any).connections.clear();
    (wsService as any).tenantConnections.clear();

    // Mock do request
    mockRequest = {
      url: '/ws',
      headers: {
        host: 'localhost:8080'
      },
      socket: {
        remoteAddress: '127.0.0.1'
      }
    };

    // Mock do WebSocket
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      on: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('deve configurar conexão com defaults', () => {
    wsService.setupConnection(mockWebSocket as any, mockRequest);

    // Verificar se propriedades foram adicionadas
    expect(mockWebSocket.id).toBeDefined();
    expect(mockWebSocket.tenantId).toBe('default');
    expect(mockWebSocket.correlationId).toBeDefined();
    expect(mockWebSocket.connectedAt).toBeDefined();
    expect(mockWebSocket.isAlive).toBe(true);

    // Verificar se mensagem de boas-vindas foi enviada
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('welcome')
    );

    // Verificar se event handlers foram configurados
    expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWebSocket.on).toHaveBeenCalledWith('pong', expect.any(Function));
    expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('deve extrair tenant_id e correlation_id da querystring', () => {
    mockRequest.url = '/ws?x-tenant-id=test-tenant&x-correlation-id=test-123';

    wsService.setupConnection(mockWebSocket as any, mockRequest);

    expect(mockWebSocket.tenantId).toBe('test-tenant');
    expect(mockWebSocket.correlationId).toBe('test-123');
  });

  test('deve extrair tenant_id e correlation_id dos headers', () => {
    mockRequest.headers = {
      ...mockRequest.headers,
      'x-tenant-id': 'header-tenant',
      'x-correlation-id': 'header-123'
    };

    wsService.setupConnection(mockWebSocket as any, mockRequest);

    expect(mockWebSocket.tenantId).toBe('header-tenant');
    expect(mockWebSocket.correlationId).toBe('header-123');
  });

  test('deve priorizar querystring sobre headers', () => {
    mockRequest.url = '/ws?x-tenant-id=query-tenant';
    mockRequest.headers = {
      ...mockRequest.headers,
      'x-tenant-id': 'header-tenant'
    };

    wsService.setupConnection(mockWebSocket as any, mockRequest);

    expect(mockWebSocket.tenantId).toBe('query-tenant');
  });

  test('deve retornar estatísticas de conexões', () => {
    // Conectar alguns WebSockets
    const ws1 = { ...mockWebSocket, send: vi.fn() };
    const ws2 = { ...mockWebSocket, send: vi.fn() };

    mockRequest.url = '/ws?x-tenant-id=tenant1';
    wsService.setupConnection(ws1 as any, mockRequest);

    mockRequest.url = '/ws?x-tenant-id=tenant2';
    wsService.setupConnection(ws2 as any, mockRequest);

    const stats = wsService.getConnectionStats();

    expect(stats.totalConnections).toBe(2);
    expect(stats.tenantStats).toEqual({
      tenant1: 1,
      tenant2: 1
    });
  });

  test('deve fazer broadcast para tenant específico', () => {
    // Conectar WebSockets de diferentes tenants
    const ws1 = { ...mockWebSocket, send: vi.fn() };
    const ws2 = { ...mockWebSocket, send: vi.fn() };
    const ws3 = { ...mockWebSocket, send: vi.fn() };

    mockRequest.url = '/ws?x-tenant-id=tenant1';
    wsService.setupConnection(ws1 as any, mockRequest);
    wsService.setupConnection(ws2 as any, mockRequest);

    mockRequest.url = '/ws?x-tenant-id=tenant2';
    wsService.setupConnection(ws3 as any, mockRequest);

    // Fazer broadcast para tenant1
    const sentCount = wsService.broadcastToTenant('tenant1', {
      type: 'notification',
      data: { message: 'Hello tenant1' }
    });

    expect(sentCount).toBe(2); // Apenas ws1 e ws2
    expect(ws1.send).toHaveBeenCalledWith(
      expect.stringContaining('notification')
    );
    expect(ws2.send).toHaveBeenCalledWith(
      expect.stringContaining('notification')
    );
    // ws3 não deve receber a mensagem de broadcast (apenas welcome)
    expect(ws3.send).toHaveBeenCalledTimes(1); // Apenas welcome message
    expect(ws3.send).not.toHaveBeenCalledWith(
      expect.stringContaining('notification')
    );
  });

  test('deve fazer broadcast para todas as conexões', () => {
    // Conectar WebSockets de diferentes tenants
    const ws1 = { ...mockWebSocket, send: vi.fn() };
    const ws2 = { ...mockWebSocket, send: vi.fn() };

    mockRequest.url = '/ws?x-tenant-id=tenant1';
    wsService.setupConnection(ws1 as any, mockRequest);

    mockRequest.url = '/ws?x-tenant-id=tenant2';
    wsService.setupConnection(ws2 as any, mockRequest);

    // Fazer broadcast global
    const sentCount = wsService.broadcastToAll({
      type: 'system_notification',
      data: { message: 'Global message' }
    });

    expect(sentCount).toBe(2);
    expect(ws1.send).toHaveBeenCalledWith(
      expect.stringContaining('system_notification')
    );
    expect(ws2.send).toHaveBeenCalledWith(
      expect.stringContaining('system_notification')
    );
  });

  test('deve retornar 0 para broadcast em tenant inexistente', () => {
    const sentCount = wsService.broadcastToTenant('nonexistent-tenant', {
      type: 'test',
      data: {}
    });

    expect(sentCount).toBe(0);
  });
});
