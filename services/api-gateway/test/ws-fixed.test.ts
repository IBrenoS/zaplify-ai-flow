import { randomUUID } from 'crypto';
import express from 'express';
import { createServer, type Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';

// Import WebSocket service
import { WebSocketService } from '../src/services/websocket.js';
import type { WebSocketMessage } from '../src/types/index.js';

const parseMessage = (data: any): WebSocketMessage => {
  return JSON.parse(data.toString());
};

describe('WebSocket Tests', () => {
  let server: Server;
  let wsServer: WebSocketServer;
  let wsService: WebSocketService;
  let serverPort: number;

  beforeAll(async () => {
    // Create Express app for WebSocket server
    const app = express();

    // Create HTTP server
    server = createServer(app);

    // Get random port
    serverPort = 0;
    await new Promise<void>((resolve) => {
      server.listen(serverPort, () => {
        const address = server.address();
        if (address && typeof address !== 'string') {
          serverPort = address.port;
        }
        resolve();
      });
    });

    // Create WebSocket server
    wsServer = new WebSocketServer({ server });
    wsService = new WebSocketService(wsServer);
  });

  afterAll(async () => {
    // Clean shutdown
    if (wsServer) {
      wsServer.close();
    }
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('WebSocket Connection & Handshake', () => {
    it('should establish connection with tenant and correlation context', async () => {
      const tenantId = 'test-tenant';
      const correlationId = randomUUID();

      // Create WebSocket connection with query parameters
      const client = new WebSocket(`ws://localhost:${serverPort}/ws?x-tenant-id=${tenantId}&x-correlation-id=${correlationId}`);

      const welcomeMessage = await new Promise<WebSocketMessage>((resolve, reject) => {
        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);

          if (message.type === 'welcome') {
            resolve(message);
          }
        };

        client.onerror = reject;
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(welcomeMessage).toMatchObject({
        type: 'welcome',
        payload: {
          connectionId: expect.any(String),
          tenant_id: tenantId,
          correlation_id: correlationId,
        },
        timestamp: expect.any(String),
      });

      expect(welcomeMessage.tenant_id).toBe(tenantId);
      expect(welcomeMessage.correlation_id).toBe(correlationId);
      expect(welcomeMessage.payload.connectionId).toBeDefined();
      expect(welcomeMessage.payload.tenant_id).toBe(tenantId);
      expect(welcomeMessage.payload.correlation_id).toBe(correlationId);

      client.close();
    });

    it('should use default values when context not provided', async () => {
      const client = new WebSocket(`ws://localhost:${serverPort}/ws`);

      const welcomeMessage = await new Promise<WebSocketMessage>((resolve, reject) => {
        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);

          if (message.type === 'welcome') {
            resolve(message);
          }
        };

        client.onerror = reject;
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(welcomeMessage.tenant_id).toBe('default');
      expect(welcomeMessage.correlation_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(welcomeMessage.payload.connectionId).toBeDefined();

      client.close();
    });
  });

  describe('Ping/Pong Mechanism', () => {
    it('should respond to ping with pong', async () => {
      const client = new WebSocket(`ws://localhost:${serverPort}/ws`);

      const result = await new Promise<{ welcome: WebSocketMessage; pong: WebSocketMessage }>((resolve, reject) => {
        let welcome: WebSocketMessage | null = null;
        let pong: WebSocketMessage | null = null;

        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);

          if (message.type === 'welcome') {
            welcome = message;
            // Send ping after welcome
            client.send(JSON.stringify({
              type: 'ping',
              payload: { timestamp: Date.now() }
            }));
          } else if (message.type === 'pong') {
            pong = message;

            if (welcome && pong) {
              resolve({ welcome, pong });
            }
          }
        };

        client.onerror = reject;
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(result.welcome.type).toBe('welcome');
      expect(result.pong.type).toBe('pong');
      expect(result.pong.payload).toMatchObject({
        timestamp: expect.any(Number),
        server_timestamp: expect.any(Number),
      });

      client.close();
    });

    it('should handle multiple ping/pong cycles', async () => {
      const client = new WebSocket(`ws://localhost:${serverPort}/ws`);
      const expectedPongs = 3;

      const pongs = await new Promise<WebSocketMessage[]>((resolve, reject) => {
        const receivedPongs: WebSocketMessage[] = [];
        let pingsToSend = expectedPongs;

        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);

          if (message.type === 'welcome') {
            // Send first ping
            sendPing();
          } else if (message.type === 'pong') {
            receivedPongs.push(message);

            if (receivedPongs.length < expectedPongs) {
              sendPing();
            } else {
              resolve(receivedPongs);
            }
          }
        };

        function sendPing() {
          if (pingsToSend > 0) {
            client.send(JSON.stringify({
              type: 'ping',
              payload: { timestamp: Date.now(), sequence: expectedPongs - pingsToSend + 1 }
            }));
            pingsToSend--;
          }
        }

        client.onerror = reject;
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });

      expect(pongs).toHaveLength(expectedPongs);
      pongs.forEach((pong, index) => {
        expect(pong.type).toBe('pong');
        expect(pong.payload).toMatchObject({
          timestamp: expect.any(Number),
          server_timestamp: expect.any(Number),
          sequence: index + 1,
        });
      });

      client.close();
    });
  });

  describe('Message Echo & Broadcasting', () => {
    it('should echo custom messages', async () => {
      const client = new WebSocket(`ws://localhost:${serverPort}/ws`);

      const result = await new Promise<{ welcome: WebSocketMessage; echo: WebSocketMessage }>((resolve, reject) => {
        let welcome: WebSocketMessage | null = null;
        let echo: WebSocketMessage | null = null;

        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);

          if (message.type === 'welcome') {
            welcome = message;
            // Send custom message after welcome
            client.send(JSON.stringify({
              type: 'echo',
              payload: {
                message: 'Hello from test client',
                customData: { value: 42, nested: { test: true } }
              }
            }));
          } else if (message.type === 'echo') {
            echo = message;

            if (welcome && echo) {
              resolve({ welcome, echo });
            }
          }
        };

        client.onerror = reject;
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(result.echo.type).toBe('echo');
      expect(result.echo.payload).toMatchObject({
        message: 'Hello from test client',
        customData: { value: 42, nested: { test: true } },
        server_timestamp: expect.any(Number),
      });

      client.close();
    });

    it('should handle malformed JSON gracefully', async () => {
      const client = new WebSocket(`ws://localhost:${serverPort}/ws`);

      const echoMessage = await new Promise<WebSocketMessage>((resolve, reject) => {
        let welcomeReceived = false;

        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);

          if (message.type === 'welcome') {
            welcomeReceived = true;
            // Send malformed JSON
            client.send('{ invalid json }');

            // Send valid message after invalid one
            setTimeout(() => {
              client.send(JSON.stringify({
                type: 'echo',
                payload: { message: 'Valid message after invalid' }
              }));
            }, 100);
          } else if (message.type === 'echo' && welcomeReceived) {
            resolve(message);
          }
        };

        client.onerror = reject;
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      // Should still process valid messages after invalid ones
      expect(echoMessage.type).toBe('echo');
      expect(echoMessage.payload.message).toBe('Valid message after invalid');

      client.close();
    });
  });

  describe('Connection Management', () => {
    it('should track multiple connections', async () => {
      const tenantId = 'multi-test-tenant';
      const clients: WebSocket[] = [];

      // Create multiple connections
      for (let i = 0; i < 3; i++) {
        const client = new WebSocket(`ws://localhost:${serverPort}/ws?x-tenant-id=${tenantId}`);
        clients.push(client);

        await new Promise<void>((resolve, reject) => {
          client.onopen = () => resolve();
          client.onerror = reject;
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
      }

      // Wait for all welcome messages
      const welcomeMessages = await Promise.all(
        clients.map(client => new Promise<WebSocketMessage>((resolve, reject) => {
          client.onmessage = (event) => {
            const message: WebSocketMessage = parseMessage(event.data);
            if (message.type === 'welcome') {
              resolve(message);
            }
          };
          setTimeout(() => reject(new Error('Welcome timeout')), 5000);
        }))
      );

      expect(welcomeMessages).toHaveLength(3);
      welcomeMessages.forEach(msg => {
        expect(msg.tenant_id).toBe(tenantId);
        expect(msg.payload.connectionId).toBeDefined();
      });

      // Close all connections
      clients.forEach(client => client.close());
    });

    it('should handle connection close properly', async () => {
      const client = new WebSocket(`ws://localhost:${serverPort}/ws`);

      await new Promise<void>((resolve, reject) => {
        client.onopen = () => resolve();
        client.onerror = reject;
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Wait for welcome message
      await new Promise<WebSocketMessage>((resolve, reject) => {
        client.onmessage = (event) => {
          const message: WebSocketMessage = parseMessage(event.data);
          if (message.type === 'welcome') {
            resolve(message);
          }
        };
        setTimeout(() => reject(new Error('Welcome timeout')), 5000);
      });

      // Close connection
      const closePromise = new Promise<void>((resolve) => {
        client.onclose = () => resolve();
      });

      client.close();
      await closePromise;

      expect(client.readyState).toBe(WebSocket.CLOSED);
    });
  });
});
