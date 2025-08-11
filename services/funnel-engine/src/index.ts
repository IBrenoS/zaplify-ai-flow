import 'dotenv/config';
import express from 'express';
import { StatusCodes } from 'http-status-codes';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.status(StatusCodes.OK).json({ ok: true, service: 'funnel-engine' }));

// Executa um passo de funil “fake”
app.post('/run', (req, res) => {
  const { input } = req.body || {};
  const nextAction = input?.includes('pix') ? 'REQUEST_PAYMENT' : 'REPLY_MESSAGE';
  res.json({ step: 'decide', nextAction });
});

const PORT = Number(process.env.PORT || 8082);
app.listen(PORT, () => console.log(`[funnel-engine] listening on :${PORT}`));
