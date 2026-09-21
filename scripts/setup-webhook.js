// Telegram webhook'unu kurar: npm run webhook
import { config } from '../src/config.js';

const url = `${config.publicUrl.replace(/\/$/, '')}/telegram/webhook`;
const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url,
    secret_token: config.telegram.secret,
    allowed_updates: ['message', 'callback_query'],
  }),
});
console.log(url, await res.json());
