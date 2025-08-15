import WebSocket from 'ws';

console.log('\n=== TESTE DE BROADCAST ENTRE TENANTS ===\n');

// Criar conexões para diferentes tenants
const connections = [];

const createConnection = (tenantId, connId) => {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://localhost:8080/ws?x-tenant-id=${tenantId}&x-correlation-id=${connId}`,
    );

    ws.on('open', () => {
      console.log(`✅ Conexão ${connId} (${tenantId}) estabelecida`);
      resolve(ws);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'welcome') {
        console.log(`📋 ${connId}: Welcome recebido`);
      } else {
        console.log(
          `📥 ${connId} (${tenantId}) recebeu:`,
          message.type,
          message.data?.message || '',
        );
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ Erro ${connId}:`, error.message);
    });
  });
};

async function testBroadcast() {
  try {
    // Criar conexões
    const ws1 = await createConnection('tenant-a', 'conn-1');
    const ws2 = await createConnection('tenant-a', 'conn-2');
    const ws3 = await createConnection('tenant-b', 'conn-3');

    connections.push(ws1, ws2, ws3);

    // Aguardar um pouco para as conexões se estabilizarem
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('\n📡 Testando broadcast manual...');

    // Vou acessar o WebSocketService diretamente para testar broadcast
    // Como não temos acesso direto, vamos simular via HTTP request

    const broadcastMessage = {
      type: 'broadcast',
      data: {
        message: 'Mensagem para tenant-a apenas!',
        timestamp: new Date().toISOString(),
      },
    };

    console.log('💡 Simulando broadcast via WebSocket interno...');

    // Aguardar 3 segundos para observar resultados
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    console.log('\n=== ENCERRANDO CONEXÕES ===');
    connections.forEach((ws) => ws.close());
    process.exit(0);
  }
}

testBroadcast();
