import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

import { WebSocket } from 'ws';

import type { ExtendedWebSocket, LogEntry, WebSocketMessage } from '../types/index.js';

interface WebSocketConfig {
  pingInterval: number;      // Intervalo entre pings (ms)
  pingTimeout: number;       // Timeout para pong response (ms)
  maxPayloadSize: number;    // Tamanho máximo do payload (bytes)
  heartbeatInterval: number; // Intervalo do heartbeat check (ms)
}

export class WebSocketService {
  private static instance: WebSocketService;
  private connections = new Map<string, ExtendedWebSocket>();
  private tenantConnections = new Map<string, Set<string>>();
  private heartbeatTimer?: NodeJS.Timeout;
  private config: WebSocketConfig;

  private constructor() {
    this.config = {
      pingInterval: 25000,      // 25 segundos entre pings
      pingTimeout: 60000,       // 60 segundos timeout para pong
      maxPayloadSize: 1024 * 16, // 16KB máximo
      heartbeatInterval: 30000   // 30 segundos heartbeat check
    };
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Log estruturado com contexto de tenant e correlação
   */
  private logStructured(
    level: 'info' | 'warn' | 'error' | 'debug',
    msg: string,
    metadata: Record<string, any> = {},
    tenantId?: string,
    correlationId?: string
  ): void {
    const logEntry: LogEntry = {
      service: 'api-gateway-websocket',
      tenant_id: tenantId || 'unknown',
      correlation_id: correlationId || 'unknown',
      level,
      msg,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        component: 'websocket-service'
      }
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Inicia heartbeat específico para uma conexão
   */
  private startConnectionHeartbeat(ws: ExtendedWebSocket): void {
    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.lastPing = Date.now();
        ws.ping();

        this.logStructured('debug', 'Ping sent to connection', {
          connectionId: ws.id,
          lastPing: ws.lastPing
        }, ws.tenantId, ws.correlationId);
      } else {
        clearInterval(pingTimer);
        this.logStructured('debug', 'Clearing ping timer for closed connection', {
          connectionId: ws.id,
          readyState: ws.readyState
        }, ws.tenantId, ws.correlationId);
      }
    }, this.config.pingInterval);

    // Timeout para verificar pong response
    const pongTimeout = setTimeout(() => {
      if (!ws.isAlive && ws.readyState === WebSocket.OPEN) {
        this.logStructured('warn', 'Connection pong timeout, terminating', {
          connectionId: ws.id,
          lastPing: ws.lastPing
        }, ws.tenantId, ws.correlationId);

        ws.terminate();
        clearInterval(pingTimer);
      }
    }, this.config.pingTimeout);

    // Limpar timeout quando pong é recebido
    ws.on('pong', () => {
      clearTimeout(pongTimeout);
      ws.isAlive = true;

      this.logStructured('debug', 'Pong received from connection', {
        connectionId: ws.id,
        responseTime: Date.now() - (ws.lastPing || 0)
      }, ws.tenantId, ws.correlationId);
    });
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
    const clientIP = this.getClientIP(request);

    const extendedWs = ws as unknown as ExtendedWebSocket;
    extendedWs.id = connectionId;
    extendedWs.tenantId = tenantId;
    extendedWs.correlationId = correlationId;
    extendedWs.connectedAt = connectedAt;
    extendedWs.isAlive = true;
    extendedWs.lastPing = Date.now();

    this.connections.set(connectionId, extendedWs);

    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId)!.add(connectionId);

    // Log estruturado de conexão
    this.logStructured('info', 'WebSocket connection established', {
      connectionId,
      tenantId,
      correlationId,
      clientIP,
      totalConnections: this.connections.size,
      tenantConnections: this.tenantConnections.get(tenantId)!.size
    }, tenantId, correlationId);

    this.sendWelcomeMessage(extendedWs);
    this.setupEventHandlers(extendedWs);
    this.startConnectionHeartbeat(extendedWs);
  }

  private getClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (Array.isArray(forwarded)) {
      return forwarded[0] || 'unknown';
    }
    return forwarded || request.socket.remoteAddress || 'unknown';
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
    // Handler de mensagem com sanitização e validação
    ws.on('message', (data: Buffer) => {
      try {
        this.handleMessage(ws, data);
      } catch (error) {
        this.logStructured('error', 'Error processing message', {
          connectionId: ws.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          dataSize: data.length
        }, ws.tenantId, ws.correlationId);

        // Enviar erro de volta para o cliente
        const errorMessage: WebSocketMessage = {
          type: 'error',
          correlation_id: ws.correlationId,
          tenant_id: ws.tenantId,
          data: {
            error: 'Message processing failed',
            code: 'MESSAGE_PROCESSING_ERROR'
          },
          timestamp: new Date().toISOString()
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(errorMessage));
        }
      }
    });

    // Handler de pong melhorado
    ws.on('pong', () => {
      ws.isAlive = true;

      this.logStructured('debug', 'Pong received from connection', {
        connectionId: ws.id,
        responseTime: ws.lastPing ? Date.now() - ws.lastPing : 0
      }, ws.tenantId, ws.correlationId);
    });

    // Handler de close com logging estruturado
    ws.on('close', (code: number, reason: Buffer) => {
      this.logStructured('info', 'WebSocket connection closed', {
        connectionId: ws.id,
        closeCode: code,
        closeReason: reason.toString() || 'No reason provided',
        connectionDuration: Date.now() - new Date(ws.connectedAt).getTime()
      }, ws.tenantId, ws.correlationId);

      this.handleDisconnection(ws);
    });

    // Handler de erro robusto
    ws.on('error', (error: Error) => {
      this.logStructured('error', 'WebSocket connection error', {
        connectionId: ws.id,
        error: error.message,
        stack: error.stack,
        errorCode: (error as any).code || 'UNKNOWN',
        readyState: ws.readyState
      }, ws.tenantId, ws.correlationId);

      // Não terminar automaticamente - deixar o cliente decidir
    });
  }

  private handleMessage(ws: ExtendedWebSocket, data: Buffer): void {
    // Verificar tamanho do payload
    if (data.length > this.config.maxPayloadSize) {
      this.logStructured('warn', 'Payload size exceeds maximum allowed', {
        connectionId: ws.id,
        payloadSize: data.length,
        maxAllowed: this.config.maxPayloadSize
      }, ws.tenantId, ws.correlationId);

      const errorMessage: WebSocketMessage = {
        type: 'error',
        correlation_id: ws.correlationId,
        tenant_id: ws.tenantId,
        data: {
          error: 'Payload too large',
          code: 'PAYLOAD_TOO_LARGE',
          maxSize: this.config.maxPayloadSize,
          receivedSize: data.length
        },
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(errorMessage));
      return;
    }

    let message: WebSocketMessage;
    try {
      const rawMessage = data.toString('utf8');
      message = JSON.parse(rawMessage) as WebSocketMessage;
    } catch (error) {
      this.logStructured('warn', 'Invalid JSON message received', {
        connectionId: ws.id,
        error: error instanceof Error ? error.message : 'Parse error',
        rawDataPreview: data.toString('utf8').substring(0, 100)
      }, ws.tenantId, ws.correlationId);

      const errorMessage: WebSocketMessage = {
        type: 'error',
        correlation_id: ws.correlationId,
        tenant_id: ws.tenantId,
        data: {
          error: 'Invalid JSON format',
          code: 'INVALID_JSON'
        },
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(errorMessage));
      return;
    }

    // Sanitização básica da mensagem
    if (!this.isValidMessage(message)) {
      this.logStructured('warn', 'Invalid message format received', {
        connectionId: ws.id,
        messageType: (message as any)?.type || 'undefined',
        hasData: !!(message as any)?.data
      }, ws.tenantId, ws.correlationId);

      const errorMessage: WebSocketMessage = {
        type: 'error',
        correlation_id: ws.correlationId,
        tenant_id: ws.tenantId,
        data: {
          error: 'Invalid message format',
          code: 'INVALID_MESSAGE_FORMAT'
        },
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(errorMessage));
      return;
    }

    // Log da mensagem válida
    this.logStructured('debug', 'Valid message received', {
      connectionId: ws.id,
      messageType: message.type,
      payloadSize: data.length,
      hasData: !!message.data
    }, ws.tenantId, ws.correlationId);

    // Processar mensagem por tipo
    switch (message.type) {
      case 'ping':
        this.handlePing(ws, message);
        break;
      default:
        this.handleEcho(ws, message);
        break;
    }
  }

  /**
   * Valida formato básico da mensagem
   */
  private isValidMessage(message: any): message is WebSocketMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      typeof message.type === 'string' &&
      message.type.length > 0 &&
      message.type.length < 100 // Limite razoável para tipo
    );
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
    // Sanitizar payload antes do broadcast
    if (!this.isValidMessage(message)) {
      this.logStructured('error', 'Invalid message format for broadcast', {
        tenantId,
        messageType: (message as any)?.type || 'undefined'
      }, tenantId);
      return 0;
    }

    const serializedMessage = JSON.stringify(message);
    const messageSize = Buffer.byteLength(serializedMessage, 'utf8');

    // Verificar tamanho do payload
    if (messageSize > this.config.maxPayloadSize) {
      this.logStructured('error', 'Broadcast message too large', {
        tenantId,
        messageSize,
        maxAllowed: this.config.maxPayloadSize,
        messageType: message.type
      }, tenantId);
      return 0;
    }

    const tenantConnections = this.tenantConnections.get(tenantId);
    if (!tenantConnections) {
      this.logStructured('debug', 'No connections found for tenant broadcast', {
        tenantId,
        messageType: message.type
      }, tenantId);
      return 0;
    }

    let sentCount = 0;
    let errorCount = 0;

    tenantConnections.forEach(connectionId => {
      const ws = this.connections.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(serializedMessage);
          sentCount++;
        } catch (error) {
          errorCount++;
          this.logStructured('error', 'Failed to send broadcast message to connection', {
            connectionId,
            tenantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, tenantId, ws.correlationId);
        }
      }
    });

    this.logStructured('info', 'Tenant broadcast completed', {
      tenantId,
      messageType: message.type,
      totalConnections: tenantConnections.size,
      sentCount,
      errorCount,
      messageSize
    }, tenantId);

    return sentCount;
  }

  broadcastToAll(message: WebSocketMessage): number {
    // Sanitizar payload antes do broadcast
    if (!this.isValidMessage(message)) {
      this.logStructured('error', 'Invalid message format for global broadcast', {
        messageType: (message as any)?.type || 'undefined'
      });
      return 0;
    }

    const serializedMessage = JSON.stringify(message);
    const messageSize = Buffer.byteLength(serializedMessage, 'utf8');

    // Verificar tamanho do payload
    if (messageSize > this.config.maxPayloadSize) {
      this.logStructured('error', 'Global broadcast message too large', {
        messageSize,
        maxAllowed: this.config.maxPayloadSize,
        messageType: message.type
      });
      return 0;
    }

    let sentCount = 0;
    let errorCount = 0;

    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(serializedMessage);
          sentCount++;
        } catch (error) {
          errorCount++;
          this.logStructured('error', 'Failed to send global broadcast message to connection', {
            connectionId: ws.id,
            tenantId: ws.tenantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, ws.tenantId, ws.correlationId);
        }
      }
    });

    this.logStructured('info', 'Global broadcast completed', {
      messageType: message.type,
      totalConnections: this.connections.size,
      sentCount,
      errorCount,
      messageSize
    });

    return sentCount;
  }

  private handleDisconnection(ws: ExtendedWebSocket): void {
    const connectionDuration = Date.now() - new Date(ws.connectedAt).getTime();

    this.logStructured('info', 'Handling WebSocket disconnection', {
      connectionId: ws.id,
      connectionDuration,
      totalConnectionsBefore: this.connections.size
    }, ws.tenantId, ws.correlationId);

    this.connections.delete(ws.id);

    const tenantConnections = this.tenantConnections.get(ws.tenantId);
    if (tenantConnections) {
      tenantConnections.delete(ws.id);
      if (tenantConnections.size === 0) {
        this.tenantConnections.delete(ws.tenantId);
        this.logStructured('info', 'Last connection for tenant removed', {
          tenantId: ws.tenantId
        }, ws.tenantId, ws.correlationId);
      }
    }

    this.logStructured('info', 'WebSocket disconnection handled', {
      connectionId: ws.id,
      totalConnectionsAfter: this.connections.size,
      tenantConnectionsRemaining: tenantConnections?.size || 0
    }, ws.tenantId, ws.correlationId);
  }

  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      tenantStats: {} as Record<string, number>,
      healthyConnections: 0,
      staleConnections: 0
    };

    this.tenantConnections.forEach((connections, tenantId) => {
      stats.tenantStats[tenantId] = connections.size;
    });

    // Verificar saúde das conexões
    this.connections.forEach(ws => {
      if (ws.isAlive) {
        stats.healthyConnections++;
      } else {
        stats.staleConnections++;
      }
    });

    return stats;
  }

  startHeartbeat(intervalMs: number = 30000): NodeJS.Timeout {
    this.logStructured('info', 'Starting global WebSocket heartbeat', {
      intervalMs,
      pingInterval: this.config.pingInterval,
      pingTimeout: this.config.pingTimeout
    });

    return setInterval(() => {
      const stats = this.getConnectionStats();

      this.logStructured('debug', 'Global heartbeat check starting', {
        ...stats,
        checkInterval: intervalMs
      });

      const terminatedConnections: string[] = [];

      for (const ws of this.connections.values()) {
        if (ws.isAlive === false) {
          this.logStructured('warn', 'Terminating unresponsive connection', {
            connectionId: ws.id,
            lastPing: ws.lastPing,
            connectionAge: Date.now() - new Date(ws.connectedAt).getTime()
          }, ws.tenantId, ws.correlationId);

          ws.terminate();
          terminatedConnections.push(ws.id);
          this.handleDisconnection(ws);
        } else {
          // Reset para próxima verificação
          ws.isAlive = false;

          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
            ws.lastPing = Date.now();
          }
        }
      }

      if (terminatedConnections.length > 0) {
        this.logStructured('info', 'Global heartbeat check completed', {
          terminatedConnections: terminatedConnections.length,
          remainingConnections: this.connections.size
        });
      }
    }, intervalMs);
  }
}
