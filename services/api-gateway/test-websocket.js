import WebSocket from 'ws';

// Teste 1: Ping/Pong
console.log('\n=== TESTE 1: PING/PONG ===');
const ws1 = new WebSocket('ws://localhost:8080/ws?x-tenant-id=ping-test&x-correlation-id=ping-123');

ws1.on('open', () => {
  console.log('✅ Conexão 1 estabelecida');

  // Enviar ping
  const pingMessage = {
    type: 'ping',
    data: {
      client_time: new Date().toISOString(),
      message: 'hello ping',
    },
  };

  console.log('📤 Enviando ping:', JSON.stringify(pingMessage));
  ws1.send(JSON.stringify(pingMessage));
});

ws1.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📥 Recebido:', JSON.stringify(message, null, 2));

  if (message.type === 'pong') {
    console.log('✅ TESTE PING/PONG: SUCESSO!');

    // Iniciar Teste 2 após sucesso do ping/pong
    setTimeout(() => {
      console.log('\n=== TESTE 2: BROADCAST ENTRE TENANTS ===');
      startBroadcastTest();
    }, 1000);
  }
});

ws1.on('error', (error) => {
  console.error('❌ Erro conexão 1:', error);
});

// Teste 2: Broadcast
function startBroadcastTest() {
  // Conexão 2 - mesmo tenant
  const ws2 = new WebSocket(
    'ws://localhost:8080/ws?x-tenant-id=broadcast-tenant&x-correlation-id=conn-2',
  );

  // Conexão 3 - mesmo tenant
  const ws3 = new WebSocket(
    'ws://localhost:8080/ws?x-tenant-id=broadcast-tenant&x-correlation-id=conn-3',
  );

  // Conexão 4 - tenant diferente
  const ws4 = new WebSocket(
    'ws://localhost:8080/ws?x-tenant-id=other-tenant&x-correlation-id=conn-4',
  );

  let connectionsReady = 0;

  const checkReady = () => {
    connectionsReady++;
    if (connectionsReady === 3) {
      // Todas as conexões prontas, enviar broadcast
      console.log('📡 Testando broadcast para broadcast-tenant...');

      const broadcastMessage = {
        type: 'broadcast',
        data: {
          message: 'Hello broadcast-tenant!',
          timestamp: new Date().toISOString(),
        },
      };

      // Simular broadcast (normalmente seria feito via API ou admin)
      ws2.send(JSON.stringify(broadcastMessage));
    }
  };

  ws2.on('open', () => {
    console.log('✅ Conexão 2 (broadcast-tenant) estabelecida');
    checkReady();
  });

  ws3.on('open', () => {
    console.log('✅ Conexão 3 (broadcast-tenant) estabelecida');
    checkReady();
  });

  ws4.on('open', () => {
    console.log('✅ Conexão 4 (other-tenant) estabelecida');
    checkReady();
  });

  ws2.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📥 WS2 (broadcast-tenant) recebeu:', message.type);
  });

  ws3.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📥 WS3 (broadcast-tenant) recebeu:', message.type);
  });

  ws4.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📥 WS4 (other-tenant) recebeu:', message.type);
  });

  // Fechar conexões após 5 segundos
  setTimeout(() => {
    console.log('\n=== ENCERRANDO TESTES ===');
    ws1.close();
    ws2.close();
    ws3.close();
    ws4.close();
    process.exit(0);
  }, 5000);
}
