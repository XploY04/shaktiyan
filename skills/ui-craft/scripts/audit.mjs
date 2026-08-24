import { chromium } from 'playwright';

// usage: node audit.mjs <base-url> [route ...]     e.g. node audit.mjs http://localhost:3000 / /pricing
const base = process.argv[2] || 'http://localhost:3000';
const routes = process.argv.length > 3 ? process.argv.slice(3) : ['/'];
const browser = await chromium.launch({ channel: 'chrome' });
let fail = 0;
const say = (ok, msg) => { if (!ok) fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); };

// ── 0. First screen across a viewport matrix
// Two sample sizes is not a test. Display type sized on width breakpoints
// overflows short laptops, and a primary action can sit below the fold on every
// desktop size while both sample sizes happen to pass.
const MATRIX = [
  [390, 844, 'phone'], [414, 896, 'phone lg'], [768, 1024, 'tablet'],
  [1024, 640, 'laptop short'], [1280, 720, '720p'], [1366, 768, 'common laptop'],
  [1440, 900, 'mbp 14'], [1512, 850, 'mbp short'], [1728, 1000, 'mbp 16'],
  [1920, 1080, '1080p'], [2560, 1440, '1440p'],
];
{
  const bad = [];
  for (const [w, h, name] of MATRIX) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.goto(base + routes[0], { waitUntil: 'networkidle' });
    const m = await p.evaluate(() => {
      const h1 = document.querySelector('h1');
      const cta = document.querySelector('a.btn, button.btn, [data-primary-cta]');
      return {
        h1Bottom: h1 ? Math.round(h1.getBoundingClientRect().bottom) : 0,
        ctaTop: cta ? Math.round(cta.getBoundingClientRect().top) : null,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });
    if (m.h1Bottom > h) bad.push(`${w}x${h} ${name}: h1 overflows first screen by ${m.h1Bottom - h}px`);
    if (m.ctaTop !== null && m.ctaTop > h * 1.15) bad.push(`${w}x${h} ${name}: primary action at y=${m.ctaTop}, below the first screen`);
    if (m.scrollW > m.clientW + 1) bad.push(`${w}x${h} ${name}: horizontal overflow, ${m.scrollW}>${m.clientW}`);
    await p.close();
  }
  say(bad.length === 0, `first screen across ${MATRIX.length} viewport sizes: ${bad.length} problem(s)`);
  bad.forEach((b) => console.log('      ' + b));
}

// ── 1. Legibility while scrolling: no blank viewports, no long ghost states
for (const w of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  const vh = w === 390 ? 844 : 900;
  const total = await page.evaluate(() => document.body.scrollHeight);
  let blank = 0, worstGhost = 0, stops = 0;
  for (let y = 0; y < total - vh; y += 150) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(70);
    stops++;
    const r = await page.evaluate(() => {
      const vh = window.innerHeight;
      let ink = 0, area = 0, ghost = 0;
      for (const el of document.querySelectorAll('main *')) {
        if (el.children.length) continue;
        const b = el.getBoundingClientRect();
        if (b.bottom < 0 || b.top > vh || !b.width || !b.height) continue;
        let op = 1, n = el;
        while (n && n !== document.body) { op *= Number(getComputedStyle(n).opacity); n = n.parentElement; }
        const a = b.width * (Math.min(vh, b.bottom) - Math.max(0, b.top));
        area += a; ink += a * op;
        if (op < 0.95) ghost += a;
      }
      return { ink: ink / (window.innerWidth * vh), ghost: area ? ghost / area : 0 };
    });
    if (r.ink < 0.03) blank++;
    if (r.ghost > worstGhost) worstGhost = r.ghost;
  }
  say(blank === 0, `${w}px: ${blank}/${stops} effectively blank viewports`);
  say(worstGhost < 0.35, `${w}px: worst ghosted content ${(worstGhost * 100).toFixed(0)}% (limit 35%)`);
  console.log(`      page height ${(total / vh).toFixed(1)} viewports`);
  await page.close();
}

// ── 2. Contrast: every text node against its painted background
function lum(rgb) {
  const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + route, { waitUntil: 'networkidle' });
  const samples = await page.evaluate(() => {
    // Canvas normalizes any CSS colour (oklab, color-mix, rgba) to real RGBA.
    // Parsing the computed string by hand silently misreads modern formats.
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const cache = new Map();
    const parse = (s) => {
      if (cache.has(s)) return cache.get(s);
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      const v = [d[0], d[1], d[2], d[3] / 255];
      cache.set(s, v);
      return v;
    };
    const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
    const bgOf = (el) => {
      const stack = [];
      let n = el;
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c[3] > 0) {
          stack.push(c);
          if (c[3] >= 0.999) break;
        }
        n = n.parentElement;
      }
      let out = [255, 255, 255];
      for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
      return out;
    };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!text) continue;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || Number(s.opacity) < 0.9) continue;
      out.push({
        text: text.slice(0, 40),
        fg: (() => { const c = parse(s.color); return over(c, bgOf(el)); })(),
        bg: bgOf(el),
        size: parseFloat(s.fontSize),
        weight: Number(s.fontWeight) || 400,
      });
    }
    return out;
  });
  const bad = [];
  for (const s of samples) {
    const L1 = lum(s.fg), L2 = lum(s.bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const large = s.size >= 24 || (s.size >= 18.66 && s.weight >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) bad.push(`${ratio.toFixed(2)} (need ${need}) @${s.size}px "${s.text}"`);
  }
  say(bad.length === 0, `${route}: ${samples.length} text nodes checked, ${bad.length} below WCAG AA`);
  bad.slice(0, 6).forEach((b) => console.log('      ' + b));
  await page.close();
}

// ── 3. Reduced motion leaves nothing invisible
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await rm.goto(base, { waitUntil: 'networkidle' });
const stuck = await rm.evaluate(() =>
  [...document.querySelectorAll('.set, .load, .resolve-seq > *, .pin-seq > *')]
    .filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length);
say(stuck === 0, `reduced motion: ${stuck} elements stuck invisible`);
await rm.close();

// ── 4. Keyboard path: every control focusable with a visible ring
for (const route of routes) {
  const kb = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await kb.goto(base + route, { waitUntil: 'networkidle' });
  const n = await kb.evaluate(() => document.querySelectorAll('a[href], button, input, select, textarea').length);
  let noRing = 0;
  for (let i = 0; i < n; i++) {
    await kb.keyboard.press('Tab');
    const bad = await kb.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.tagName === 'NEXTJS-PORTAL') return null;
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 ? null : el.tagName;
    });
    if (bad) noRing++;
  }
  say(noRing === 0, `${route}: ${n} controls, ${noRing} without a focus ring`);
  await kb.close();
}

// ── 5. Document structure
const doc = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const route of routes) {
  await doc.goto(base + route, { waitUntil: 'networkidle' });
  const r = await doc.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    imgNoAlt: [...document.querySelectorAll('img')].filter((i) => i.alt === null || i.alt === undefined).length,
    landmarks: document.querySelectorAll('main').length,
  }));
  say(r.h1 === 1, `${route}: ${r.h1} h1`);
  say(r.imgNoAlt === 0, `${route}: ${r.imgNoAlt} images missing alt`);
  say(r.landmarks === 1, `${route}: ${r.landmarks} main landmark`);
}
await browser.close();

console.log(fail === 0 ? '\nALL CHECKS PASSED' : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
