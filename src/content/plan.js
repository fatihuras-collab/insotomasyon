import { config } from '../config.js';

/**
 * 5 sablonluk donen bir dizi. Haftada 3 gonderi oldugu icin sira her hafta
 * kayar; ayni sablon ayni gune 5 haftada bir denk gelir.
 *
 *  1. hafta: tip   quote stat
 *  2. hafta: case  cta   tip
 *  3. hafta: quote stat  case
 *  4. hafta: cta   tip   quote
 *  5. hafta: stat  case  cta   → sonra basa doner
 */
export const TEMPLATE_CYCLE = ['tip', 'quote', 'stat', 'case', 'cta'];

export const TEMPLATE_BRIEF = {
  quote: 'Kisa, carpici bir soz/gorus. Otomasyon ve yapay zeka uzerine dusundurucu tek cumle.',
  tip:   'Uygulanabilir tek bir ipucu. Okuyan bugun deneyebilsin.',
  stat:  'Somut bir veri/rakam ve ne anlama geldigi. Rakam abartisiz ve gercekci olsun.',
  case:  'Kisa bir vaka: hangi is, once ne kadar suruyordu, otomasyondan sonra ne oldu.',
  cta:   'Hizmet tanitimi ve net bir cagri. Satis dili agir olmasin.',
};

/** 1970-01-01'den bu yana gecen tam hafta sayisi (Pazartesi baslangicli). */
function weekIndex(date) {
  const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  return Math.floor((days + 3) / 7); // 1970-01-01 Persembe idi
}

/** Yayin gunlerinden bu gun kacinci sirada (0,1,2)? Yayin gunu degilse -1. */
export function slotIndex(date, days = config.publishDays) {
  return days.indexOf(date.getDay());
}

export const isPublishDay = (date) => slotIndex(date) !== -1;

/** O gune dusen sablonu dondurur. */
export function templateFor(date, days = config.publishDays) {
  const idx = slotIndex(date, days);
  if (idx === -1) return TEMPLATE_CYCLE[0];
  const pos = (weekIndex(date) * days.length + idx) % TEMPLATE_CYCLE.length;
  return TEMPLATE_CYCLE[pos];
}

/** Son N gunde kullanilmis konulari eleyip yeni konu secer. */
export function pickTopic(topics, template, recentKeys) {
  const pool = topics.filter(
    (t) => t.templates.includes(template) && !recentKeys.includes(t.key)
  );
  const usable = pool.length ? pool : topics.filter((t) => t.templates.includes(template));
  return usable[Math.floor(Math.random() * usable.length)];
}
