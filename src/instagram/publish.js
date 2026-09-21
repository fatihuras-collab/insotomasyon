import { config } from '../config.js';

const base = () => `https://graph.facebook.com/${config.ig.version}`;

async function graph(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: config.ig.token }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Instagram API: ${json.error?.message || res.statusText}`);
  }
  return json;
}

/**
 * Tek gorselli gonderi yayinlar.
 * imageUrl herkese acik ve dogrudan indirilebilir olmali (Meta sunucusu ceker).
 */
export async function publishPhoto({ imageUrl, caption }) {
  // 1) Medya konteyneri olustur
  const { id: creationId } = await graph(`${base()}/${config.ig.userId}/media`, {
    image_url: imageUrl,
    caption,
  });

  // 2) Hazir olmasini bekle
  await waitReady(creationId);

  // 3) Yayinla
  const { id: mediaId } = await graph(`${base()}/${config.ig.userId}/media_publish`, {
    creation_id: creationId,
  });

  return mediaId;
}

async function waitReady(creationId, tries = 12, delayMs = 3000) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(
      `${base()}/${creationId}?fields=status_code,status&access_token=${config.ig.token}`
    );
    const json = await res.json();
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR') throw new Error(`Konteyner hatasi: ${json.status}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error('Medya konteyneri zaman asimina ugradi');
}

/** Gunluk yayin kotasini kontrol eder (24 saatte 50 gonderi). */
export async function quotaLeft() {
  const res = await fetch(
    `${base()}/${config.ig.userId}/content_publishing_limit?fields=quota_usage,config&access_token=${config.ig.token}`
  );
  const json = await res.json();
  const row = json.data?.[0];
  if (!row) return null;
  return (row.config?.quota_total ?? 50) - (row.quota_usage ?? 0);
}
