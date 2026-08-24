// slop-scan.mjs — measures how much a page looks like the statistical average
// of its category. Advisory, not pass/fail: every signal here can be earned by
// a real brief. A signal firing means "you did this by reflex unless you can
// say why", not "this is a bug".
//
// usage: node slop-scan.mjs <url>

import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });

const r = await page.evaluate(() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = (s) => { ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };

  const sections = [...document.querySelectorAll('main > section, main > div > section, body > section')];

  // A section's shape: the tag/heading sequence of its meaningful descendants,
  // shallow enough to catch "every section is built the same way".
  const shapeOf = (sec) => {
    const parts = [];
    const walk = (el, depth) => {
      if (depth > 3) return;
      for (const c of el.children) {
        const t = c.tagName;
        if (/^(H1|H2|H3|P|UL|OL|DL|FIGURE|IMG|BUTTON|A|FORM)$/.test(t)) parts.push(t);
        else walk(c, depth + 1);
      }
    };
    walk(sec, 0);
    return parts.join('>');
  };

  // Compare a coarse signature. Full structure strings are too specific to
  // match, so sections that are obviously the same template score as unique.
  const shapes = sections.map((s) => shapeOf(s).split('>').slice(0, 2).join('>'));
  const shapeCounts = {};
  for (const s of shapes) shapeCounts[s] = (shapeCounts[s] || 0) + 1;
  const repeatedShape = Math.max(0, ...Object.values(shapeCounts));

  // Rhythm: the share of sections on the single most common padding, not the
  // count of distinct values. One outlier section should not clear the check.
  const padCounts = {};
  for (const s of sections) {
    const c = getComputedStyle(s);
    const k = `${c.paddingTop}/${c.paddingBottom}`;
    padCounts[k] = (padCounts[k] || 0) + 1;
  }
  const dominantPad = Math.max(0, ...Object.values(padCounts));
  const pads = new Set(Object.keys(padCounts));

  // Eyebrow / kicker: small text sitting immediately before a heading.
  let eyebrows = 0, sectionNumbers = 0;
  for (const h of document.querySelectorAll('h1, h2, h3')) {
    const prev = h.previousElementSibling || h.parentElement?.previousElementSibling;
    if (!prev) continue;
    const txt = (prev.textContent || '').trim();
    if (!txt || txt.length > 60) continue;
    const s = getComputedStyle(prev);
    if (parseFloat(s.fontSize) <= 13 && (s.textTransform === 'uppercase' || txt === txt.toUpperCase())) eyebrows++;
    if (/^(fig\.?|figure|no\.?|step|part|ch\.?|\d{1,2})[\s.—-]/i.test(txt)) sectionNumbers++;
  }

  // All-caps used for running text rather than for a short label.
  let allCapsRuns = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t) continue;
    const s = getComputedStyle(el);
    if (s.textTransform !== 'uppercase' && t !== t.toUpperCase()) continue;
    if (t.split(/\s+/).length > 3) allCapsRuns++;
  }

  // Uniform card grids: share of page height taken by grids whose children are
  // all the same width.
  let gridArea = 0;
  const pageH = document.body.scrollHeight, pageW = window.innerWidth;
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.display !== 'grid') continue;
    const kids = [...el.children];
    if (kids.length < 3) continue;
    const widths = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().width)));
    if (widths.size > 2) continue;
    const b = el.getBoundingClientRect();
    gridArea += b.height;
  }

  // Type and surface.
  const families = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const f = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (f) families.add(f);
  }
  const bodyBg = rgb(getComputedStyle(document.body).backgroundColor);
  const isCream = bodyBg[0] > 228 && bodyBg[1] > 222 && bodyBg[2] > 205 && bodyBg[0] >= bodyBg[2] + 6 && bodyBg[0] < 253;
  const hasSerifDisplay = [...document.querySelectorAll('h1, h2')].some((h) => /serif|Fraunces|Playfair|Instrument|Newsreader|Lora|Georgia/i.test(getComputedStyle(h).fontFamily));
  const hasMonoLabels = [...document.querySelectorAll('body *')].some((el) => {
    const s = getComputedStyle(el);
    return /mono/i.test(s.fontFamily) && s.textTransform === 'uppercase';
  });

  // Radius scale.
  const radii = new Set();
  let bigRadiusCount = 0;
  for (const el of document.querySelectorAll('body *')) {
    const v = getComputedStyle(el).borderTopLeftRadius;
    if (!v || v === '0px' || v.includes('%')) continue;
    radii.add(v);
    const px = parseFloat(v);
    const b = el.getBoundingClientRect();
    // a pill/circle is a shape choice, not over-rounding
    if (px >= 24 && px < Math.min(b.width, b.height) / 2) bigRadiusCount++;
  }

  // Infinite decorative animations (fake carets, pulsing dots, marquees).
  let infiniteAnims = 0;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.animationIterationCount.split(',').some((v) => v.trim() === 'infinite')) infiniteAnims++;
  }

  // Copy cadence: short declarative section headings ending in a full stop.
  const heads = [...document.querySelectorAll('h2')].map((h) => (h.textContent || '').trim()).filter(Boolean);
  const aphorisms = heads.filter((t) => /[.!]$/.test(t) && t.split(/\s+/).length <= 10).length;

  // Known overused faces.
  const overused = [...families].filter((f) => /^(Inter|Geist|Space Grotesk|Instrument Serif|Poppins|Montserrat)$/i.test(f));

  return {
    sectionCount: sections.length, shapes, repeatedShape,
    padVariants: pads.size, dominantPad, eyebrows, sectionNumbers, allCapsRuns,
    gridShare: pageH ? gridArea / pageH : 0,
    families: [...families], overused,
    bodyBg, isCream, hasSerifDisplay, hasMonoLabels,
    radii: [...radii], bigRadiusCount, infiniteAnims, headings: heads.length, aphorisms,
    pageW,
  };
});

const out = [];
const flag = (cond, label, detail) => out.push({ hit: !!cond, label, detail });

flag(r.sectionCount >= 4 && r.repeatedShape / r.sectionCount >= 0.5, 'Repeated section template',
  `${r.repeatedShape} of ${r.sectionCount} sections open with the same structure. Vary what a section IS, not just what it says.`);
flag(r.sectionCount >= 4 && r.dominantPad / r.sectionCount > 0.6, 'Monotonous vertical rhythm',
  `${r.dominantPad} of ${r.sectionCount} sections share one padding value (${r.padVariants} distinct in total). Emphasis needs some sections tighter and some looser.`);
flag(r.eyebrows >= 2, 'Eyebrow / kicker labels',
  `${r.eyebrows} small uppercase labels sit above headings. Borrowed editorial authority; the heading should carry itself.`);
flag(r.sectionNumbers >= 2, 'Decorative section numbering',
  `${r.sectionNumbers} headings prefixed with Fig./No./01. Imitates editorial structure without adding any.`);
flag(r.allCapsRuns >= 4, 'All-caps running text',
  `${r.allCapsRuns} text runs over 3 words set in caps. Word shape is how people read; caps removes it.`);
flag(r.gridShare > 0.3, 'Uniform card grid dominance',
  `${(r.gridShare * 100).toFixed(0)}% of page height is equal-width grid. Cards are the lazy container.`);
flag(r.overused.length > 0, 'Overused typeface',
  `${r.overused.join(', ')} appear on so many generated sites they no longer read as a choice.`);
flag(r.isCream && r.hasSerifDisplay, 'Cream + serif "tasteful default"',
  `Warm cream ground (rgb(${r.bodyBg})) with a serif display face is the current reflex anti-slop look, and now reads as its own tell.`);
flag(r.isCream && r.hasSerifDisplay && r.hasMonoLabels, 'Cream + serif + mono-caps trifecta',
  `All three together is the 2026 editorial-AI signature. At least one axis has to come from the brief instead.`);
flag(r.bigRadiusCount >= 3, 'Over-rounded surfaces',
  `${r.bigRadiusCount} elements at 24px+ radius. Everything rounds into the same soft blob.`);
flag(r.infiniteAnims > 0, 'Infinite decorative animation',
  `${r.infiniteAnims} element(s) loop forever. Fake carets, pulsing dots, and marquees are motion with nothing to say.`);
flag(r.headings >= 4 && r.aphorisms / r.headings > 0.6, 'Aphorism cadence in headings',
  `${r.aphorisms}/${r.headings} section headings are short declarative sentences ending in a full stop. That rhythm is an LLM copy tic.`);

const hits = out.filter((o) => o.hit);
console.log(`\nSLOP SCAN  ${url}`);
console.log(`sections ${r.sectionCount} · fonts ${r.families.length} · radii ${r.radii.length} · headings ${r.headings}\n`);
for (const o of hits) console.log(`  HIT   ${o.label}\n        ${o.detail}\n`);
for (const o of out.filter((o) => !o.hit)) console.log(`  clear ${o.label}`);
console.log(`\n${hits.length} of ${out.length} signals firing.`);
console.log(hits.length === 0
  ? 'Nothing generic detected. Direction is still yours to judge.'
  : 'Each hit needs a reason from the brief, or a different decision.');

await browser.close();
