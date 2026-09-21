import { config } from '../config.js';

const API = () => `https://api.telegram.org/bot${config.telegram.token}`;

async function call(method, payload) {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

export const sendMessage = (text, extra = {}) =>
  call('sendMessage', { chat_id: config.telegram.chatId, text, parse_mode: 'HTML', ...extra });

export const answerCallback = (id, text) =>
  call('answerCallbackQuery', { callback_query_id: id, text });

export const editReplyMarkup = (messageId, markup = { inline_keyboard: [] }) =>
  call('editMessageReplyMarkup', {
    chat_id: config.telegram.chatId, message_id: messageId, reply_markup: markup,
  });

/** Onay kartini gonderir: gorsel + aciklama + butonlar */
export async function sendApprovalCard(post, imageBuffer, captionText) {
  const form = new FormData();
  form.append('chat_id', config.telegram.chatId);
  form.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'post.png');

  const head =
    `<b>${post.label || post.post_date} gönderisi</b>\n` +
    `Şablon: <code>${post.template}</code> | Konu: ${post.topic}` +
    (post.revision ? ` | v${post.revision + 1}` : '');

  const preview = captionText.length > 900 ? captionText.slice(0, 900) + '...' : captionText;
  form.append('caption', `${head}\n\n${preview}`);
  form.append('parse_mode', 'HTML');
  form.append('reply_markup', JSON.stringify(keyboard(post.id)));

  const res = await fetch(`${API()}/sendPhoto`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendPhoto: ${json.description}`);
  return json.result.message_id;
}

export const keyboard = (postId) => ({
  inline_keyboard: [
    [
      { text: 'Onayla',       callback_data: `ok:${postId}` },
      { text: 'Yeniden üret', callback_data: `re:${postId}` },
    ],
    [
      { text: 'Metni düzelt', callback_data: `ed:${postId}` },
      { text: 'Atla',         callback_data: `sk:${postId}` },
    ],
  ],
});
