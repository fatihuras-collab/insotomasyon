import cron from 'node-cron';
import { config, cronAt, DAY_TR } from './config.js';
import { generatePost, publishPost } from './pipeline.js';
import { sendMessage } from './telegram/bot.js';

const guard = (name, fn) => async () => {
  try { await fn(); }
  catch (err) {
    console.error(`[${name}]`, err);
    await sendMessage(`Hata (${name}): ${err.message}`).catch(() => {});
  }
};

export function startScheduler() {
  const opts = { timezone: config.tz };

  const jobs = [
    // Yayindan LEAD_MINUTES once uret ve onaya gonder
    ['üretim', cronAt(config.publishTime, config.leadMinutes), () => generatePost({})],
    // Yayin saatinde yayinla
    ['yayın',  cronAt(config.publishTime, 0),                  () => publishPost({})],
  ];

  for (const [name, expr, fn] of jobs) {
    cron.schedule(expr, guard(name, fn), opts);
    console.log(`zamanlandı  ${name.padEnd(8)} ${expr}  (${config.tz})`);
  }

  const days = config.publishDays.map((d) => DAY_TR[d]).join(', ');
  console.log(`yayın günleri  ${days} — saat ${config.publishTime} (haftada ${config.publishDays.length} gönderi)`);
}
