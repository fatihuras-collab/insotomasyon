import express from 'express';
import { config } from './config.js';
import { handleUpdate } from './telegram/handlers.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, tz: config.tz }));

app.post('/telegram/webhook', async (req, res) => {
  if (req.get('x-telegram-bot-api-secret-token') !== config.telegram.secret) {
    return res.sendStatus(401);
  }
  res.sendStatus(200); // Telegram'i bekletme
  try { await handleUpdate(req.body); }
  catch (err) { console.error('webhook hatasi', err); }
});

app.listen(config.port, () => {
  console.log(`sunucu    http://localhost:${config.port}`);
  startScheduler();
});
