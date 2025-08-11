import 'dotenv/config';
import express from 'express';
import { StatusCodes } from 'http-status-codes';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.status(StatusCodes.OK).json({ ok: true, service: 'whatsapp-service' }));

// Webhook de mensagens (placeholder)
app.post('/webhook/messages', (req, res) => {
  console.log('[whatsapp webhook] incoming:', req.body);
  // TODO: publicar evento em NATS/Kafka
  res.sendStatus(200);
});

// Envio “simulado”
app.post('/send', (req, res) => {
  const { to, text } = req.body || {};
  console.log(`[send] -> ${to}: ${text}`);
  res.json({ delivered: true, to, text });
});

const PORT = Number(process.env.PORT || 8081);
app.listen(PORT, () => console.log(`[whatsapp-service] listening on :${PORT}`));
