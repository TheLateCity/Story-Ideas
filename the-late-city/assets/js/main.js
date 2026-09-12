/* ============================================================
   THE LATE CITY

   Everything here is an enhancement. Ghost renders the publication;
   this file only adds behaviour that cannot be expressed in markup:

     1  theme            light and dark, remembered
     2  dock             the compact bar that replaces the header
     3  navigation       the mobile menu
     4  progress         the reading line, on stories only
     5  contents         a table of contents for long documents
     6  folios           index numbers continued across pages
     7  opening letter   the red cap, and the stop that closes a story
     8  halftones        the decorative screen behind a story with
                         no picture of its own
     9  scrollers        a table or a code block the keyboard can
                         reach

   With JavaScript switched off the site loses none of its content
   and none of its navigation.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------------------------------------------------------
     ONE SCROLL PIPELINE
     The dock and the reading line are the only things that care
     where the page is. They share a single passive listener and a
     single frame, so scrolling never schedules two of anything and
     never reads layout twice.
     --------------------------------------------------------- */
  var onScrollTasks = [];
  var scrollQueued = false;

  function runScrollTasks() {
    scrollQueued = false;
    for (var i = 0; i < onScrollTasks.length; i++) onScrollTasks[i]();
  }

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(runScrollTasks);
    else runScrollTasks();
  }

  function whenScrolled(task) {
    if (!onScrollTasks.length) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    onScrollTasks.push(task);
    task();
  }

  /* ---------------------------------------------------------
     ONE RESIZE PIPELINE
     Four separate listeners were reading layout on the same
     event. Now there is one, in two lanes: what has to be right
     immediately, and what can wait for the drag or the rotation
     to finish. Rotation is included, because iOS does not always
     fire a resize for it.
     --------------------------------------------------------- */
  var onResizeTasks = [];
  var onSettledTasks = [];
  var settleTimer;

  function runResize() {
    for (var i = 0; i < onResizeTasks.length; i++) onResizeTasks[i]();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () {
      for (var j = 0; j < onSettledTasks.length; j++) onSettledTasks[j]();
    }, 220);
  }

  window.addEventListener('resize', runResize);
  window.addEventListener('orientationchange', runResize);

  function whenResized(task, settled) {
    (settled ? onSettledTasks : onResizeTasks).push(task);
  }

  /* ---------------------------------------------------------
     1. THEME
     The choice is applied before first paint by a small inline
     script in the head, so a dark reader never sees a white flash.
     This only keeps the controls in step with it.
     --------------------------------------------------------- */
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-lc-theme-toggle]'));

  function systemDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function isDark() {
    var set = root.getAttribute('data-theme');
    if (set === 'dark') return true;
    if (set === 'light') return false;
    return systemDark();
  }

  /* Every control, wherever it lives, says the same thing about the
     same state: one of them reading Light while the other reads Dark
     is not possible, because they are all written from one answer. */
  function syncTheme(repaint) {
    var dark = isDark();
    toggles.forEach(function (button) {
      var label = button.querySelector('[data-lc-theme-label]');
      if (label) label.textContent = dark ? 'Light' : 'Dark';
      button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    });
    /* Only on a real change of theme. Repainting during load would put
       decorative canvas work in front of the headline the reader came
       for, and the observer paints what is on screen anyway. */
    if (repaint) repaintVisible();
  }

  toggles.forEach(function (button) {
    button.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('lc-theme', next); } catch (e) {}
      syncTheme(true);
    });
  });

  if (window.matchMedia) {
    var query = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function () { if (!root.hasAttribute('data-theme')) syncTheme(true); };
    if (query.addEventListener) query.addEventListener('change', onSystemChange);
    else if (query.addListener) query.addListener(onSystemChange);
  }

  /* ---------------------------------------------------------
     2. DOCK
     The dock is the navigation, compacted. It takes over at the
     moment the real navigation leaves the top of the screen, and
     never stands beside it.

     The test is one sided: the navigation must have passed ABOVE
     the viewport, not merely be out of view. Those are different
     states, and conflating them is what put the dock on top of a
     live masthead. On a phone the header is taller than the screen,
     so a line drawn after it is below the fold while the reader is
     still at the very top, and "below" was read as "scrolled past".

     Watching the navigation rather than the whole header also means
     the publication is never without a theme control: the header
     surrenders it at exactly the moment the dock picks it up. There
     is no window in between where neither is on screen.

     It costs nothing per scrolled pixel and does not depend on any
     height, all of which change with rotation, font loading, the
     wrapping of the masthead note and the open state of the menu.
     --------------------------------------------------------- */
  var dock = document.querySelector('[data-lc-dock]');
  var handover = document.querySelector('[data-lc-dock-after]');
  var menuIsOpen = false;

  function navHasGone() {
    return handover ? handover.getBoundingClientRect().bottom <= 0 : false;
  }

  var dockShown = null;
  var closeTheMenu = null;

  function setDock(on) {
    /* If the reader scrolls the navigation off the screen while it is
       open, the menu has gone with it and suppressing the dock would
       leave the publication with no control at all. The menu gives way
       and the dock takes over, which is the same handover as always. */
    if (on && menuIsOpen && closeTheMenu) closeTheMenu();

    /* One attribute on the dock and one on the root, and only when the
       answer has actually changed. Nothing walks the story list. */
    if (dockShown === (on && !menuIsOpen)) return;
    /* The dock and the header never both offer a control. While the
       menu is open the dock stands down entirely, so an expanded
       navigation is never argued with by a second header. */
    var show = on && !menuIsOpen;
    dockShown = show;
    dock.classList.toggle('is-on', show);
    /* Read back off the root so CSS can retire the header's own
       control while the dock is carrying one. A DIFFERENT attribute
       name from the dock's own: reusing data-lc-dock put it on <html>
       too, and querySelector('[data-lc-dock]') then answered with the
       document element instead of the dock. */
    root.setAttribute('data-lc-dock-state', show ? 'on' : 'off');
  }

  if (dock && handover) {
    if ('IntersectionObserver' in window) {
      /* bottom <= 0 is true only above the viewport, never below it.
         The navigation starts on screen, so a jump of any size still
         changes whether it intersects and the callback still arrives:
         a one pixel line placed after the header could be skipped
         clean over by a fast scroll or a restored scroll position, and
         then no threshold was ever crossed and the dock stayed down
         for the whole article. */
      new IntersectionObserver(function (entries) {
        setDock(entries[0].boundingClientRect.bottom <= 0);
      }, { threshold: 0 }).observe(handover);
    } else {
      /* Without an observer the dock would simply never arrive. One
         rect read per frame while the finger is moving, and the class
         is only touched when the answer actually changes. */
      whenScrolled(function () { setDock(navHasGone()); });
    }

    /* iOS grows and shrinks the usable viewport as its toolbars
       collapse, and rotation changes the header's height outright.
       Neither necessarily crosses an observer threshold, so the
       state is re-read once after each, not on every scroll. */
    var recheck = function () { setDock(navHasGone()); };
    whenResized(recheck);
    recheck();
  }

  /* ---------------------------------------------------------
     3. NAVIGATION
     --------------------------------------------------------- */
  var nav = document.querySelector('[data-lc-nav]');
  var navButton = document.querySelector('[data-lc-nav-toggle]');

  if (nav && navButton) {
    /* The menu and the dock are two headers. Only one of them is ever
       the header, so opening the menu stands the dock down and closing
       it hands the decision back to the header's own position. */
    var setMenu = function (open) {
      menuIsOpen = open;
      nav.classList.toggle('is-open', open);
      navButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      root.setAttribute('data-lc-menu', open ? 'open' : 'closed');
      if (dock) setDock(navHasGone());
    };

    var closeMenu = function (focusButton) {
      setMenu(false);
      if (focusButton) navButton.focus();
    };

    /* the dock reaches back for this when the menu scrolls away */
    closeTheMenu = function () { setMenu(false); };

    navButton.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(event.target)) closeMenu(false);
    });

    whenResized(function () {
      if (window.innerWidth > 760) closeMenu(false);
    });
  }

  /* ---------------------------------------------------------
     3b. ONE SUBSCRIPTION AT A TIME
     Ghost marks the form .loading while a request is in flight and
     the stylesheet takes the button out of reach, which stops a
     second tap. It does not stop a second Return in the field, and
     Ghost's own handler does not guard either: three presses sent
     three requests.

     Registered on the capture phase deliberately. Ghost's handler is
     attached to the form and may be attached before this file runs,
     and a later listener cannot stop an earlier one on the same
     target. Capture runs first whatever the order.
     --------------------------------------------------------- */
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form && form.classList && form.classList.contains('loading')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  /* ---------------------------------------------------------
     4. READING PROGRESS
     Measured against the article itself. Measuring the document
     counts the footer and the newsletter as reading, which tells
     the reader they have further to go than they have.
     --------------------------------------------------------- */
  var progress = document.querySelector('[data-lc-progress]');
  var progressBar = progress ? progress.querySelector('i') : null;
  var article = document.querySelector('[data-lc-reading-region]');

  if (progress && progressBar && article) {
    var top = 0;
    var height = 1;

    var measure = function () {
      var box = article.getBoundingClientRect();
      top = box.top + window.pageYOffset;
      height = article.offsetHeight;
    };

    var shown = '';
    var update = function () {
      var seen = window.pageYOffset + window.innerHeight - top;
      var ratio = height > 0 ? seen / height : 0;
      var width = (Math.min(1, Math.max(0, ratio)) * 100).toFixed(1) + '%';
      /* the style is only written when the number has actually moved,
         so a frame that changed nothing costs nothing */
      if (width !== shown) {
        shown = width;
        progressBar.style.width = width;
      }
    };

    measure();
    whenScrolled(update);
    whenResized(function () { measure(); update(); });
  }

  /* ---------------------------------------------------------
     5. CONTENTS
     Built from the document's own headings and their Ghost
     generated ids. Too few headings and the column would be
     decoration, so the page stays in one column.
     --------------------------------------------------------- */
  var docLayout = document.querySelector('[data-lc-doc]');
  var docMain = document.querySelector('[data-lc-doc-main]');
  var tocList = document.querySelector('[data-lc-toc]');

  if (docLayout && docMain && tocList) {
    var headings = Array.prototype.slice.call(docMain.querySelectorAll(':scope > h2'));

    if (headings.length >= 3) {
      headings.forEach(function (heading, index) {
        if (!heading.id) heading.id = 'section-' + (index + 1);
        var link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        tocList.appendChild(link);
      });
      docLayout.classList.remove('lc-no-toc');

      if ('IntersectionObserver' in window) {
        var links = Array.prototype.slice.call(tocList.querySelectorAll('a'));
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (link) {
              link.classList.toggle('is-current', link.getAttribute('href') === '#' + entry.target.id);
            });
          });
        }, { rootMargin: '-10% 0px -70% 0px' });
        headings.forEach(function (heading) { spy.observe(heading); });
      }
    }
  }

  /* ---------------------------------------------------------
     6. FOLIOS
     An index numbers continuously across its pages. Ghost has no
     arithmetic helper, so page one is correct in the markup, which
     is the case that matters, and the later pages are continued
     here. The numbers are decoration: nothing depends on them.
     --------------------------------------------------------- */
  var folioList = document.querySelector('[data-lc-folios]');

  if (folioList) {
    var page = parseInt(folioList.getAttribute('data-page'), 10) || 1;
    var perPage = parseInt(folioList.getAttribute('data-limit'), 10) || 0;
    if (page > 1 && perPage > 0) {
      folioList.style.counterReset = 'lc-folio ' + ((page - 1) * perPage);
    }
  }

  /* ---------------------------------------------------------
     7. THE OPENING LETTER AND THE CLOSING STOP
     A story opens on the publication's red and closes on it.

     The cap is only ever applied to a real opening paragraph,
     never to a card, and a paragraph too short to wrap around a
     sunk cap gets a raised one instead, so every story still
     opens on the mark.
     --------------------------------------------------------- */
  var prose = document.querySelector('[data-lc-prose]');

  if (prose) {
    var first = prose.firstElementChild;
    if (first && first.tagName === 'P' && !first.className) {
      var opening = (first.textContent || '').trim();
      if (opening.length) {
        first.classList.add(opening.length < 90 ? 'lc-cap-raise' : 'lc-cap');
      }
    }

    /* The closing stop wraps one existing full stop in a span. It
       splits a text node and changes no markup, so links, code,
       footnotes and cards are all untouched. Anything that is not
       a plain paragraph ending in a plain full stop is left alone. */
    var blocks = prose.children;
    var last = blocks.length ? blocks[blocks.length - 1] : null;
    if (last && last.tagName === 'P' && !last.className) {
      var tail = last.lastChild;
      if (tail && tail.nodeType === 3 && /\.$/.test(tail.nodeValue)) {
        var stop = document.createElement('span');
        stop.className = 'lc-stop';
        stop.textContent = '.';
        tail.nodeValue = tail.nodeValue.slice(0, -1);
        last.appendChild(stop);
      }
    }
  }

  /* ---------------------------------------------------------
     8. HALFTONES
     A story without a picture still gets a picture box, screened
     at 45 degrees, the angle used for the black plate in offset
     printing. It is decoration, seeded from the post so it never
     changes under a reader, and it is never presented as a
     photograph of anything.

     Painted only when it comes into view, cached by seed, size
     and ink, and capped so a long archive cannot grow without
     limit.
     --------------------------------------------------------- */
  var CACHE = new Map();
  var CACHE_MAX = 36;
  var SIN45 = Math.SQRT1_2;
  var COS45 = Math.SQRT1_2;

  function seedFrom(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function rng(seed) {
    var state = seed >>> 0 || 1;
    return function () {
      state ^= state << 13; state >>>= 0;
      state ^= state >> 17;
      state ^= state << 5; state >>>= 0;
      return state / 4294967296;
    };
  }

  function plateSource(width, height, seed) {
    var off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    var ctx = off.getContext('2d');
    var rand = rng(seed);

    var sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0.00, '#000000');
    sky.addColorStop(0.34, '#161616');
    sky.addColorStop(0.62, '#5e5e5e');
    sky.addColorStop(0.82, '#b4b4b4');
    sky.addColorStop(1.00, '#5a5a5a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    var glow = ctx.createRadialGradient(width * 0.66, height * 0.9, 0, width * 0.66, height * 0.9, height * 0.92);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(0.55, 'rgba(255,255,255,0.14)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    /* capped so every seed keeps roughly the top third as open sky,
       otherwise the skyline fills the frame and reads as noise */
    var ranks = [
      { base: height * 0.985, min: height * 0.20, max: height * 0.40, wMin: width * 0.032, wMax: width * 0.080, ink: '#2f2f2f', lit: 0.24 },
      { base: height * 1.000, min: height * 0.28, max: height * 0.56, wMin: width * 0.048, wMax: width * 0.110, ink: '#131313', lit: 0.30 },
      { base: height * 1.020, min: height * 0.16, max: height * 0.36, wMin: width * 0.060, wMax: width * 0.145, ink: '#020202', lit: 0.18 }
    ];

    ranks.forEach(function (rank) {
      var x = -width * 0.05;
      while (x < width) {
        var blockWidth = rank.wMin + rand() * (rank.wMax - rank.wMin);
        var blockHeight = rank.min + rand() * (rank.max - rank.min);
        var topEdge = rank.base - blockHeight;
        ctx.fillStyle = rank.ink;
        ctx.fillRect(Math.round(x), Math.round(topEdge), Math.round(blockWidth), Math.round(rank.base - topEdge));

        if (blockHeight > rank.max * 0.8 && rand() > 0.5) {
          ctx.fillRect(
            Math.round(x + blockWidth * 0.44), Math.round(topEdge - height * 0.045),
            Math.max(1, Math.round(blockWidth * 0.11)), Math.round(height * 0.045)
          );
        }

        var cols = Math.max(2, Math.floor(blockWidth / (width * 0.020)));
        var rows = Math.max(3, Math.floor(blockHeight / (height * 0.048)));
        var padX = blockWidth * 0.15;
        var padY = height * 0.013;
        var cellW = (blockWidth - padX * 2) / cols;
        var cellH = (blockHeight - padY * 2) / rows;
        for (var cy = 0; cy < rows; cy++) {
          for (var cx = 0; cx < cols; cx++) {
            if (rand() > rank.lit) continue;
            ctx.fillStyle = 'rgba(255,253,244,' + (0.62 + rand() * 0.38).toFixed(2) + ')';
            ctx.fillRect(
              x + padX + cx * cellW, topEdge + padY + cy * cellH,
              Math.max(1, cellW * 0.55), Math.max(1, cellH * 0.44)
            );
          }
        }
        x += blockWidth + width * 0.007;
      }
    });

    return ctx.getImageData(0, 0, width, height).data;
  }

  function screened(seed, width, height, colour, step, positive) {
    var key = seed + '|' + width + '|' + height + '|' + colour + '|' + step + '|' + positive;
    if (CACHE.has(key)) return CACHE.get(key);

    var out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    var ctx = out.getContext('2d');

    var sourceW = Math.max(160, Math.min(620, Math.round(width * 0.55)));
    var sourceH = Math.max(120, Math.round(sourceW * (height / width)));
    var pixels = plateSource(sourceW, sourceH, seed);

    ctx.fillStyle = colour;
    var maxR = step * 0.68;
    var diagonal = Math.hypot(width, height);
    var centreX = width / 2;
    var centreY = height / 2;

    for (var v = -diagonal / 2; v < diagonal / 2; v += step) {
      for (var u = -diagonal / 2; u < diagonal / 2; u += step) {
        var x = centreX + u * COS45 - v * SIN45;
        var y = centreY + u * SIN45 + v * COS45;
        if (x < -step || y < -step || x > width + step || y > height + step) continue;
        var sx = Math.min(sourceW - 1, Math.max(0, Math.round(x / width * sourceW)));
        var sy = Math.min(sourceH - 1, Math.max(0, Math.round(y / height * sourceH)));
        var i = (sy * sourceW + sx) * 4;
        var lum = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
        /* light ink on the black plate prints a negative; dark ink on
           paper must print a positive or the image reads inverted */
        var tone = positive ? 1 - lum : lum;
        var radius = Math.sqrt(Math.pow(tone, positive ? 1.85 : 1.35)) * maxR;
        if (radius < 0.32) continue;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 6.28318);
        ctx.fill();
      }
    }

    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(key, out);
    return out;
  }

  function paint(canvas) {
    var cssWidth = canvas.clientWidth;
    if (!cssWidth) return;

    var ratioParts = (canvas.getAttribute('data-ratio') || '3/2').split('/');
    var ratio = (parseFloat(ratioParts[0]) || 3) / (parseFloat(ratioParts[1]) || 2);
    var colour = getComputedStyle(canvas).color;
    var bucket = Math.max(160, Math.round(cssWidth / 40) * 40);
    var positive = !canvas.closest('.lc-plate');
    var stamp = bucket + '|' + colour + '|' + (positive ? 'p' : 'n');
    if (canvas.getAttribute('data-stamp') === stamp) return;

    /* A phone reports a device pixel ratio of 3. Painting a decorative
       screen at 3x costs nine times the pixels of 1x for a picture
       that is deliberately coarse: the dots are the point, and beyond
       about 1.5x nobody can tell. This is the difference between a
       smooth scroll and a stuttering one on a mid range handset. */
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var pixelW = Math.round(bucket * dpr);
    var pixelH = Math.round((bucket / ratio) * dpr);
    /* a small reproduction needs a finer screen or it reads as static:
       hold roughly 115 dots across the image at any size */
    var step = Math.max(2.3, Math.min(5.2, bucket / 115)) * dpr;
    var seed = seedFrom(canvas.getAttribute('data-lc-halftone') || 'the late city');

    canvas.width = pixelW;
    canvas.height = pixelH;
    canvas.getContext('2d').drawImage(screened(seed, pixelW, pixelH, colour, step, positive), 0, 0);
    canvas.setAttribute('data-stamp', stamp);
  }

  var canvases = function () {
    return Array.prototype.slice.call(document.querySelectorAll('canvas[data-lc-halftone]'));
  };

  var observer = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) paint(entry.target); });
      }, { rootMargin: '300px 0px' })
    : null;

  function repaintVisible() {
    canvases().forEach(function (canvas) {
      var box = canvas.getBoundingClientRect();
      if (box.bottom > -400 && box.top < window.innerHeight + 400) paint(canvas);
      else canvas.setAttribute('data-stamp', '');
    });
  }

  canvases().forEach(function (canvas) {
    if (observer) observer.observe(canvas);
    else paint(canvas);
  });

  whenResized(repaintVisible, true);

  /* ---------------------------------------------------------
     9. A SCROLLER THE KEYBOARD CAN REACH
     A table or a code block wider than the column scrolls inside
     itself, or inside the lc-table wrapper the manual gives for a
     captioned table, which is right, and a reader using only a keyboard
     then has no way to scroll it: a region that scrolls has to be
     able to take focus. Only the ones that actually overflow, and
     only the ones marked here are ever unmarked again, so an
     editor's own tabindex is left alone.
     --------------------------------------------------------- */
  var readingRegion = document.querySelector('[data-lc-prose], [data-lc-doc-main]');

  function markScrollers() {
    if (!readingRegion) return;
    Array.prototype.forEach.call(readingRegion.querySelectorAll('pre, table, .lc-table'), function (el) {
      var scrolls = el.scrollWidth > el.clientWidth + 1;
      if (scrolls && !el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('data-lc-scroller', '');
      } else if (!scrolls && el.hasAttribute('data-lc-scroller')) {
        el.removeAttribute('tabindex');
        el.removeAttribute('data-lc-scroller');
      }
    });
  }

  markScrollers();
  whenResized(markScrollers, true);

  syncTheme(false);
})();
