# WebSocket Robustez - Guia de Teste e Reconexão

Este guia fornece instruções para testar os recursos de robustez do WebSocket implementados no **Prompt 6**.

## 📋 Configuração de Robustez

O servi# 🚀 Uso do cliente robusto
const client = new RobustWebSocketClient('ws://localhost:8080'); WebSocket está configurado com as seguintes capacidades de robustez:

### ⚙️ Configurações de Robustez

```typescript
interface WebSocketConfig {
  pingInterval: number; // Intervalo entre pings (25s)
  pingTimeout: number; // Timeout para pong response (60s)
  maxPayloadSize: number; // Tamanho máximo do payload (16KB)
  heartbeatInterval: number; // Intervalo do heartbeat check (30s)
}
```

### 🛡️ Recursos de Robustez Implementados

1. **Heartbeat automático**: Ping/Pong a cada 25 segundos
2. **Timeout de conexão**: Conexões sem resposta são terminadas após 60 segundos
3. **Sanitização de payload**: Validação de tamanho e formato de mensagens
4. **Logging estruturado**: Todos os eventos são logados com contexto de tenant e correlação
5. **Tratamento robusto de erro**: Handlers específicos para diferentes tipos de erro
6. **Reconexão automática**: Exemplos de implementação para clientes

### 📊 Logs Estruturados

Todos os eventos são logados com o seguinte formato:

```json
{
  "service": "api-gateway-websocket",
  "tenant_id": "tenant-001",
  "correlation_id": "conn-12345-abc",
  "level": "info",
  "msg": "Nova conexão WebSocket estabelecida",
  "timestamp": "2025-01-26T10:30:00.000Z",
  "metadata": {
    "connectionId": "ws-12345",
    "clientIP": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "component": "websocket-service"
  }
}
```

---

## 🧪 Testando a Conexão Básica

### 1. 🟢 Node.js Client com Reconexão Automática

```javascript
const WebSocket = require('ws');

class RobustWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      maxReconnectAttempts: 5,
      reconnectInterval: 1000,
      backoffMultiplier: 1.5,
      maxReconnectInterval: 30000,
      ...options,
    };
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.shouldReconnect = true;
    this.heartbeatInterval = null;

    this.connect();
  }

  connect() {
    if (this.isConnecting) return;

    this.isConnecting = true;

    console.log(`🔌 Conectando ao WebSocket: ${this.url}`);

    // Adicionar headers de contexto
    const headers = {
      'x-tenant-id': 'tenant-test-001',
      'x-correlation-id': `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.ws = new WebSocket(this.url, { headers });

    this.ws.on('open', () => {
      console.log('✅ Conexão WebSocket estabelecida');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Mensagem recebida:', message);

        // Responder a pings do servidor
        if (message.type === 'ping') {
          this.send({
            type: 'pong',
            data: message.data,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error.message);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 Conexão fechada: ${code} - ${reason}`);
      this.isConnecting = false;
      this.stopHeartbeat();

      if (this.shouldReconnect) {
        this.handleReconnection();
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ Erro na conexão:', error.message);
      this.isConnecting = false;
    });

    this.ws.on('pong', () => {
      console.log('🏓 Pong recebido do servidor');
    });
  }

  handleReconnection() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectInterval *
        Math.pow(this.options.backoffMultiplier, this.reconnectAttempts - 1),
      this.options.maxReconnectInterval,
    );

    console.log(
      `🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} em ${delay}ms`,
    );

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('💓 Enviando ping para servidor');
        this.ws.ping();
      }
    }, 20000); // Ping a cada 20 segundos (menor que o intervalo do servidor)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        console.log('📤 Mensagem enviada:', message);
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error.message);
      }
    } else {
      console.warn('⚠️ WebSocket não está conectado');
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
}

// 🚀 Uso do cliente robusto
const client = new RobustWebSocketClient('ws://localhost:3001');

// Testar envio de mensagens
setTimeout(() => {
  client.send({
    type: 'ping',
    data: { message: 'Hello from Node.js client' },
    timestamp: new Date().toISOString(),
  });
}, 2000);

// Simular desconexão após 10 segundos
setTimeout(() => {
  console.log('🔚 Desconectando cliente...');
  client.disconnect();
}, 10000);
```

### 2. 🌐 Browser Client com Reconexão Automática

Salve como `websocket-test.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>WebSocket Robust Client Test</title>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: 'Courier New', monospace;
        margin: 20px;
        background-color: #f5f5f5;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
        text-align: center;
      }
      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        justify-content: center;
      }
      button {
        padding: 10px 20px;
        font-size: 14px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      .connect {
        background-color: #4caf50;
        color: white;
      }
      .disconnect {
        background-color: #f44336;
        color: white;
      }
      .ping {
        background-color: #2196f3;
        color: white;
      }
      .connect:hover {
        background-color: #45a049;
      }
      .disconnect:hover {
        background-color: #da190b;
      }
      .ping:hover {
        background-color: #1976d2;
      }
      #status {
        font-weight: bold;
        margin: 10px 0;
        padding: 10px;
        text-align: center;
        border-radius: 4px;
        background-color: #f0f0f0;
      }
      .connected {
        background-color: #dff0d8;
        color: #3c763d;
      }
      .disconnected {
        background-color: #f2dede;
        color: #a94442;
      }
      .connecting {
        background-color: #d9edf7;
        color: #31708f;
      }
      #messages {
        height: 400px;
        overflow-y: auto;
        border: 1px solid #ddd;
        padding: 15px;
        margin-top: 20px;
        background-color: #f9f9f9;
        border-radius: 4px;
      }
      .message {
        margin-bottom: 5px;
        padding: 5px;
        border-radius: 3px;
      }
      .sent {
        background-color: #e3f2fd;
        color: #1565c0;
        border-left: 4px solid #2196f3;
      }
      .received {
        background-color: #e8f5e8;
        color: #2e7d32;
        border-left: 4px solid #4caf50;
      }
      .error {
        background-color: #ffebee;
        color: #c62828;
        border-left: 4px solid #f44336;
      }
      .info {
        background-color: #fff3e0;
        color: #ef6c00;
        border-left: 4px solid #ff9800;
      }
      .timestamp {
        font-size: 12px;
        color: #666;
        margin-right: 10px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🛡️ WebSocket Robust Client Test</h1>

      <div class="controls">
        <button class="connect" onclick="connect()">🔌 Connect</button>
        <button class="disconnect" onclick="disconnect()">❌ Disconnect</button>
        <button class="ping" onclick="sendPing()">🏓 Send Ping</button>
        <button class="ping" onclick="sendLargeMessage()">📦 Large Message</button>
        <button class="ping" onclick="sendInvalidMessage()">⚠️ Invalid Message</button>
      </div>

      <div id="status" class="disconnected">❌ Disconnected</div>

      <div id="messages"></div>
    </div>

    <script>
      class RobustWebSocketClient {
        constructor(url, options = {}) {
          this.url = url;
          this.options = {
            maxReconnectAttempts: 5,
            reconnectInterval: 1000,
            backoffMultiplier: 1.5,
            maxReconnectInterval: 30000,
            ...options,
          };
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.shouldReconnect = true;
          this.heartbeatInterval = null;
        }

        connect() {
          if (this.isConnecting) return;

          this.isConnecting = true;
          this.updateStatus('🔄 Connecting...', 'connecting');

          // Construir URL com parâmetros de contexto
          const url = new URL(this.url);
          url.searchParams.set('x-tenant-id', 'tenant-browser-001');
          url.searchParams.set(
            'x-correlation-id',
            `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          );

          console.log('🔌 Conectando ao WebSocket:', url.toString());
          this.addMessage('🔌 Conectando ao WebSocket...', 'info');

          this.ws = new WebSocket(url.toString());

          this.ws.onopen = () => {
            console.log('✅ Conexão WebSocket estabelecida');
            this.updateStatus('✅ Connected', 'connected');
            this.addMessage('✅ Conexão WebSocket estabelecida', 'received');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
          };

          this.ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log('📨 Mensagem recebida:', message);
              this.addMessage(`📨 Received: ${message.type}`, 'received');

              // Responder a pings do servidor
              if (message.type === 'ping') {
                this.send({
                  type: 'pong',
                  data: message.data,
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (error) {
              console.error('❌ Erro ao processar mensagem:', error.message);
              this.addMessage(`❌ Error: ${error.message}`, 'error');
            }
          };

          this.ws.onclose = (event) => {
            console.log(`🔌 Conexão fechada: ${event.code} - ${event.reason}`);
            this.updateStatus(`❌ Disconnected (${event.code})`, 'disconnected');
            this.addMessage(
              `🔌 Conexão fechada: ${event.code} - ${event.reason || 'No reason'}`,
              'info',
            );
            this.isConnecting = false;
            this.stopHeartbeat();

            if (this.shouldReconnect) {
              this.handleReconnection();
            }
          };

          this.ws.onerror = (error) => {
            console.error('❌ Erro na conexão:', error);
            this.updateStatus('❌ Error', 'disconnected');
            this.isConnecting = false;
            this.addMessage('❌ Connection error', 'error');
          };
        }

        handleReconnection() {
          if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            console.error('❌ Máximo de tentativas de reconexão atingido');
            this.updateStatus('❌ Failed to reconnect', 'disconnected');
            this.addMessage('❌ Máximo de tentativas de reconexão atingido', 'error');
            return;
          }

          this.reconnectAttempts++;
          const delay = Math.min(
            this.options.reconnectInterval *
              Math.pow(this.options.backoffMultiplier, this.reconnectAttempts - 1),
            this.options.maxReconnectInterval,
          );

          console.log(
            `🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} em ${delay}ms`,
          );
          this.updateStatus(
            `🔄 Reconnecting in ${Math.round(delay / 1000)}s... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`,
            'connecting',
          );
          this.addMessage(
            `🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} em ${delay}ms`,
            'info',
          );

          setTimeout(() => {
            if (this.shouldReconnect) {
              this.connect();
            }
          }, delay);
        }

        startHeartbeat() {
          this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              console.log('💓 Enviando ping para servidor');
              this.send({
                type: 'ping',
                data: { timestamp: Date.now() },
                timestamp: new Date().toISOString(),
              });
            }
          }, 20000); // Ping a cada 20 segundos
        }

        stopHeartbeat() {
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
        }

        send(message) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify(message));
              console.log('📤 Mensagem enviada:', message);
              this.addMessage(`📤 Sent: ${message.type}`, 'sent');
            } catch (error) {
              console.error('❌ Erro ao enviar mensagem:', error.message);
              this.addMessage(`❌ Send error: ${error.message}`, 'error');
            }
          } else {
            console.warn('⚠️ WebSocket não está conectado');
            this.addMessage('⚠️ WebSocket not connected', 'error');
          }
        }

        disconnect() {
          this.shouldReconnect = false;
          this.stopHeartbeat();

          if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
          }
        }

        updateStatus(status, className) {
          const statusEl = document.getElementById('status');
          statusEl.textContent = status;
          statusEl.className = className;
        }

        addMessage(message, type) {
          const div = document.createElement('div');
          div.className = `message ${type}`;

          const timestamp = new Date().toLocaleTimeString();
          div.innerHTML = `<span class="timestamp">[${timestamp}]</span>${message}`;

          const messagesDiv = document.getElementById('messages');
          messagesDiv.appendChild(div);
          div.scrollIntoView({ behavior: 'smooth' });

          // Limitar a 100 mensagens
          while (messagesDiv.children.length > 100) {
            messagesDiv.removeChild(messagesDiv.firstChild);
          }
        }
      }

      let client;

      function connect() {
        if (client) {
          client.disconnect();
        }
        client = new RobustWebSocketClient('ws://localhost:8080');
        client.connect();
      }

      function disconnect() {
        if (client) {
          client.disconnect();
        }
      }

      function sendPing() {
        if (client) {
          client.send({
            type: 'ping',
            data: { message: 'Hello from browser' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      function sendLargeMessage() {
        if (client) {
          // Enviar uma mensagem grande para testar limites
          const largeData = 'x'.repeat(20000); // 20KB
          client.send({
            type: 'large_test',
            data: { largeField: largeData },
            timestamp: new Date().toISOString(),
          });
        }
      }

      function sendInvalidMessage() {
        if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
          // Enviar JSON inválido
          client.ws.send('{ invalid json }');
          client.addMessage('📤 Sent: Invalid JSON', 'sent');
        }
      }

      // Auto-connect on page load
      window.onload = () => {
        connect();
      };
    </script>
  </body>
</html>
```

---

## 🧪 Teste de Robustez

### 1. 📏 Teste de Payload Grandes

```javascript
// Testar payload que excede o limite (16KB)
const largePayload = 'x'.repeat(20000); // 20KB

client.send({
  type: 'large_test',
  data: { largeField: largePayload },
  timestamp: new Date().toISOString(),
});

// Resultado esperado: Erro 'PAYLOAD_TOO_LARGE'
```

### 2. 🚫 Teste de Mensagens Inválidas

```javascript
// Enviar JSON inválido
ws.send('{ invalid json }');

// Enviar mensagem sem tipo
ws.send(JSON.stringify({ data: 'test' }));

// Resultado esperado: Erro 'INVALID_JSON' ou 'INVALID_MESSAGE_FORMAT'
```

### 3. 💔 Teste de Desconexão/Reconexão

```bash
# Simular queda de rede (desabilitar/habilitar interface)
# Ou parar/iniciar o servidor

# O cliente deve tentar reconectar automaticamente com backoff exponencial
```

### 4. ⏱️ Teste de Timeout

```javascript
// Conectar e parar de responder pings
// O servidor deve desconectar após ~60 segundos
```

---

## 📊 Monitoramento e Logs

### Ver logs estruturados em tempo real:

```bash
# No terminal do API Gateway
npm run dev

# Os logs aparecerão no formato JSON:
# {"service":"api-gateway-websocket","tenant_id":"tenant-001",...}
```

### Verificar estatísticas de conexão:

```bash
# Fazer GET para endpoint de estatísticas (se implementado)
curl http://localhost:8080/api/v1/ws/stats
```

---

## 🎯 Casos de Uso para Teste

### 1. **Reconexão após queda de rede**

- Desabilitar Wi-Fi por 30 segundos
- Verificar se o cliente reconecta automaticamente

### 2. **Múltiplos tenants**

- Conectar vários clientes com `x-tenant-id` diferentes
- Verificar isolamento de mensagens

### 3. **Sobrecarga de mensagens**

- Enviar muitas mensagens rapidamente
- Verificar se o servidor mantém estabilidade

### 4. **Mensagens malformadas**

- Testar diferentes tipos de JSON inválido
- Verificar se o servidor trata graciosamente

---

## ✅ Checklist de Robustez

- [ ] Heartbeat automático funcionando
- [ ] Timeout de conexão respeitado
- [ ] Payloads grandes rejeitados
- [ ] Mensagens inválidas tratadas
- [ ] Reconexão automática funcional
- [ ] Logs estruturados gerados
- [ ] Isolamento por tenant mantido
- [ ] Múltiplas conexões suportadas
- [ ] Graceful shutdown implementado
- [ ] Headers de contexto propagados

---

🎉 **Implementação do Prompt 6 concluída com sucesso!**
