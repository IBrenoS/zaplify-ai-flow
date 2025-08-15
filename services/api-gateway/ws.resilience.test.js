// 🛡️ WebSocket Robustez Test Suite
// Testes para verificar cenários de desconexão/reconexão e robustez

const WebSocket = require('ws');
const { expect } = require('chai');

describe('WebSocket Robustez Tests', function () {
  this.timeout(30000); // 30 segundos timeout

  let ws;
  const WS_URL = 'ws://localhost:8080';
  const TEST_TENANT = 'robustez-test-tenant';
  const TEST_CORRELATION = 'robustez-test-correlation';

  beforeEach(function () {
    // Reset para cada teste
    ws = null;
  });

  afterEach(function () {
    // Cleanup após cada teste
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  describe('🔌 Teste de Conexão Básica', function () {
    it('deve conectar com headers de contexto', function (done) {
      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });

      ws.on('open', () => {
        console.log('✅ Conexão estabelecida com contexto');
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('deve receber mensagem de boas-vindas', function (done) {
      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Mensagem recebida:', message);

          if (message.type === 'welcome') {
            expect(message.tenant_id).to.equal(TEST_TENANT);
            expect(message.correlation_id).to.equal(TEST_CORRELATION);
            expect(message.data.connection_id).to.be.a('string');
            done();
          }
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('💓 Teste de Heartbeat', function () {
    it('deve responder a ping com pong', function (done) {
      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });

      ws.on('open', () => {
        // Enviar ping
        const pingMessage = {
          type: 'ping',
          data: { test: 'heartbeat' },
          timestamp: new Date().toISOString(),
        };

        ws.send(JSON.stringify(pingMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'pong') {
            console.log('🏓 Pong recebido:', message);
            expect(message.data.ping_data.test).to.equal('heartbeat');
            expect(message.data.server_time).to.be.a('string');
            done();
          }
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('deve receber ping do servidor e manter conexão viva', function (done) {
      this.timeout(35000); // 35 segundos para aguardar ping do servidor

      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });
      let pingReceived = false;

      ws.on('ping', () => {
        console.log('💓 Ping recebido do servidor');
        pingReceived = true;
        ws.pong(); // Responder com pong

        // Aguardar um pouco e verificar se conexão ainda está viva
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('✅ Conexão ainda está viva após ping/pong');
            done();
          } else {
            done(new Error('Conexão fechada inesperadamente após ping/pong'));
          }
        }, 2000);
      });

      ws.on('close', () => {
        if (!pingReceived) {
          done(new Error('Conexão fechada antes de receber ping do servidor'));
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('📦 Teste de Sanitização de Payload', function () {
    it('deve rejeitar payload muito grande', function (done) {
      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });
      let welcomeReceived = false;

      ws.on('open', () => {
        // Aguardar mensagem de boas-vindas primeiro
        setTimeout(() => {
          // Enviar payload muito grande (mais de 16KB)
          const largePayload = 'x'.repeat(20000); // 20KB
          const largeMessage = {
            type: 'large_test',
            data: { largeField: largePayload },
            timestamp: new Date().toISOString(),
          };

          ws.send(JSON.stringify(largeMessage));
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'welcome') {
            welcomeReceived = true;
            return;
          }

          if (message.type === 'error' && welcomeReceived) {
            console.log('❌ Erro esperado recebido:', message);
            expect(message.data.error).to.equal('Payload too large');
            expect(message.data.code).to.equal('PAYLOAD_TOO_LARGE');
            done();
          }
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('deve rejeitar JSON inválido', function (done) {
      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });
      let welcomeReceived = false;

      ws.on('open', () => {
        // Aguardar mensagem de boas-vindas primeiro
        setTimeout(() => {
          // Enviar JSON inválido
          ws.send('{ invalid json }');
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'welcome') {
            welcomeReceived = true;
            return;
          }

          if (message.type === 'error' && welcomeReceived) {
            console.log('❌ Erro esperado recebido:', message);
            expect(message.data.error).to.equal('Invalid JSON format');
            expect(message.data.code).to.equal('INVALID_JSON');
            done();
          }
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('deve rejeitar mensagem sem tipo', function (done) {
      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });
      let welcomeReceived = false;

      ws.on('open', () => {
        // Aguardar mensagem de boas-vindas primeiro
        setTimeout(() => {
          // Enviar mensagem sem tipo
          const invalidMessage = {
            data: { test: 'sem tipo' },
            timestamp: new Date().toISOString(),
          };

          ws.send(JSON.stringify(invalidMessage));
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'welcome') {
            welcomeReceived = true;
            return;
          }

          if (message.type === 'error' && welcomeReceived) {
            console.log('❌ Erro esperado recebido:', message);
            expect(message.data.error).to.equal('Invalid message format');
            expect(message.data.code).to.equal('INVALID_MESSAGE_FORMAT');
            done();
          }
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('🔄 Teste de Resiliência', function () {
    it('deve manter conexão durante múltiplas mensagens', function (done) {
      this.timeout(10000);

      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });
      let messageCount = 0;
      let responsesReceived = 0;
      const totalMessages = 50;

      ws.on('open', () => {
        // Enviar múltiplas mensagens rapidamente
        const interval = setInterval(() => {
          if (messageCount >= totalMessages) {
            clearInterval(interval);
            return;
          }

          const message = {
            type: 'ping',
            data: { sequence: messageCount },
            timestamp: new Date().toISOString(),
          };

          ws.send(JSON.stringify(message));
          messageCount++;
        }, 100); // Enviar uma mensagem a cada 100ms
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'welcome') {
            return;
          }

          if (message.type === 'pong') {
            responsesReceived++;
            console.log(`📨 Resposta ${responsesReceived}/${totalMessages} recebida`);

            if (responsesReceived >= totalMessages) {
              console.log('✅ Todas as mensagens foram processadas com sucesso');
              done();
            }
          }
        } catch (error) {
          done(error);
        }
      });

      ws.on('error', (error) => {
        done(error);
      });

      ws.on('close', () => {
        if (responsesReceived < totalMessages) {
          done(
            new Error(
              `Conexão fechada prematuramente. Recebidas: ${responsesReceived}/${totalMessages}`,
            ),
          );
        }
      });
    });

    it('deve detectar timeout se não responder a ping', function (done) {
      this.timeout(70000); // 70 segundos para aguardar timeout

      const headers = {
        'x-tenant-id': TEST_TENANT,
        'x-correlation-id': TEST_CORRELATION,
      };

      ws = new WebSocket(WS_URL, { headers });

      ws.on('open', () => {
        console.log('🔌 Conectado, aguardando timeout por não responder ping...');
      });

      // Não responder a pings do servidor (não implementar handler de 'ping')
      // O servidor deve fechar a conexão após ~60 segundos

      ws.on('close', (code, reason) => {
        console.log(`🔌 Conexão fechada como esperado: ${code} - ${reason}`);
        // Verificar se foi fechada pelo timeout do servidor
        expect(code).to.not.equal(1000); // 1000 = fechamento normal pelo cliente
        done();
      });

      ws.on('error', (error) => {
        // Erro pode ser esperado se o servidor forçar o fechamento
        console.log('⚠️ Erro na conexão (pode ser esperado):', error.message);
      });
    });
  });

  describe('🏗️ Teste de Múltiplas Conexões', function () {
    it('deve suportar múltiplas conexões simultâneas', function (done) {
      this.timeout(10000);

      const connections = [];
      const totalConnections = 5;
      let connectionsEstablished = 0;

      for (let i = 0; i < totalConnections; i++) {
        const headers = {
          'x-tenant-id': `${TEST_TENANT}-${i}`,
          'x-correlation-id': `${TEST_CORRELATION}-${i}`,
        };

        const connection = new WebSocket(WS_URL, { headers });
        connections.push(connection);

        connection.on('open', () => {
          connectionsEstablished++;
          console.log(`✅ Conexão ${i + 1}/${totalConnections} estabelecida`);

          if (connectionsEstablished === totalConnections) {
            console.log('🎉 Todas as conexões estabelecidas com sucesso');

            // Fechar todas as conexões
            connections.forEach((conn) => {
              if (conn.readyState === WebSocket.OPEN) {
                conn.close();
              }
            });

            done();
          }
        });

        connection.on('error', (error) => {
          done(error);
        });
      }
    });
  });
});

// 🚀 Instruções para executar:
//
// 1. Instalar dependências:
//    npm install --save-dev mocha chai ws
//
// 2. Adicionar script no package.json:
//    "test:robustez": "mocha ws.resilience.test.js"
//
// 3. Executar testes:
//    npm run test:robustez
//
// 4. Para executar com logs detalhados:
//    DEBUG=* npm run test:robustez
