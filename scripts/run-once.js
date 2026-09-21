// Elle tetikleme:
//   npm run gen               -> bugun icin uret
//   npm run gen -- 2026-09-25 -> belirli bir gun icin uret
//   npm run pub               -> onayli gonderiyi yayinla
import { generatePost, publishPost, todayKey } from '../src/pipeline.js';
import { closeBrowser } from '../src/render/renderer.js';

const [, , action = 'generate', date = todayKey()] = process.argv;

const res = action === 'publish'
  ? await publishPost({ date })
  : await generatePost({ date, force: true });

console.log(res);
await closeBrowser();
process.exit(0);
