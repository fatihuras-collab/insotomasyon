import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates');

export const BADGES = {
  quote: 'Not',
  tip:   'İpucu',
  stat:  'Rakam',
  case:  'Vaka',
  cta:   'Çalışalım',
};

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Sablonu doldurup tek parca HTML dondurur (tarayici gerektirmez). */
export async function buildHtml({ template, headline, body, footnote }) {
  const [layout, baseCss, tplHtml, tplCss] = await Promise.all([
    fs.readFile(path.join(DIR, '_layout.html'), 'utf8'),
    fs.readFile(path.join(DIR, 'base.css'), 'utf8'),
    fs.readFile(path.join(DIR, `${template}.html`), 'utf8'),
    fs.readFile(path.join(DIR, `${template}.css`), 'utf8').catch(() => ''),
  ]);

  const content = fill(tplHtml, {
    HEADLINE: esc(headline),
    BODY: esc(body),
    BRAND_HANDLE: esc(config.brand.handle),
  });

  return fill(layout, {
    CSS: fill(baseCss, { BRAND_COLOR: config.brand.color, BRAND_ACCENT: config.brand.accent }),
    EXTRA_CSS: tplCss,
    BADGE: BADGES[template] || '',
    CONTENT: content,
    BRAND_HANDLE: esc(config.brand.handle),
    FOOTNOTE: esc(footnote || ''),
  });
}
