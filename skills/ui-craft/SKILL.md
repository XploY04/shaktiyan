---
name: ui-craft
description: Router and quality gate for frontend work. Use when building, redesigning, or polishing any UI — landing pages, dashboards, product screens, components, design systems — or when a result "looks AI-generated", "feels generic", "feels janky", or "moves too much". Sequences the installed design skills, then verifies the result with two runnable scans instead of eyeballing screenshots.
---

# UI Craft

This skill carries almost no design knowledge. The sub-skills have that. What it
does is decide what runs in what order, name the failure modes those skills do
not cover, and refuse to let work be declared done without measurement.

## Why generated UI reads as generated

A model produces the statistical centre of its training distribution. Asked for
"a modern SaaS site" it returns the mean of every SaaS site, and the mean is by
definition the least distinctive point available.

**The trap is that "don't be generic" has its own mean.** Told to avoid slop, a
model moves to the centre of the anti-slop distribution: warm cream ground,
serif display face, small uppercase mono labels, figure numbers, hairline rules,
a short declarative sentence as every section heading. That combination is now
one of the most reliable AI signatures in circulation, and it is *more*
identifying than purple gradients because fewer humans reach for it by accident.

So the tell is never the style. **The tell is regularity: every section the same
shape, every gap the same size, every heading the same cadence, every card the
same width.** A human composing a page makes some parts loud and some parts
quiet, and breaks their own system where it matters. A model applies the system
evenly, because even application is what the average looks like.

The escape is not a different aesthetic. It is constraints that come from
**outside the design space**: the real product, a real audience, a real
reference, a real limitation. Anything chosen from within "what looks good"
lands back in an average.

## Step 0 — Find the existing source of visual truth

Before any research or code, find whether this project already has a committed
visual world. Look, in order, for:

1. `DESIGN.md`, `PRODUCT.md`, or a tokens/theme file in this repo.
2. **A sibling app's theme file.** Web projects often mirror a native client:
   `*/lib/theme/*.dart`, `*/theme.ts`, `tailwind.config.*`, `styles/tokens.*`.
   Search the whole workspace, not just where you were pointed.
3. The existing stylesheet's custom properties.
4. Screenshots or a live URL.

Say which you found and whether the task preserves or replaces it. **Preserve
and replace are different jobs and the user picks.** A look chosen deliberately
is not slop because you would have done it differently. If the ask is ambiguous,
run the scans first so the question arrives with evidence.

## Pipeline

| # | Step | Skill | Skip when |
|---|------|-------|-----------|
| 1 | Research references | `refero-design` (MCP-free, see below) | Step 0 found a world you are preserving |
| 2 | Direction and build | `impeccable` | Never, for anything visible |
| 3 | Components | `shadcn` | Not React/Tailwind, or project has its own layer |
| 4 | Motion | `design-motion-principles` (Create) | Nothing animates |
| 5 | Loading states | `boneyard` | No async data on screen |
| 6 | Verify | both scripts below, then `impeccable audit` | Never |

`frontend-design` replaces step 2 for one-off artifacts with no codebase to fit.

## Setup

One time, and everything below is free.

```
git clone https://github.com/XploY04/shaktiyan.git
mkdir -p ~/.claude/skills
cp -R shaktiyan/skills/ui-craft ~/.claude/skills/
cd ~/.claude/skills/ui-craft/scripts && npm install
```

Needs Node 18+ and Google Chrome installed: the scripts launch your system
Chrome with `channel: 'chrome'`, so nothing extra downloads. No Chrome? Run
`npx playwright install chromium` and drop `channel: 'chrome'` from the
`chromium.launch(...)` call in each script.

`node_modules/` is not committed, so `npm install` is required after cloning.

Optional, all free: the sub-skills the pipeline routes to (`impeccable`,
`shadcn`, `boneyard`, `design-motion-principles`, `refero-design`). Missing ones
mean their step is skipped, not that this skill breaks. Say which are missing
rather than implying that step ran.

## Step 6 — run both scans

```
cd ~/.claude/skills/ui-craft/scripts   # playwright is installed here
node audit.mjs      http://localhost:3000 / /pricing /about
node slop-scan.mjs  http://localhost:3000
```

**`audit.mjs` is pass/fail correctness.** Exits non-zero. First screen across an
eleven-size viewport matrix, blank viewports while scrolling (must be zero),
ghosted content (limit 35%), per-node contrast composited through real painted
backgrounds, reduced motion leaving nothing invisible, every control focusable
with a visible ring, one `h1` / one `main` / no missing `alt`.

**Two sample sizes is not a test.** Checking 1440x900 and 390x844 misses the
whole middle: 1024x640, 1280x720, 1366x768 and 1512x850 are the sizes real
laptops actually are, and they are *short*, not narrow. Two failures live there
and only there:

- **Display type sized on width breakpoints overflows short viewports.** A
  `lg:text-[8.5rem]` headline is 136px on a 2560px screen and 136px on a
  1280x720 laptop, where it does not fit. Size display type from both axes:
  `clamp(2.75rem, min(6.4vw, 13.5vh), 7.5rem)`. The `vh` term is the one that
  matters and the one that gets forgotten.
- **The primary action lands below the fold on every desktop size** while both
  sample sizes happen to pass. If a page has one job, the control that does it
  belongs on the first screen at every size, and widening the headline's measure
  so it wraps to three lines instead of five is usually the fix.

**`slop-scan.mjs` is advisory genericness.** It counts repeated section
templates, dominant padding share, eyebrow labels, figure numbering, all-caps
running text, uniform grid dominance, over-rounding, overused typefaces, the
cream+serif+mono trifecta, infinite decorative animation, and aphorism cadence
in headings. **Every signal can be earned by a real brief.** A hit means "you
did this by reflex unless you can name the reason", not "this is broken".

Three rules about running them:

- **Never hand-compute contrast.** Eyeballing or arithmetic has been wrong every
  time the script has been right.
- **A failing check is a hypothesis.** Modern CSS emits `oklab()` and
  `color-mix()`; naive parsers read their coordinates as RGB and report
  nonsense. Verify the measurement before changing the page.
- **A passing check is also a hypothesis.** Both detectors have been too lenient
  and needed tightening. If a scan says clear and your eyes say otherwise,
  believe your eyes and fix the detector.

## Refuse by default

From `impeccable`'s craft floor and the current slop taxonomies. These are
category defaults, not bans: a brief's own words can earn any of them.
Reaching for one when the axis is free means you were not deciding.

**Structure**
- The hero → three cards → CTA skeleton, in any costume. Changing the font and
  keeping the bones changes nothing.
- Same-size cards of icon plus heading plus text as the page's structure. Nested
  cards are always wrong.
- Every section built to one template. Vary what a section *is*.
- One spacing value for every section. Rhythm needs tight and loose.
- The hero-metric template: big number, small label, three stats, accent.

**Typography and surface**
- **Eyebrow / kicker labels above headings.** This one is close to a hard ban:
  the heading carries its own weight.
- Section numbers (01/02/03, Fig. 1) unless the sequence carries information the
  reader needs.
- All-caps for anything longer than about three words.
- Warm cream ground plus serif display plus uppercase mono labels. The 2026
  tasteful default.
- Inter, Geist, Space Grotesk, Instrument Serif, Poppins, Montserrat on
  autopilot.
- Monospace as a costume for "technical" rather than for code, data, or
  measurement.
- Gradient text, decorative glass and blur, neon glow, purple-to-blue, thick
  coloured side borders, 24px+ radius on everything.
- Decorative grid or ruled backgrounds that support no canvas, map, or
  measurement.

**Motion**
- Fake carets, pulsing status dots, auto-scrolling marquees, bounce or elastic
  easing, hover-scale on images. Anything looping forever with nothing to say.
- One identical entrance on every section.

**Copy**
- Every section heading a short declarative sentence ending in a full stop. That
  cadence is an LLM tic and it is louder than any font choice.
- "Transform your X", "supercharge", "streamline", "seamless", "all-in-one".
- Manufactured contrast: "Not X. Y." as a recurring shape.
- More than a couple of em dashes.

## Over-motion, separately

`design-motion-principles` hunts AI-default motion. These are the opposite
problem, from humans with taste and too much scroll budget:

- Scroll-jacking: sections over ~1.5 viewports so a sticky scene can scrub.
- Scrub ranges longer than about a third of a viewport, which park content at
  partial opacity.
- `Math.sin(progress * ...)` oscillation. Always reads as jank.
- Scripted multi-second scroll on anchor clicks.
- Content that exists only mid-transition.

## CSS traps that keep biting

- **Put component classes in `@layer components`.** Unlayered rules beat
  Tailwind utilities by source order, so `text-paper/75` silently loses to
  `.label`'s colour. This has caused a real bug in every project where it was
  skipped.
- **Check Baseline before using a CSS feature; put non-Baseline behind
  `@supports`.** `animation-timeline: view()` is Chromium and Safari only.
  Structure it so the unsupported path is the resting legible state.
- Scroll-driven entrances must resolve inside a short range: `entry 12% entry
  34%` is about right.

## Working rules

1. **Never design from taste words.** "Modern", "clean", "premium" is not a
   brief. Turn it into named references, or name three real products you are
   designing against and say so.
2. **One dominant direction.** When references conflict, pick one and keep its
   sharp traits. Averaging produces the bland middle.
3. **Motion answers "what state change is this explaining?"** Budget one
   signature moment per page. Utility interactions 120-220ms ease-out.
4. **Ship the empty, loading, and error states.**
5. **Theme the browser surfaces you did not draw**: selection, caret,
   scrollbars, focus rings, underline offset, tabular numerals. Cheapest signal
   a page was built rather than assembled, and the one models skip most.
6. **Bounded passes.** Build fully, inspect once, fix in one batch, confirm
   once, stop. Two batches is normal; a third means the plan is wrong, not the
   pixels.
7. **Sample data is fine; fabricated evidence is not.** Illustrative records and
   demo queries are normal, and should be labelled illustrative. Invented user
   counts, testimonials, review scores, and press quotes are not.

## Free-only stack

Everything this skill calls for is free and needs no subscription. Where a
popular tool is paywalled, the free replacement is listed. If you reach for a
paid service anyway, say so first.

**Reference research** (replaces Mobbin MCP and Refero MCP, both of which put
their MCP behind a paid plan). Use `WebSearch` plus `WebFetch`, and capture the
references yourself with the Playwright already installed here:

```
node shot.mjs   # edit the URL, writes a full-page screenshot
```

Free galleries worth searching by name: Godly, Land-book, Lapa Ninja, SiteInspire,
One Page Love, Awwwards, Screenlane. Mobbin's own site still browses free with a
result cap. Name the three references you picked and what you are taking from
each; that is what the paid tools were for.

**Components**: shadcn/ui, Origin UI, Magic UI, Radix Primitives, Headless UI,
daisyUI. All MIT. Replaces 21st.dev Magic, whose free tier caps installs.

**Motion**: Motion (motion.dev, MIT), GSAP (free for commercial use including
every former Club plugin since April 2025), or native CSS and the Web Animations
API. Replaces the LottieFiles Creator MCP; when a real Lottie is needed, take a
free-licensed one from the LottieFiles library or hand-author SVG.

**Icons**: Lucide, Phosphor, Tabler, Simple Icons.
**Fonts**: Google Fonts, Fontshare, Fontsource. Check the refuse list first.
**Photos**: Unsplash, Pexels. Label anything illustrative.

## Shortcuts

- New surface: whole pipeline.
- "Looks AI-generated": `slop-scan.mjs` first, then fix what fires structurally
  before touching colour or type.
- "Feels janky" / "moves too much": the over-motion list, then `audit.mjs`.
- "Just polish it": `impeccable polish` → step 6.
