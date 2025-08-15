import { Router } from 'express';

const router = Router();

router.post('/webhook', (req, res) => {
  res.json({ ok: true, message: 'Webhook endpoint' });
});

export default router;
