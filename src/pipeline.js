import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, DAY_TR } from './config.js';
import { templateFor, pickTopic, isPublishDay } from './content/plan.js';
import { generateCopy, fullCaption } from './content/caption.js';
import { renderPng } from './render/renderer.js';
import { uploadImage } from './storage.js';
import { publishPhoto, quotaLeft } from './instagram/publish.js';
import { sendApprovalCard, sendMessage } from './telegram/bot.js';
import { upsertPost, updatePost, getPostByDate, recentTopicKeys, markTopicUsed } from './db.js';

const TOPICS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)), 'content', 'topics.json'
);

/** Bugunun tarihi (YYYY-MM-DD), yayin saat diliminde. */
export const todayKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: config.tz }).format(d);

const label = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAY_TR[d.getDay()]} ${dateStr}`;
};

/**
 * Bir gun icin icerik uretir, gorseli olusturur, yukler ve onaya gonderir.
 * @param {object} opts
 * @param {string} [opts.date]      YYYY-MM-DD, varsayilan bugun
 * @param {boolean} [opts.force]    onaylanmis/atlanmis olsa bile yeniden uret
 * @param {string} [opts.extraNote] "metni duzelt" notu
 */
export async function generatePost({ date = todayKey(), force = false, extraNote = '' } = {}) {
  const existing = await getPostByDate(date);

  if (existing && !force && ['approved', 'published', 'skipped'].includes(existing.status)) {
    return existing;
  }

  const topics = JSON.parse(await readFile(TOPICS_PATH, 'utf8'));
  const template = existing?.template || templateFor(new Date(`${date}T12:00:00`));
  const topic = existing && force
    ? topics.find((t) => t.key === existing.topic) ?? pickTopic(topics, template, [])
    : pickTopic(topics, template, await recentTopicKeys());

  const copy = await generateCopy({ template, topic, extraNote });
  const caption = fullCaption(copy);

  const png = await renderPng({ template, ...copy });
  const revision = (existing?.revision ?? -1) + 1;
  const { path: imagePath, url: imageUrl } = await uploadImage(png, `${date}/v${revision}.png`);

  const post = await upsertPost({
    id: existing?.id,
    post_date: date,
    template,
    topic: topic.key,
    headline: copy.headline,
    body: copy.body,
    footnote: copy.footnote,
    caption,
    hashtags: copy.hashtags,
    image_path: imagePath,
    image_url: imageUrl,
    status: 'pending',
    revision,
    error: null,
  });

  const messageId = await sendApprovalCard({ ...post, label: label(date) }, png, caption);
  await updatePost(post.id, { tg_message_id: messageId });

  return { ...post, tg_message_id: messageId };
}

/** Yayin saati geldiginde onaylanmis gonderiyi yayinlar. */
export async function publishPost({ date = todayKey() } = {}) {
  const post = await getPostByDate(date);

  if (!post) return sendMessage(`Uyarı: ${label(date)} için hazırlanmış gönderi yok.`);
  if (post.status === 'published') return post;
  if (post.status === 'skipped')   return sendMessage(`${label(date)} gönderisi atlandı.`);
  if (post.status !== 'approved') {
    return sendMessage(
      `Yayın saati geldi ama <b>${label(date)}</b> gönderisi henüz onaylanmadı. Onaylarsan hemen yayınlanır.`
    );
  }

  const left = await quotaLeft().catch(() => null);
  if (left !== null && left <= 0) {
    await updatePost(post.id, { status: 'failed', error: 'Günlük yayın kotası doldu' });
    return sendMessage('Instagram günlük yayın kotası dolu, gönderi yayınlanamadı.');
  }

  try {
    const mediaId = await publishPhoto({ imageUrl: post.image_url, caption: post.caption });
    await updatePost(post.id, {
      status: 'published', ig_media_id: mediaId, published_at: new Date().toISOString(),
    });
    await markTopicUsed(post.topic);
    await sendMessage(`Yayınlandı: <b>${label(date)}</b> gönderisi Instagram'da.`);
    return { ...post, ig_media_id: mediaId };
  } catch (err) {
    await updatePost(post.id, { status: 'failed', error: String(err.message) });
    await sendMessage(`Yayın hatası (${label(date)}): ${err.message}`);
    throw err;
  }
}

export { isPublishDay };
