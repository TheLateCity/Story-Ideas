/* Fill a fresh local Ghost with the content this theme has to survive.
 *
 *   node seed.mjs                        seed content only
 *   node seed.mjs --theme ../the-late-city-1.0.9.zip    also upload + activate the theme
 *
 * Needs Node 20 or newer (fetch, FormData and Blob are built in).
 * Everything is created through the Admin API, exactly as the editor
 * would: real lexical cards, not pasted HTML, because Ghost strips the
 * classes off markup pasted into the body and the trust blocks and pull
 * quotes would silently come out as ordinary headings and quotes. */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const BASE = process.env.GHOST_URL || 'http://localhost:2368';
const EMAIL = process.env.GHOST_EMAIL || 'owner@thelatecity.test';
const PASSWORD = process.env.GHOST_PASSWORD || 'LateCity2026!';
const TITLE = 'The Late City';
const API = BASE + '/ghost/api/admin';
const H = { 'Accept-Version': 'v6.0', Origin: BASE };
let COOKIE = '';

const themeArg = process.argv.indexOf('--theme');
const themeZip = themeArg > -1 ? process.argv[themeArg + 1] : null;

/* ---------- tiny admin API client ---------- */
async function setupOwner() {
  const r = await fetch(`${API}/authentication/setup/`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ setup: [{ name: 'Sagar', email: EMAIL, password: PASSWORD, blogTitle: TITLE }] })
  });
  if (r.ok) return console.log('· owner created');
  console.log('· owner already exists, signing in');
}
async function login() {
  const r = await fetch(`${API}/session/`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: EMAIL, password: PASSWORD })
  });
  COOKIE = (r.headers.getSetCookie() || []).map(c => c.split(';')[0]).join('; ');
  if (!COOKIE) throw new Error(`could not sign in (${r.status}). Wrong GHOST_PASSWORD?`);
}
async function api(path, method = 'GET', body) {
  const r = await fetch(API + path, {
    method, headers: { ...H, Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 400) }; }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}
async function uploadFile(path, endpoint, field = 'file', type = 'image/png', extra = {}) {
  const fd = new FormData();
  fd.set(field, new Blob([readFileSync(path)], { type }), basename(path));
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  const r = await fetch(API + endpoint, { method: 'POST', headers: { ...H, Cookie: COOKIE }, body: fd });
  const json = await r.json();
  if (!r.ok) throw new Error(`upload ${path} → ${r.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

/* ---------- lexical helpers: what the editor actually stores ---------- */
const BOLD = 1, ITALIC = 2;
const t = (text, format = 0) => ({ detail: 0, format, mode: 'normal', style: '', text, type: 'extended-text', version: 1 });
const para = (...kids) => ({ children: kids, direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1 });
const p = (text) => para(t(text));
const h = (tag, text) => ({ children: [t(text)], direction: 'ltr', format: '', indent: 0, type: 'extended-heading', tag, version: 1 });
const quote = (text) => ({ children: [t(text)], direction: 'ltr', format: '', indent: 0, type: 'quote', version: 1 });
const pullquote = (text) => ({ children: [t(text)], direction: 'ltr', format: '', indent: 0, type: 'aside', version: 1 });
const list = (items, tag = 'ul') => ({
  children: items.map((x, i) => ({ children: [t(x)], direction: 'ltr', format: '', indent: 0, type: 'listitem', value: i + 1, version: 1 })),
  direction: 'ltr', format: '', indent: 0, listType: tag === 'ol' ? 'number' : 'bullet', start: 1, tag, type: 'list', version: 1
});
const image = (src, { alt = '', caption = '', width: w = 'regular' } = {}) =>
  ({ type: 'image', version: 1, src, width: 1600, height: 1067, title: '', alt, caption, cardWidth: w, href: '' });
const htmlCard = (html) => ({ type: 'html', version: 1, html });
const doc = (children) => JSON.stringify({ root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 } });

/* ---------- run ---------- */
await setupOwner();
await login();

if (themeZip) {
  const up = await uploadFile(themeZip, '/themes/upload/', 'file', 'application/zip');
  const theme = up.themes[0];
  console.log(`· theme uploaded: ${theme.name} v${theme.package.version}`);
  for (const w of theme.warnings || []) console.log(`  gscan warning: ${w.rule}`);
  for (const e of theme.errors || []) console.log(`  gscan ERROR:   ${e.rule}`);
  await api(`/themes/${theme.name}/activate/`, 'PUT');
  console.log(`· theme activated: ${theme.name}`);
}

const house = (await uploadFile('fixtures/house.png', '/images/upload/', 'file', 'image/png', { purpose: 'image' })).images[0].url;
const street = (await uploadFile('fixtures/street.png', '/images/upload/', 'file', 'image/png', { purpose: 'image' })).images[0].url;
const portrait = (await uploadFile('fixtures/portrait.png', '/images/upload/', 'file', 'image/png', { purpose: 'image' })).images[0].url;
console.log('· images uploaded');

const me = (await api('/users/me/')).users[0];
await api(`/users/${me.id}/`, 'PUT', { users: [{ ...me,
  bio: 'Writes the Philosophy desk, and edits the rest. Previously a reporter on things that were built quickly.',
  profile_image: portrait, location: 'Delhi', updated_at: me.updated_at }] });

/* Any post already carrying one of our slugs is replaced, so the script
   can be run twice without the site filling up with duplicates. */
const existing = (await api('/posts/?limit=all&fields=id,slug')).posts;
const existingPages = (await api('/pages/?limit=all&fields=id,slug')).pages;
async function put(kind, slug, payload) {
  const found = (kind === 'posts' ? existing : existingPages).find(x => x.slug === slug);
  if (found) {
    const cur = (await api(`/${kind}/${found.id}/?formats=lexical`))[kind][0];
    await api(`/${kind}/${found.id}/`, 'PUT', { [kind]: [{ ...payload, updated_at: cur.updated_at }] });
    return `updated  /${slug}/`;
  }
  await api(`/${kind}/`, 'POST', { [kind]: [{ ...payload, slug }] });
  return `created  /${slug}/`;
}

const flagship = doc([
  p('In November 1919, Franz Kafka took time off from the insurance institute where he worked and went to Schelesen, a spa village north of Prague, in order to answer a question his father had asked him.'),
  para(t('The question was why his son claimed to be afraid of him. Kafka was thirty-six. He had a law degree, a respectable career, tuberculosis, a broken engagement his father had helped to break, and '), t('The Metamorphosis', ITALIC), t(' behind him. He sat down to write a letter and produced a hundred pages, which his mother read, kept, and never delivered.')),
  image(house, { alt: 'A house plan, redrawn', caption: 'A house plan, redrawn. The rooms are the ones we were given.', width: 'wide' }),
  h('h2', 'The first world we mistake for the world'),
  p('Adults have an instrument children do not: comparison.'),
  p('If you join a company where people shout at each other in meetings, you can register that the office is unusual, even if it takes you a year to say so out loud. If you eat with a family that discusses salaries and loans at the table, and yours never did, the strangeness of childhood arrives late and sideways, as a small shock in someone else’s dining room.'),
  list(['A rule you were taught, and never examined since.', 'A rule nobody said aloud, which everybody obeyed.', 'A rule that was only ever true of one house.']),
  h('h2', 'The rules that keep running'),
  p('What survives is rarely the argument. It is the reflex: the flinch before a raised voice, the instinct to apologise first, the certainty that money is a subject for another room. These are not beliefs. They are settings, and they were configured before anyone asked whether the configuration was any good.'),
  pullquote('He wrote to be understood, and then arranged for the letter never to arrive. That is the whole of the inheritance in one gesture.'),
  p('The letter is not a document of hatred. It is a document of a man trying to describe the weather of a house he grew up in, to the person who made the weather, in the language that person taught him.'),
  quote('“You asked me recently why I maintain that I am afraid of you.”'),
  h('h2', 'Leaving the house, and taking it with you'),
  p('Nobody moves out cleanly. The rules travel in the luggage, and the first years of any adult life are spent unpacking them in rooms they were never written for. Some hold up. Most do not, and the work is telling which is which before somebody else has to.'),
  image(street, { alt: 'A street at dusk', caption: 'The city the letter was written in, or one like it.' }),
  h('h2', 'What a letter is for'),
  p('A letter assumes a reader. That is the whole difference between a letter and a diary, and it is the reason a hundred undelivered pages are still addressed to somebody.'),
  h('h3', 'A short note on evidence'),
  p('Everything above is a reading of one letter, written by one man who was ill, unhappy, and extraordinarily good at making a private grievance sound like a general law. Read it as literature first.'),
  htmlCard('<div class="lc-table"><table><caption>What the letter counts</caption><thead><tr><th>Year</th><th>Pages</th><th>Delivered</th></tr></thead><tbody><tr><td>1919</td><td>103</td><td>No</td></tr><tr><td>1952</td><td>103</td><td>Published</td></tr></tbody></table></div>'),
  htmlCard('<div class="lc-trust"><h2>How we reported this</h2><p>Read in the Schocken edition, against the German text. No living relative was contacted; everyone named here died before 1970.</p></div>'),
  htmlCard('<div class="lc-trust lc-trust--correction"><h2>Correction</h2><time datetime="2026-09-12">12 September 2026</time><p>An earlier version placed Schelesen south of Prague. It is north.</p></div>'),
  p('The rest is ours to work out, in the houses we are making now, with the rules we have not yet noticed we are writing down.')
]);

const cards = doc([
  p('This story exists to exercise every card that breaks out of the reading column, and a few that do not.'),
  h('h2', 'A full width card'),
  p('The card below is set to full width, which should run to the page gutters and stay centred on the same axis as the prose.'),
  image(street, { alt: 'Full width test', caption: 'Full width: to the gutters.', width: 'full' }),
  h('h2', 'A wide card'),
  p('The card below is set to wide, which should be half as wide again as the measure, centred on the column.'),
  image(house, { alt: 'Wide test', caption: 'Wide: a step out of the column.', width: 'wide' }),
  h('h2', 'Other cards'),
  { type: 'gallery', version: 1, caption: 'A two image gallery.', images: [
    { row: 0, fileName: 'a.png', src: house, width: 1600, height: 1067 },
    { row: 0, fileName: 'b.png', src: street, width: 1600, height: 1067 }] },
  { type: 'bookmark', version: 1, url: 'https://ghost.org/', caption: '', metadata: { url: 'https://ghost.org/', title: 'Ghost: The best open source blog & newsletter platform', description: 'Beautiful, modern publishing with newsletters and paid subscriptions built in.', author: null, publisher: 'Ghost', thumbnail: null, icon: null } },
  { type: 'callout', version: 1, calloutText: 'A callout card, which Ghost styles itself and the theme leaves alone.', calloutEmoji: '📌', backgroundColor: 'grey' },
  { type: 'button', version: 1, buttonText: 'A button card', buttonUrl: 'https://ghost.org/', alignment: 'left' },
  { type: 'codeblock', version: 1, language: 'css', caption: '', code: '--measure: 36rem;   /* seventy characters, and the column is centred */\n--breakout: min(var(--lc-wrap-w), 54rem);' },
  { type: 'horizontalrule', version: 1 },
  p('And a closing paragraph, so the last card is not the end of the story.')
]);

const jobs = [
  ['posts', 'the-rules-of-the-house', { title: 'The Rules of the House', lexical: flagship, status: 'published', featured: true,
    custom_excerpt: 'As children we cannot know that our home is only one version of the world. Years later, some of its rules are still running, long after we have forgotten where they came from.',
    feature_image: house, feature_image_alt: 'A house plan, redrawn', feature_image_caption: 'A house plan, redrawn.',
    tags: [{ name: 'Philosophy' }, { name: 'Essay' }] }],
  ['posts', 'every-card-the-editor-can-reach', { title: 'Every card the editor can reach', lexical: cards, status: 'published',
    custom_excerpt: 'A test fixture: full width, wide, gallery, bookmark, callout, button, code and a rule.', tags: [{ name: 'Technology' }] }],
  ['posts', 'the-machine-that-files-the-paperwork', { title: 'The machine that files the paperwork', status: 'published',
    custom_excerpt: 'A short opening, one subhead, and no feature image: three editorial decisions the theme has to survive.',
    lexical: doc([p('Kafka wrote a letter, and never sent it.'),
      p('That is the entire mechanism of an inheritance: a thing said clearly, to nobody, and then kept in a drawer where it goes on working anyway.'),
      h('h2', 'One heading, on purpose'),
      p('This story carries a single subhead, which is the case the numbering has to refuse: a lone 01 in the margin would claim the piece has parts it does not have.'),
      p('Everything else about the section is ordinary. The space above the heading does the work.')]),
    tags: [{ name: 'Technology' }, { name: 'Report' }] }],
  ['posts', 'a-story-that-opens-on-a-heading', { title: 'A story that opens on a heading', status: 'published',
    lexical: doc([h('h2', 'The story opens on a heading'),
      p('There is no opening paragraph to carry a drop cap, which is a legitimate way to start, and the heading should sit flush against the top of the column.'),
      h('h2', 'And a second section'),
      p('So the numbering has something to count, and the first heading is 01 even though it is the very first thing in the story.')]),
    tags: [{ name: 'Philosophy' }] }],
  ['posts', 'what-the-office-learned-from-the-factory-floor', { title: 'What the office learned from the factory floor', status: 'published',
    feature_image: street, feature_image_alt: 'A street at dusk',
    lexical: doc([p('Scientific management arrived in the office a century after it arrived on the floor, and it arrived with the same promise: that the work could be measured, and that measuring it would make it lighter.'),
      h('h2', 'Measurement'), p('It did not make it lighter.'),
      h('h2', 'Consent'), p('What it made was a record, and a record is a claim about a person that outlives the day it was made.'),
      h('h2', 'The ledger nobody reads'), p('Every system of measurement eventually produces more numbers than anyone has time to read, and at that point it stops being measurement and becomes weather.')]),
    tags: [{ name: 'Technology' }, { name: 'Essay' }] }],
  ['posts', 'notes-on-a-week-of-small-announcements', { title: 'Notes on a week of small announcements', status: 'published',
    lexical: doc([p('Four companies shipped the same feature in nine days, which is either a coincidence or a roadmap somebody left open in a hotel lobby.'), p('The week ends, as they do, with nothing settled.')]),
    tags: [{ name: 'Technology' }, { name: '#this-week' }] }],
  ['posts', 'the-argument-for-reading-slowly', { title: 'The argument for reading slowly', status: 'published',
    lexical: doc([p('A long piece read quickly is a short piece with extra steps, and the difference is not in the words. It is in what the reader is willing to carry.')]),
    tags: [{ name: 'Philosophy' }, { name: '#this-week' }] }],
  ['posts', 'a-city-that-keeps-its-own-hours', { title: 'A city that keeps its own hours', status: 'published',
    lexical: doc([p('The late edition existed because the day did not finish when the presses wanted it to. Nothing about that has changed except the presses.')]),
    tags: [{ name: 'Philosophy' }] }],
  ['pages', 'editorial-standards', { title: 'Editorial standards', status: 'published', feature_image: street,
    custom_excerpt: 'What we promise, what we refuse, and what we do when we get it wrong.',
    lexical: doc([p('The Late City reports on what is being built and argues about what it costs. These are the rules we hold ourselves to, written down so a reader can hold us to them as well.'),
      h('h2', 'Sourcing'), p('Every claim of fact in a story is attributable to a person, a document or a direct observation, and the story says which.'),
      h('h2', 'Corrections'), p('A correction is printed on the story it corrects, dated, and left there. Nothing is quietly edited after publication.'),
      image(street, { alt: '', caption: 'A wide card on a standing document.', width: 'wide' }),
      h('h2', 'Conflicts of interest'), p('A writer with a stake in the subject says so in the story, in the place a reader would want to know it.'),
      h('h2', 'Artificial intelligence'), p('No story is written by a machine. Where a tool has been used to search, transcribe or check, the story says so.')]) }]
];

for (const [kind, slug, payload] of jobs) console.log('·', await put(kind, slug, payload));

await api('/settings/', 'PUT', { settings: [
  { key: 'navigation', value: JSON.stringify([
    { label: 'Home', url: '/' }, { label: 'Technology', url: '/tag/technology/' },
    { label: 'Philosophy', url: '/tag/philosophy/' }, { label: 'About', url: '/editorial-standards/' }]) },
  { key: 'description', value: 'Reporting on what is being built, and arguments about what it is doing to the rest of us.' }
] });
console.log('· navigation and description set');
console.log(`\nDone. Open ${BASE}/ and ${BASE}/ghost/`);
