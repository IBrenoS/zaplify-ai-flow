import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { StatusCodes } from 'http-status-codes';
import fetch from 'node-fetch'; // Se não tiver, instale: npm i node-fetch@3
import { WebSocketServer } from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) =>
  res.status(StatusCodes.OK).json({ ok: true, service: 'api-gateway' })
);

// Proxy/roteamento “fake” inicial (placeholder)
app.get('/v1', (_req, res) =>
  res.json({ message: 'API Gateway v1 online' })
);

// 🔹 Rotas de ping para testar conexão com outros serviços
app.get('/ping/ia', async (_req, res) => {
  try {
    const r = await fetch(process.env.AI_SERVICE_URL + '/health');
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/ping/wa', async (_req, res) => {
  try {
    const r = await fetch(process.env.WHATSAPP_SERVICE_URL + '/health');
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/ping/funnel', async (_req, res) => {
  try {
    const r = await fetch(process.env.FUNNEL_ENGINE_URL + '/health');
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/ping/analytics', async (_req, res) => {
  try {
    const r = await fetch(process.env.ANALYTICS_SERVICE_URL + '/health');
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

const server = http.createServer(app);

// WS básico
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'welcome', from: 'api-gateway' }));
});

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => console.log(`[api-gateway] listening on :${PORT}`));
