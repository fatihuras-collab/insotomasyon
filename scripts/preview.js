// Şablonları API'siz, örnek metinle önizler: npm run preview [şablon]
import fs from 'node:fs/promises';
import { renderPng, closeBrowser } from '../src/render/renderer.js';

const SAMPLES = {
  quote: { headline: 'Otomasyon insanın yerine geçmez; tekrar eden işi alır, kararı insana bırakır.', body: '', footnote: 'AI otomasyon' },
  tip:   { headline: 'Otomasyona nereden başlanır?', body: 'En sık tekrar eden ve en çok zaman yiyen işten. Haftada 5 saat alıyorsa, otomasyonu 1 günde geri öder.', footnote: 'İpucu 01' },
  stat:  { headline: '%40', body: 'Elle veri girişi yapılan süreçlerde ortalama hata oranı bu seviyeye kadar çıkabiliyor.', footnote: 'Veri girişi' },
  case:  { headline: 'Fatura girişi 3 saatten 10 dakikaya', body: 'Gelen faturalar otomatik okunup tabloya yazılıyor; kişi sadece kontrol ediyor.', footnote: 'Vaka' },
  cta:   { headline: 'Hangi işin otomatikleşebileceğini birlikte görelim', body: '20 dakikalık ön görüşmede süreçlerini çıkarıyoruz, uygun olan 1-2 akışı işaretliyoruz.', footnote: 'Ücretsiz' },
};

const list = process.argv[2] ? [process.argv[2]] : Object.keys(SAMPLES);
await fs.mkdir('out', { recursive: true });

for (const template of list) {
  const png = await renderPng({ template, ...SAMPLES[template] });
  await fs.writeFile(`out/${template}.png`, png);
  console.log(`out/${template}.png`);
}
await closeBrowser();
