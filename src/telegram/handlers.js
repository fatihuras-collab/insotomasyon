import { answerCallback, editReplyMarkup, sendMessage } from './bot.js';
import { getPost, updatePost } from '../db.js';
import { generatePost, publishPost, todayKey } from '../pipeline.js';
import { config, DAY_TR } from '../config.js';
import { templateFor } from '../content/plan.js';

// "Metni duzelt" icin bekleyen istekler: promptMessageId -> postId
const awaitingEdit = new Map();

export async function handleUpdate(update) {
  if (update.callback_query) return handleCallback(update.callback_query);
  if (update.message)        return handleMessage(update.message);
}

async function handleCallback(cq) {
  const [action, idRaw] = (cq.data || '').split(':');
  const postId = Number(idRaw);
  const post = await getPost(postId).catch(() => null);

  if (!post) return answerCallback(cq.id, 'Gönderi bulunamadı.');
  if (['published', 'skipped'].includes(post.status)) {
    return answerCallback(cq.id, 'Bu gönderi için işlem tamamlanmış.');
  }

  switch (action) {
    case 'ok': {
      await updatePost(postId, { status: 'approved' });
      await editReplyMarkup(cq.message.message_id);
      await answerCallback(cq.id, 'Onaylandı');
      await sendMessage(`Onaylandı. Saat <b>${config.publishTime}</b>'da yayınlanacak.`);
      break;
    }
    case 'sk': {
      await updatePost(postId, { status: 'skipped' });
      await editReplyMarkup(cq.message.message_id);
      await answerCallback(cq.id, 'Atlandı');
      break;
    }
    case 're': {
      await answerCallback(cq.id, 'Yeniden üretiliyor...');
      await editReplyMarkup(cq.message.message_id);
      await generatePost({ date: post.post_date, force: true });
      break;
    }
    case 'ed': {
      await answerCallback(cq.id, 'Düzeltme notunu yaz');
      const prompt = await sendMessage(
        'Neyi değiştirelim? Kısaca yaz (örn: "daha kısa olsun", "rakam yerine örnek ver").',
        { reply_markup: { force_reply: true } }
      );
      awaitingEdit.set(prompt.message_id, postId);
      break;
    }
    default:
      await answerCallback(cq.id, 'Bilinmeyen işlem');
  }
}

async function handleMessage(msg) {
  if (String(msg.chat.id) !== String(config.telegram.chatId)) return;

  // Duzeltme notuna cevap mi?
  const replyTo = msg.reply_to_message?.message_id;
  if (replyTo && awaitingEdit.has(replyTo)) {
    const postId = awaitingEdit.get(replyTo);
    awaitingEdit.delete(replyTo);
    const post = await getPost(postId);
    await sendMessage('Notun alındı, yeniden üretiliyor...');
    await generatePost({ date: post.post_date, force: true, extraNote: msg.text || '' });
    return;
  }

  const text = (msg.text || '').trim().toLowerCase();

  if (text === '/uret')    return void generatePost({ force: true });
  if (text === '/yayinla') return void publishPost({});
  if (text === '/takvim')  return void sendMessage(calendarText());
  if (text === '/start' || text === '/yardim') {
    return void sendMessage(
      [
        '<b>Komutlar</b>',
        '/uret - bugünün gönderisini şimdi üret ve onaya gönder',
        '/yayinla - onaylı gönderiyi hemen yayınla',
        '/takvim - önümüzdeki 4 yayının gün ve şablonu',
      ].join('\n')
    );
  }
}

/** Onumuzdeki 4 yayin gununu ve sablonunu listeler. */
function calendarText() {
  const out = [`<b>Yayın planı</b> (saat ${config.publishTime})`];
  const d = new Date(`${todayKey()}T12:00:00`);
  let found = 0;
  for (let i = 0; i < 30 && found < 4; i++) {
    if (config.publishDays.includes(d.getDay())) {
      const date = new Intl.DateTimeFormat('en-CA').format(d);
      out.push(`${DAY_TR[d.getDay()].padEnd(10)} ${date} — <code>${templateFor(d)}</code>`);
      found++;
    }
    d.setDate(d.getDate() + 1);
  }
  return out.join('\n');
}
