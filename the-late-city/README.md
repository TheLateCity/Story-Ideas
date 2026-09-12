# The Late City

A Ghost theme for a publication with two desks. Technology reports on what
is being built. Philosophy works out what it costs.

Built for Ghost 6, and verified on Ghost 5 as well. The version is in
`package.json` and in the name of the zip you were given.

This is written for the person running the publication, not for a Ghost
developer. Everything below is done in Ghost Admin. You never need to edit
the theme to publish, curate, correct or change the newsletter copy.

---

## 1. Install

1. In Ghost Admin, go to **Settings, Design and branding, Change theme,
   Upload theme**.
2. Upload the `the-late-city-x.y.z.zip` you were given.
3. Click **Activate**.

The theme works immediately on a site with no content. It will not show
demonstration stories, because it has none: an empty front page says so
plainly and keeps its masthead, its letter and its footer.

**One thing to know about the file name.** Ghost takes the theme's name in
your theme list from the name of the zip you uploaded, not from anything
inside it. `the-late-city-1.0.1.zip` therefore installs as a theme called
`the-late-city-1.0.1`. When you upload the next version it appears as a
second entry rather than replacing the first, so delete the older one once
the new one is active and you are happy with it.

---

## 2. The two desks

The publication has exactly two sections, and the relationship between them
is the whole idea. Create two tags, in **Settings, Tags**:

| Tag name | Slug | Colour it carries |
|---|---|---|
| Technology | `technology` | blue |
| Philosophy | `philosophy` | red |

The slugs matter. The theme recognises those two exactly, and gives each its
own page layout, its question and its accent colour. Any other tag is a
topic and is treated as one.

Give each desk a **description** in Ghost. It prints under the desk name on
the desk page, and it is the one piece of desk copy you control without
touching the theme. If you leave it empty the theme falls back to its own
line, so the page is never blank.

The questions under each desk name are part of the publication's identity
and are set in the theme:

- Technology asks **What are we building?**
- Philosophy asks **What is it doing to us?**

---

## 3. How to tag a story

**Tag order in the editor decides everything.** Ghost treats the first tag
as the primary tag, and the theme reads the list by position.

1. **The desk, first.** `Technology` or `Philosophy`. This is what makes the
   label read TECHNOLOGY and gives the story its colour. A story with the
   desk second will look wrong everywhere.
2. **The type, second.** What kind of claim the piece makes: `Report`,
   `Analysis`, `Investigation`, `Essay`, `Argument`, `Dispatch`, `Interview`,
   `Review`, `Notebook`. This list is not enforced anywhere; use the words
   your publication actually uses.
3. **Topics, third onwards.** `AI`, `Procurement`, `Infrastructure`,
   `Housing`, `Labour`, `Privacy`, `Attention`, `Consent`, and so on. Topics
   run through both desks and are deliberately not desks.

So a story is tagged, in order: `Technology`, `Investigation`, `Procurement`,
`Housing`.

What you get:

- On the front page the label reads `TECHNOLOGY / INVESTIGATION`.
- Inside a desk, where the reader already knows the section, the label drops
  the desk and reads `INVESTIGATION / PROCUREMENT`.
- At the foot of the story, **Filed under** lists everything after the desk.

A story with only a desk tag reads `TECHNOLOGY`, with no trailing slash. A
story with no tags at all shows no label and no colour. Neither is a fault.

### Internal tags

A tag whose name begins with `#` is internal to Ghost. Internal tags never
appear anywhere on the site. The theme uses one of them, below.

---

## 4. This week

The first module on the front page is headed **This week**, noted "Selected
by the editor". That note is only true if you select.

Create an internal tag called `#this-week` and add it to the stories you
want in the module. The theme shows up to six, newest first, in three
densities:

```
FEATURE

SUPPORT        SUPPORT

BRIEF     BRIEF     BRIEF
```

With fewer than six it simply stops early. One story is a feature on its
own; three are a feature and two supports. With none, the whole module
disappears rather than claiming a selection that does not exist.

Take `#this-week` off last week's stories when you add this week's. Nothing
expires on its own.

---

## 5. The lead story

The big story in the black plate at the top of the front page is:

1. the newest post marked **Featured**, if there is one;
2. otherwise the newest post that is **not** tagged `#this-week`;
3. otherwise simply the newest post.

So forgetting to feature something never collapses the front page.

**Do not put `#this-week` on the story you have featured.** The lead and the
This week module are chosen by separate queries, and this is the convention
that keeps the same story from appearing twice at the top of the page.
Featured posts are excluded from This week automatically, so following the
rule above is enough.

---

## 6. Navigation

In **Settings, Navigation**, primary navigation:

| Label | URL |
|---|---|
| Front page | `/` |
| Technology | `/tag/technology/` |
| Philosophy | `/tag/philosophy/` |
| About | `/about/` |

The theme colours the Technology and Philosophy links by looking at the end
of the URL, not at the label, so you can rename them and they keep their
colours. If you set no navigation at all, the theme falls back to a menu it
builds from your own tags and pages, so the mobile menu is never empty.

---

## 7. Pages

Create these as Ghost **pages**. The theme lays them out as documents, with a
contents column built from their own headings; you write headings and
nothing else.

| Page | Slug | Where it appears |
|---|---|---|
| About | `about` | navigation, footer |
| Editorial standards | `editorial-standards` | footer, and the Corrections link |
| Privacy | `privacy` | footer |
| Terms | `terms` | footer, if it exists |
| Contact | `contact` | footer, if there is no contact address set |

Every one of these is optional. A page you have not written simply does not
appear in the footer, rather than appearing as a link that goes nowhere.

The contents column appears once a page has three or more `Heading 2`
headings. Shorter pages stay in one column on purpose.

### The two desks, side by side, on the About page

To put the Technology and Philosophy pair on the About page, add an **HTML
card** and paste:

```html
<div class="lc-pair">
  <div class="lc-pair-item" data-desk="technology">
    <h3>Technology</h3>
    <p class="lc-q">What are we building?</p>
    <p>Contracts, substations, defaults and models.</p>
  </div>
  <div class="lc-pair-item" data-desk="philosophy">
    <h3>Philosophy</h3>
    <p class="lc-q">What is it doing to us?</p>
    <p>Attention, consent, responsibility, judgment.</p>
  </div>
</div>
```

---

## 8. Editorial blocks inside a story

A few things sit outside what the Ghost editor can express on its own. The
pull quote needs no HTML at all. Everything after it uses the editor's
**HTML card**, which you reach by typing `/html` on a new line.

> **Use the HTML card, not a paste into the body.** Ghost's editor
> understands headings, paragraphs, lists and its own cards, and quietly
> discards anything else. Markup pasted straight into the body arrives with
> its classes stripped and none of this will work. Inside an HTML card it is
> kept exactly as you typed it.

### Subheads, and the numbers beside them

Use `Heading 2` for the sections of a story. Write them as sentences, not
as labels: they are read as part of the piece.

From the second `Heading 2` onwards the theme numbers the sections and
prints the number in the margin, beside the heading, in the small mono it
uses for a classification. It is set outside the reading column, so it is
never in the way of the sentence a reader is on, and it is there for the
reader who is looking back for where an argument turned. A story with one
subhead is not numbered at all: a lone 01 says a story has parts when it
has not. On a phone there is no margin to hang it in, so the number moves
in beside the heading instead.

Nothing is required of you. Write `Heading 2` as you always have and the
numbering follows. `Heading 3` is for a note or an aside inside a section
and is never numbered.

### Pull quote: no HTML needed

Select a paragraph, make it a **blockquote**, then press the quote button a
second time. That is Ghost's alternative blockquote style, and the theme
sets it as the pull quote: large, italic, flush left on the column, with a
rule above and below.

Press the button once and you get an ordinary blockquote instead, which
stays quiet, with a thin rule down its left side. Use that one for words
you are quoting from a document or a source; use the pull quote for the
line you want a reader to carry away. You can tell the two apart at a
glance in the editor.

### How we reported this

```html
<div class="lc-trust lc-reporting-note">
  <h2>How we reported this</h2>
  <p>What the story rests on, who was asked, and what could not be obtained.</p>
</div>
```

### A correction

```html
<div class="lc-trust lc-trust--correction">
  <h2>Correction</h2>
  <span class="lc-when">7 September 2026</span>
  <p>What was wrong, and what it now says.</p>
</div>
```

Write these as divs, not as asides. An `<aside>` is a landmark, and a
landmark inside the article is announced to a screen reader as a region of
the page in its own right, alongside the navigation and the footer. A
reporting note is part of the story, not a region beside it.

The correction carries a red rule and a red heading, so it is visible rather
than tucked away. Write the date yourself, in the block. Never edit the
sentence that was wrong without saying so here.

### A disclosure

```html
<div class="lc-trust lc-disclosure">
  <h2>Disclosure</h2>
  <p>A relationship the reader should know about.</p>
</div>
```

### A short source note beside the prose

```html
<div class="lc-srcnote">Figures are from the 2025 return, the most recent published.</div>
```

### A table with a caption

A Markdown card will make a table, and it will never push the page
sideways, but it only ever measures its own content. For a table that runs
the full width of the column with a caption above it, use an HTML card and
wrap it:

```html
<div class="lc-table">
  <table>
    <caption>Applications overridden by year</caption>
    <thead>
      <tr><th scope="col">Year</th><th scope="col">Applications</th><th scope="col">Overridden</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">2021</th><td>14,203</td><td>361</td></tr>
      <tr><th scope="row">2022</th><td>18,884</td><td>402</td></tr>
    </tbody>
  </table>
</div>
```

The caption is the table's headline: say what it counts. A table too wide
for a phone scrolls inside its own box rather than moving the page.

None of these appear unless you write them. The theme never invents a
correction, a disclosure or a note about reporting.

---

## 9. Pictures

Every story shows a picture box, always in the same **3:2** proportion, and
the space is reserved before the picture loads so nothing on the page jumps.

- Upload a **feature image** and it is used, at the right size for wherever
  it appears.
- Write **alt text** on it. If you leave it empty the theme leaves the alt
  empty too, which is correct for a decorative image, rather than inventing
  a description of a photograph it has not seen.
- A **caption** appears only if you write one. No caption, no reserved space.

A story with no feature image gets a generated halftone: an abstract city,
screened at 45 degrees, the angle used for the black plate in offset
printing. It is drawn from the post's own id, so it is the same picture
every time anyone sees that story.

**The halftone is decoration and is treated as such.** It is hidden from
screen readers, has no caption and no credit, and is never presented as a
photograph of anything. On the article page itself there is no halftone at
all: a story with no picture opens straight onto its prose, which is a
perfectly good way for a story to open and is better than implying an image
of an event nobody photographed.

---

## 10. Authors

The theme uses your real Ghost staff profiles.

- **Name** appears in the byline and at the foot of the story.
- **Bio** appears at the foot of the story and on the author page.
- **Profile picture** appears if you upload one. If you do not, the theme
  draws the author's initials in a small square. There is never a broken
  image.
- **Website** and **location** appear on the author page if set.

Several authors on one story all appear, in the byline and at the foot.

The theme does not invent a job title. Ghost has no field for one, and
putting "Editor" into the location field so it prints under a name is the
sort of thing that is quietly wrong forever, so the theme does not do it.

---

## 11. The Late Letter

The newsletter section on the front page and at the foot of every story. It
is a real Ghost Members form: it uses your default newsletter, shows Ghost's
loading, success and error states, and does nothing on its own.

A reader who is already signed in is not asked to sign up again; they get a
link to manage what they receive.

The copy is yours, in **Settings, Design and branding, Homepage**:

- **Late letter heading**
- **Late letter body**
- **Late letter signature** and **Late letter role**
- **Late letter fine** print

A note on that last one. It is tempting to write that the publication stores
your address and nothing else. Ghost stores rather more than that in order to
send you an email and to let you unsubscribe, so the shipped default says
something accurate instead. If you edit it, keep it true.

---

## 12. Theme settings

All ten are in **Settings, Design and branding**.

**Homepage**

| Setting | What it does |
|---|---|
| Masthead note | The line under the wordmark on the front page. |
| Late letter heading | The headline of the newsletter section. |
| Late letter body | The editor's note in it. |
| Late letter signature | Who signs it. Empty means no signature. |
| Late letter role | The line under the signature. |
| Late letter fine | The small print under the form. |

**Site wide**

| Setting | What it does |
|---|---|
| Contact email | Puts a Contact link in the footer. Empty falls back to a Contact page if you have one. |
| Corrections email | Puts a Corrections link in the footer. Empty links to the corrections section of your editorial standards page. |

**Post**

| Setting | What it does |
|---|---|
| Show reading time | Reading time on stories and cards. |
| Show related reading | The three related stories at the foot of a story. |

Technology blue and Philosophy red are not settings. They are what the
sections mean, not decoration, and a colour picker would turn the
publication into a different one.

---

## 13. Dark mode

The theme follows the reader's system setting, and the control in the header
lets them override it. Their choice is remembered in their own browser and
is never sent anywhere. Nothing needs configuring.

---

## 14. What happens when something is missing

The theme is built to be used by people mid-sentence, so none of these look
broken:

- no posts at all, one post, two posts
- no featured post, or several
- no `#this-week` stories, or one, or nine
- a desk with nothing published yet
- a story with no picture, no excerpt, no type tag, or no tags at all
- a headline of two words, or of a hundred and forty characters
- an author with no picture and no bio
- no navigation configured
- pages you have not written yet

---

## 15. Updating

Releases follow the usual three numbers: a patch for fixes, a minor for new
capability, a major for a change that requires you to do something. Upload
the new zip, activate it, then delete the older entry from the theme list.
