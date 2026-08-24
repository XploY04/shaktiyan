import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
for (const [name, w, h] of [['desktop',1440,900],['mobile',390,844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/shot-${name}.png`, fullPage: true });
  await p.close();
}
await b.close();
console.log('ok');
