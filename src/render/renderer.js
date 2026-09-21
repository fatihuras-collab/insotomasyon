import puppeteer from 'puppeteer';
import { buildHtml } from './html.js';

export { buildHtml };

let browserPromise;
const getBrowser = () => (browserPromise ??= puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  // Hazir bir Chrome varsa: executablePath: process.env.CHROME_PATH
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
}));

/** 1080x1350 PNG buffer uretir. */
export async function renderPng(post) {
  const html = await buildHtml(post);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browserPromise) { await (await browserPromise).close(); browserPromise = undefined; }
}
