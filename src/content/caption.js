import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { TEMPLATE_BRIEF } from './plan.js';

const client = new Anthropic({ apiKey: config.caption.apiKey });

// Gorsel alanini dolduracak kadar metin, tasiracak kadar degil.
const LIMITS = {
  quote: { headline: 90, body: 0,   footnote: 40 },
  tip:   { headline: 55, body: 230, footnote: 40 },
  stat:  { headline: 14, body: 170, footnote: 40 },
  case:  { headline: 55, body: 240, footnote: 40 },
  cta:   { headline: 55, body: 190, footnote: 40 },
};

/**
 * Tek cagride hem gorsel metinlerini hem Instagram aciklamasini uretir.
 * Donen: { headline, body, footnote, caption, question, hashtags }
 */
export async function generateCopy({ template, topic, extraNote = '' }) {
  const lim = LIMITS[template];

  const system = `Sen ${config.brand.name} adli yapay zeka otomasyon ajansinin Instagram icerik yazarisin.
Turkce yazarsin. Dilin sade, net, abartisiz ve guven veren. Emoji kullanmazsin.
Klise pazarlama dilinden (devrim, cigir acan, hayatinizi degistirecek) kacinirsin.
Uydurma rakam veya musteri ismi vermezsin; ornek verirken "ornegin" diyerek genel konusursun.
Cevabini SADECE gecerli JSON olarak verirsin, baska hicbir sey yazmazsin.`;

  const user = `Sablon turu: ${template}
Sablonun amaci: ${TEMPLATE_BRIEF[template]}
Konu: ${topic.title}
Aci: ${topic.angle}
${extraNote ? `Ek not / duzeltme istegi: ${extraNote}` : ''}

Su JSON semasina gore uret:
{
  "headline": "gorselin ust basligi, en fazla ${lim.headline} karakter${template === 'stat' ? ' (sadece rakam/oran, orn: %40 veya 3 saat)' : ''}",
  "body": ${lim.body
    ? `"gorselin govde metni. ${Math.round(lim.body * 0.75)}-${lim.body} karakter arasi olsun — alani dolduracak kadar dolu, tasiracak kadar uzun degil"`
    : '""'},
  "footnote": "gorselin altindaki kisa not, en fazla ${lim.footnote} karakter",
  "caption": "Instagram aciklamasi. 3-4 kisa paragraf. Ilk satir dikkat cekici olsun. SORU SORMA, soruyu ayri alana yazacaksin. Hashtag YAZMA.",
  "question": "Aciklamanin sonuna gelecek TEK bir soru cumlesi. Okuyanin kendi durumunu dusunmesini saglasin, yoruma davet etsin. Mutlaka soru isaretiyle bitsin. En fazla 90 karakter.",
  "hashtags": "8-12 adet Turkce/Ingilizce karisik, konuyla ilgili hashtag, bosluklarla ayrilmis"
}`;

  const res = await client.messages.create({
    model: config.caption.model,
    max_tokens: 1400,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Aciklama uretimi gecerli JSON dondurmedi:\n' + text.slice(0, 400));
  }

  let question = (parsed.question || '').trim();
  if (question && !question.endsWith('?')) question += '?';

  return {
    headline: (parsed.headline || '').trim(),
    body: (parsed.body || '').trim(),
    footnote: (parsed.footnote || config.brand.handle).trim(),
    caption: (parsed.caption || '').trim(),
    question,
    hashtags: (parsed.hashtags || '').trim(),
  };
}

/** Aciklama + kapanis sorusu + hashtag'ler. Soru her zaman sonda ve garantili. */
export const fullCaption = (p) =>
  [p.caption, p.question, '.\n.', p.hashtags].filter(Boolean).join('\n\n');
