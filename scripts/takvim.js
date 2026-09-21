// Onumuzdeki yayinlari listeler: npm run takvim [kac adet]
import { config, DAY_TR } from '../src/config.js';
import { templateFor } from '../src/content/plan.js';

const count = Number(process.argv[2] || 9);
const d = new Date();
let found = 0;

console.log(`Yayın günleri: ${config.publishDays.map((x) => DAY_TR[x]).join(', ')} — saat ${config.publishTime}\n`);

while (found < count) {
  if (config.publishDays.includes(d.getDay())) {
    const date = new Intl.DateTimeFormat('en-CA').format(d);
    console.log(`${date}  ${DAY_TR[d.getDay()].padEnd(10)} ${templateFor(d)}`);
    found++;
  }
  d.setDate(d.getDate() + 1);
}
