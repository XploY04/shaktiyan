import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
const total = await p.evaluate(() => document.body.scrollHeight);
const marks = await p.evaluate(() =>
  [...document.querySelectorAll('main > section')].map((s,i) => ({ i, top: s.offsetTop, h: s.offsetHeight }))
);
console.log('total', total, JSON.stringify(marks));
for (const m of marks) {
  await p.evaluate((y) => window.scrollTo({top:y, behavior:'instant'}), Math.max(0, m.top - 60));
  await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/sec-${m.i}.png` });
}
await b.close();
console.log('ok');
