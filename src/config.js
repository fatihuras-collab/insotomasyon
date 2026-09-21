const list = (s, def) => (s || def).split(',').map((x) => Number(x.trim()));

export const config = {
  port: Number(process.env.PORT || 8080),
  tz: process.env.TZ || 'Europe/Istanbul',
  publicUrl: process.env.PUBLIC_URL || '',

  // Haftada 3 gonderi: 0=Pazar ... 6=Cumartesi
  publishDays: list(process.env.PUBLISH_DAYS, '1,3,5'),
  publishTime: process.env.PUBLISH_TIME || '19:00',
  leadMinutes: Number(process.env.LEAD_MINUTES || 90),

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    secret: process.env.TELEGRAM_WEBHOOK_SECRET || 'change-me',
  },

  ig: {
    version: process.env.GRAPH_VERSION || 'v23.0',
    userId: process.env.IG_USER_ID || '',
    token: process.env.IG_ACCESS_TOKEN || '',
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_KEY || '',
    bucket: process.env.SUPABASE_BUCKET || 'instagram',
  },

  caption: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CAPTION_MODEL || 'claude-sonnet-4-5',
  },

  brand: {
    name: process.env.BRAND_NAME || 'Uraflow',
    handle: process.env.BRAND_HANDLE || '@uraflow',
    color: process.env.BRAND_COLOR || '#0B1221',
    accent: process.env.BRAND_ACCENT || '#3DDC97',
  },
};

export const DAY_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const parseTime = (s) => {
  const [h, m] = s.split(':').map(Number);
  return { h, m };
};

/** Yayin saatinden N dakika geri giderek cron ifadesi uretir. */
export function cronAt(time, minusMinutes = 0, days = config.publishDays) {
  const { h, m } = parseTime(time);
  let total = h * 60 + m - minusMinutes;

  // Geri gitmek gunu kaydirirsa, gunleri de bir gun geri al
  let shift = 0;
  while (total < 0) { total += 24 * 60; shift += 1; }

  const shifted = days.map((d) => (((d - shift) % 7) + 7) % 7);
  return `${total % 60} ${Math.floor(total / 60)} * * ${shifted.join(',')}`;
}
