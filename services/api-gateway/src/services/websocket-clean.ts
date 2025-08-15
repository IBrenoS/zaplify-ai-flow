import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

import { WebSocket } from 'ws';

import type { ExtendedWebSocket, WebSocketMessage } from '../types/index.js';

export class WebSocketService {
  private static instance: WebSocketService;
  private connections = new Map<string, ExtendedWebSocket>();
  private tenantConnections = new Map<string, Set<string>>();

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private extractConnectionContext(request: IncomingMessage): { tenantId: string; correlationId: string } {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    const tenantId =
      url.searchParams.get('x-tenant-id') ||
      url.searchParams.get('tenant_id') ||
      request.headers['x-tenant-id'] as string ||
      'default';

    const correlationId =
      url.searchParams.get('x-correlation-id') ||
      url.searchParams.get('correlation_id') ||
      request.headers['x-correlation-id'] as string ||
      randomUUID();

    return { tenantId, correlationId };
  }

  setupConnection(ws: WebSocket, request: IncomingMessage): void {
    const { tenantId, correlationId } = this.extractConnectionContext(request);
    const connectionId = randomUUID();
    const connectedAt = new Date().toISOString();

    const extendedWs = ws as unknown as ExtendedWebSocket;
    extendedWs.id = connectionId;
    extendedWs.tenantId = tenantId;
    extendedWs.correlationId = correlationId;
    extendedWs.connectedAt = connectedAt;
    extendedWs.isAlive = true;

    this.connections.set(connectionId, extendedWs);

    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId)!.add(connectionId);

    console.log(`[WebSocket] Connection established: ${connectionId} (tenant: ${tenantId})`);
    this.sendWelcomeMessage(extendedWs);
    this.setupEventHandlers(extendedWs);
  }

  private sendWelcomeMessage(ws: ExtendedWebSocket): void {
    const welcomeMessage: WebSocketMessage = {
      type: 'welcome',
      correlation_id: ws.correlationId,
      tenant_id: ws.tenantId,
      data: {
        connection_id: ws.id,
        connected_at: ws.connectedAt,
        message: 'WebSocket connection established'
      },
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(welcomeMessage));
  }

  private setupEventHandlers(ws: ExtendedWebSocket): void {
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error: ${error.message} (${ws.id})`);
    });
  }

  private handleMessage(ws: ExtendedWebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      console.log(`[WebSocket] Message received: ${message.type} (${ws.id})`);

      switch (message.type) {
        case 'ping':
          this.handlePing(ws, message);
          break;
        default:
          this.handleEcho(ws, message);
          break;
      }
    } catch (error) {
      console.error(`[WebSocket] Error processing message: ${error} (${ws.id})`);
    }
  }

  private handlePing(ws: ExtendedWebSocket, pingMessage: WebSocketMessage): void {
    const pongMessage: WebSocketMessage = {
      type: 'pong',
      correlation_id: ws.correlationId,
      tenant_id: ws.tenantId,
      data: {
        ping_data: pingMessage.data,
        server_time: new Date().toISOString(),
        connection_id: ws.id
      },
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(pongMessage));
    console.log(`[WebSocket] Ping/Pong completed: ${ws.id}`);
  }

  private handleEcho(ws: ExtendedWebSocket, originalMessage: WebSocketMessage): void {
    const echoMessage: WebSocketMessage = {
      type: 'echo',
      correlation_id: ws.correlationId,
      tenant_id: ws.tenantId,
      data: {
        original_message: originalMessage,
        echo_time: new Date().toISOString(),
        connection_id: ws.id
      },
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(echoMessage));
  }

  broadcastToTenant(tenantId: string, message: WebSocketMessage): number {
    const tenantConnections = this.tenantConnections.get(tenantId);
    if (!tenantConnections) {
      return 0;
    }

    let sentCount = 0;
    tenantConnections.forEach(connectionId => {
      const ws = this.connections.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    console.log(`[WebSocket] Broadcast to tenant ${tenantId}: ${sentCount} connections`);
    return sentCount;
  }

  broadcastToAll(message: WebSocketMessage): number {
    let sentCount = 0;
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    console.log(`[WebSocket] Global broadcast: ${sentCount} connections`);
    return sentCount;
  }

  private handleDisconnection(ws: ExtendedWebSocket): void {
    this.connections.delete(ws.id);

    const tenantConnections = this.tenantConnections.get(ws.tenantId);
    if (tenantConnections) {
      tenantConnections.delete(ws.id);
      if (tenantConnections.size === 0) {
        this.tenantConnections.delete(ws.tenantId);
      }
    }

    console.log(`[WebSocket] Connection closed: ${ws.id} (total: ${this.connections.size})`);
  }

  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      tenantStats: {} as Record<string, number>
    };

    this.tenantConnections.forEach((connections, tenantId) => {
      stats.tenantStats[tenantId] = connections.size;
    });

    return stats;
  }

  startHeartbeat(intervalMs: number = 30000): NodeJS.Timeout {
    console.log(`[WebSocket] Starting heartbeat: ${intervalMs}ms`);

    return setInterval(() => {
      console.log(`[WebSocket] Heartbeat check: ${this.connections.size} connections`);

      for (const ws of this.connections.values()) {
        if (ws.isAlive === false) {
          console.log(`[WebSocket] Terminating dead connection: ${ws.id}`);
          ws.terminate();
          this.handleDisconnection(ws);
        } else {
          ws.isAlive = false;
          ws.ping();
        }
      }
    }, intervalMs);
  }
}
