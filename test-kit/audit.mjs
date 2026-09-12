/* Measure the theme on a running Ghost and write a report you can send back.
 *
 *   npm install && npx playwright install chromium
 *   node audit.mjs
 *
 * Produces ./out/report.md, ./out/report.json and ./out/shots/*.png.
 * Zip the out folder and send it over. */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.GHOST_URL || 'http://localhost:2368';
const WIDTHS = [1440, 1024, 390];
const ROUTES = [
  ['home', '/'],
  ['post-flagship', '/the-rules-of-the-house/'],
  ['post-cards', '/every-card-the-editor-can-reach/'],
  ['post-short-opening', '/the-machine-that-files-the-paperwork/'],
  ['post-opens-on-heading', '/a-story-that-opens-on-a-heading/'],
  ['post-no-feature', '/a-city-that-keeps-its-own-hours/'],
  ['tag-technology', '/tag/technology/'],
  ['tag-philosophy', '/tag/philosophy/'],
  ['page-standards', '/editorial-standards/'],
  ['author', '/author/sagar/'],
  ['error-404', '/no-such-page-exists/']
];

/* Runs in the page. Everything the report needs, measured rather than eyeballed. */
const PROBE = () => {
  const round = n => Math.round(n);
  const vw = window.innerWidth;
  const box = sel => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { left: round(r.left), right: round(vw - r.right), width: round(r.width) }; };
  const out = { viewport: vw, scrollWidth: document.documentElement.scrollWidth };
  out.overflow = out.scrollWidth - vw;
  out.offenders = [];
  if (out.overflow > 0) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1)) {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
        out.offenders.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} [${round(r.left)}…${round(r.right)}]`);
        if (out.offenders.length > 6) break;
      }
    }
  }
  const prose = document.querySelector('.lc-prose');
  if (prose) {
    out.column = box('.lc-prose');
    /* characters on a line, measured on the first paragraph that is not
       the drop cap one (the cap sits on its own baseline) */
    const plain = [...prose.querySelectorAll(':scope > p')].find(x => !x.className && x.firstChild && x.firstChild.nodeType === 3);
    if (plain) {
      const range = document.createRange(), node = plain.firstChild, text = node.textContent;
      let top = null, chars = 0;
      for (let i = 1; i <= text.length; i++) {
        range.setStart(node, i - 1); range.setEnd(node, i);
        const r = range.getBoundingClientRect();
        if (top === null) top = r.top;
        if (Math.abs(r.top - top) > 2) break;
        chars = i;
      }
      out.charsPerLine = chars;
    }
    const cap = prose.querySelector('.lc-cap, .lc-cap-raise');
    if (cap) {
      out.dropCap = cap.className;
      const r = document.createRange(); r.setStart(cap.firstChild, 0); r.setEnd(cap.firstChild, 1);
      const b = r.getBoundingClientRect(), lh = parseFloat(getComputedStyle(cap).lineHeight);
      out.dropCapLines = +(b.height / lh).toFixed(2);
    }
    out.sections = [...prose.querySelectorAll(':scope > h2')].map(x => ({
      text: x.textContent.slice(0, 34),
      marker: getComputedStyle(x, '::before').content,
      hangingIndent: getComputedStyle(x).paddingLeft,
      left: round(x.getBoundingClientRect().left)
    }));
    out.trustBlockMarkers = [...prose.querySelectorAll('.lc-trust h2')].map(x => getComputedStyle(x, '::before').content);
    out.wide = box('.lc-prose .kg-width-wide');
    out.full = box('.lc-prose .kg-width-full');
    out.wideCaption = box('.lc-prose .kg-width-wide figcaption');
    out.fullCaption = box('.lc-prose .kg-width-full figcaption');
  }
  if (document.querySelector('.lc-doc-main')) {
    out.docMain = box('.lc-doc-main');
    out.docWide = box('.lc-doc-main .kg-width-wide');
    out.tocLinks = document.querySelectorAll('.lc-toc a').length;
  }
  /* document.fonts.check() answers true for a family the browser has
     never heard of, because a missing family is "available" as its
     fallback. Ask the FontFaceSet what it actually loaded instead. */
  const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, ''));
  out.fonts = {
    serif: loaded.includes('Newsreader'),
    sans: loaded.includes('Instrument Sans'),
    mono: loaded.includes('IBM Plex Mono')
  };
  return out;
};

mkdirSync('out/shots', { recursive: true });
const browser = await chromium.launch();
const results = [];

for (const [name, path] of ROUTES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const consoleErrors = [], failedRequests = [];
    page.on('console', m => {
      /* "Failed to load resource" is the network, and every one of them
         is already recorded as a failed request; keep real script errors */
      if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) consoleErrors.push(m.text().slice(0, 160));
    });
    page.on('pageerror', e => consoleErrors.push('PAGE ERROR ' + e.message.slice(0, 160)));
    page.on('requestfailed', r => failedRequests.push(`${r.url().replace(BASE, '')} :: ${r.failure().errorText}`));

    const response = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const probe = await page.evaluate(PROBE);

    /* Grow the viewport to the whole document before shooting: the theme
       paints its halftones when they scroll into view, and a full-page
       capture never scrolls, so they would come out blank. */
    const height = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width, height: Math.min(height + 100, 16000) });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `out/shots/${name}-${width}.png` });

    results.push({ name, path, width, status: response.status(), consoleErrors, failedRequests, ...probe });
    await ctx.close();
  }
}

/* dark mode, one page, both to look at and to prove the toggle persists */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('lc-theme', 'dark'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(BASE + '/the-rules-of-the-house/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const height = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: 1440, height: Math.min(height + 100, 16000) });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'out/shots/post-flagship-1440-dark.png' });
  await ctx.close();
}

await browser.close();

/* ---------- report ---------- */
const problems = [];
for (const r of results) {
  const at = `${r.name} @${r.width}`;
  if (r.status >= 400 && r.name !== 'error-404') problems.push(`${at}: HTTP ${r.status}`);
  if (r.overflow > 0) problems.push(`${at}: page scrolls sideways by ${r.overflow}px — ${r.offenders.join('; ')}`);
  if (r.column && Math.abs(r.column.left - r.column.right) > 2) problems.push(`${at}: column not centred (${r.column.left} left, ${r.column.right} right)`);
  for (const kind of ['wide', 'full']) {
    const b = r[kind];
    if (b && Math.abs(b.left - b.right) > 2) problems.push(`${at}: ${kind} card not centred (${b.left} / ${b.right})`);
  }
  if (r.charsPerLine && (r.charsPerLine < 55 || r.charsPerLine > 80) && r.width > 700)
    problems.push(`${at}: ${r.charsPerLine} characters a line (aiming for 65–75)`);
  for (const m of r.trustBlockMarkers || []) if (m !== 'none') problems.push(`${at}: a trust block heading is being numbered (${m})`);
  if (r.fonts && !(r.fonts.serif && r.fonts.sans && r.fonts.mono)) problems.push(`${at}: webfonts did not load (${Object.entries(r.fonts).filter(([, v]) => !v).map(([k]) => k).join(', ')}) — check the machine can reach fonts.googleapis.com`);
  for (const e of r.consoleErrors) problems.push(`${at}: script error — ${e}`);
  /* only the site's own requests matter; a blocked CDN is the network, not the theme */
  for (const f of r.failedRequests) if (!/^https?:\/\//.test(f)) problems.push(`${at}: request failed — ${f}`);
}

const line = r => [
  `| ${r.name} | ${r.width} | ${r.status} | ${r.overflow === 0 ? 'none' : r.overflow + 'px'} `,
  `| ${r.column ? `${r.column.left}/${r.column.right} (${r.column.width})` : '—'} `,
  `| ${r.charsPerLine ?? '—'} | ${r.dropCap ?? '—'} `,
  `| ${r.wide ? `${r.wide.left}/${r.wide.right}` : '—'} | ${r.full ? `${r.full.left}/${r.full.right}` : '—'} |`
].join('');

const md = [
  `# The Late City — theme audit`,
  ``,
  `- Ghost: ${BASE}`,
  `- Run: ${new Date().toISOString()}`,
  `- Routes: ${ROUTES.length} × widths ${WIDTHS.join('/')} = ${results.length} renders`,
  ``,
  problems.length ? `## Problems (${problems.length})\n\n` + problems.map(x => `- ${x}`).join('\n')
                  : `## Problems\n\nNone found.`,
  ``,
  `## Measurements`,
  ``,
  `| page | width | http | sideways scroll | column left/right (w) | chars/line | drop cap | wide card l/r | full card l/r |`,
  `|---|---|---|---|---|---|---|---|---|`,
  ...results.map(line),
  ``,
  `## Section numbering`,
  ``,
  ...results.filter(r => r.sections?.length).map(r =>
    `**${r.name} @${r.width}** — ` + r.sections.map(s =>
      `${s.marker === 'none' ? 'no marker' : 'numbered'}${s.hangingIndent !== '0px' ? ` (indent ${s.hangingIndent})` : ''}: ${s.text}`).join(' · ')),
  ``,
  `## External requests that failed`,
  ``,
  `These are third-party hosts (Ghost's own portal/search scripts, stock images). They matter only if you are offline or behind a filter.`,
  ``,
  ...[...new Set(results.flatMap(r => r.failedRequests.filter(f => /^https?:\/\//.test(f))))].map(f => `- ${f}`),
  ``
].join('\n');

writeFileSync('out/report.md', md);
writeFileSync('out/report.json', JSON.stringify(results, null, 1));
console.log(md.split('\n## Measurements')[0]);
console.log(`\nWrote out/report.md, out/report.json and ${results.length + 1} screenshots in out/shots/`);
