# The Late City — local test kit (Windows)

Runs a throwaway Ghost 6 in Docker, installs the theme, fills it with the
content the theme has to survive, then measures the result and writes a
report you can send back.

Everything here is disposable. It touches nothing on your live site.

---

## Before you start

**Docker Desktop** — https://docs.docker.com/desktop/install/windows-install/
Install it, launch it, and leave it running. The whale icon in the system
tray must be steady, not animating. Docker Desktop wants WSL2; its installer
turns it on and will ask for one reboot.

**Node.js 20 or newer** — https://nodejs.org (take the LTS installer)
Only needed for the two scripts. Check it with `node -v`.

Use **PowerShell** for everything below (Start → type `powershell`).
Unzip this kit somewhere sane, e.g. `C:\Users\you\latecity-test`. The theme
zip (`the-late-city-1.0.9.zip`) is already inside it; drop a newer build in
the same folder whenever there is one.

(Working from the repository instead? The kit lives in `test-kit/`, and the
theme zip is whatever you get by zipping the *contents* of `the-late-city/`
— the files at the root of the archive, not the folder itself.)

---

## Step 1 — start Ghost

```powershell
cd C:\Users\you\latecity-test
docker compose up -d
```

First run pulls about 500 MB and takes a few minutes. Watch it boot:

```powershell
docker compose logs -f ghost
```

Wait for a line saying Ghost is listening on port 2368, then press `Ctrl+C`
(that stops the log tail, not Ghost). Open http://localhost:2368/ — you
should see Ghost's default Casper theme. Leave the browser open.

## Step 2 — install the theme and the content

```powershell
npm install
node seed.mjs --theme .\the-late-city-1.0.9.zip
```

This creates the owner account, uploads and activates the theme, uploads
three images, and publishes eight posts and a page. It prints what it did.

The account it creates:

| | |
|---|---|
| Admin | http://localhost:2368/ghost/ |
| Email | `owner@thelatecity.test` |
| Password | `LateCity2026!` |

Now look at http://localhost:2368/ — the theme, with real content in it.

The fixtures are chosen to catch the things that break:

- **The Rules of the House** — four sections, wide image card, pull quote,
  ordinary quote, list, table, reporting note, correction, drop cap.
- **Every card the editor can reach** — full width, wide, gallery, bookmark,
  callout, button, code block, horizontal rule.
- **The machine that files the paperwork** — a short opening (raised cap)
  and exactly one subhead (which must *not* be numbered).
- **A story that opens on a heading** — no opening paragraph at all.
- **Editorial standards** — a page, so the contents column appears.

## Step 3 — run the audit

```powershell
npx playwright install chromium
node audit.mjs
```

It loads 11 URLs at 1440, 1024 and 390 pixels wide, measures each one, and
writes:

```
out\report.md      what it found, in English
out\report.json    the raw numbers
out\shots\*.png    34 screenshots
```

It checks the page never scrolls sideways, that the reading column and the
breakout cards are centred, how many characters land on a line, which
heading gets a section number and which does not, that a reporting note is
never numbered as a section, and that the webfonts actually loaded.

## Step 4 — send it back

Right-click the `out` folder → **Send to → Compressed (zipped) folder**, and
send me `out.zip`. `report.md` alone is useful if the zip is awkward.

---

## Everyday commands

| | |
|---|---|
| Stop Ghost, keep the content | `docker compose down` |
| Start it again | `docker compose up -d` |
| Wipe it and start clean | `docker compose down -v` then Step 1 |
| Re-seed after a wipe | `node seed.mjs --theme .\the-late-city-1.0.9.zip` |
| Try a new theme build | `node seed.mjs --theme .\whatever.zip` (content is left alone) |
| See what Ghost is doing | `docker compose logs -f ghost` |

Re-running `seed.mjs` updates the posts it made before rather than making
duplicates, so it is safe to run as often as you like.

## When something goes wrong

**`docker: command not found` / `error during connect`** — Docker Desktop
is not running. Launch it and wait for the tray icon to settle.

**Port 2368 already in use** — something else has it. Either stop that, or
edit `docker-compose.yml` and change `"2368:2368"` to `"3368:2368"`, then run
the scripts with `$env:GHOST_URL="http://localhost:3368"` set first.

**`could not sign in`** — you created the owner yourself in the browser with
different details. Tell the scripts:
```powershell
$env:GHOST_EMAIL="you@example.com"; $env:GHOST_PASSWORD="your password"
node seed.mjs
```

**Ghost's password rule** — minimum 10 characters, and it rejects anything
that looks like the site name.

**`ghost:6-alpine` not found** — use `ghost:alpine` in `docker-compose.yml`.

**The report says the webfonts did not load** — the machine could not reach
fonts.googleapis.com (VPN, firewall, offline). The layout numbers are still
valid; the type will look wrong in the screenshots.

**Nothing renders and the log mentions permissions** — you changed the
volume to a Windows folder. Keep the named volume: Ghost cannot chown a
bind-mounted Windows directory.
