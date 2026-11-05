'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initScrollNav();
  initMobileNav();
  initActiveNav();
  initScrollAnimations();
  initHeroParticles();
  initProjectDialog();
  initLangSwitch();
  initFooterYear();
});

/* Theme is applied before first paint by an inline script in <head>.
   This only wires the button, keeps its label accurate, and syncs theme-color. */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  const sync = () => {
    const isDark = html.getAttribute('data-theme') !== 'light';
    btn.setAttribute('aria-label', isDark ? btn.dataset.labelLight : btn.dataset.labelDark);
    if (metaTheme) {
      const bg = getComputedStyle(html).getPropertyValue('--bg').trim();
      if (bg) metaTheme.setAttribute('content', bg);
    }
  };

  sync();

  btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
    sync();
  });
}

/* Hide the header when scrolling down, reveal it when scrolling up. */
function initScrollNav() {
  const nav = document.getElementById('site-nav');
  let lastY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (nav.classList.contains('nav-open')) return;

    const currentY = window.scrollY;
    if (currentY < 80 || currentY < lastY) {
      nav.classList.remove('nav--hidden');
    } else if (currentY > lastY) {
      nav.classList.add('nav--hidden');
    }
    lastY = currentY;
  }, { passive: true });

  // Keep the header visible while keyboard focus is inside it.
  nav.addEventListener('focusin', () => nav.classList.remove('nav--hidden'));
}

function initMobileNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const nav = document.getElementById('site-nav');

  const setOpen = (open) => {
    nav.classList.toggle('nav-open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  hamburger.addEventListener('click', () => setOpen(!nav.classList.contains('nav-open')));

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
      setOpen(false);
      hamburger.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('nav-open') && !nav.contains(e.target)) setOpen(false);
  });
}

/* Highlight the nav link of the section currently in view. */
function initActiveNav() {
  const links = new Map();
  document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
    links.set(a.getAttribute('href').slice(1), a);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const active = links.get(entry.target.id);
        if (active) active.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  document.querySelectorAll('main section[id]').forEach((s) => observer.observe(s));
}

/* Reveal .animate elements on scroll. Children of [data-stagger] get an
   index (--i) for a staggered delay. Once revealed, .animate is removed so it
   no longer overrides the element's own hover transitions. */
function initScrollAnimations() {
  document.querySelectorAll('[data-stagger]').forEach((parent) => {
    Array.from(parent.children).forEach((child, i) => child.style.setProperty('--i', i % 4));
  });

  const finish = (el) => {
    el.classList.remove('animate', 'visible');
    el.style.removeProperty('--i');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('visible');
        el.addEventListener('transitionend', function onEnd(e) {
          if (e.target !== el || e.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', onEnd);
          finish(el);
        });
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.animate').forEach((el) => observer.observe(el));
}

/* Pause the hero's CSS animations (embers, graph) when the hero is off-screen. */
function initHeroParticles() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const observer = new IntersectionObserver(([entry]) => {
    hero.classList.toggle('is-offscreen', !entry.isIntersecting);
  });
  observer.observe(hero);
}

/* Project details dialog: clicking a card "zooms" it into a <dialog> that
   shows the cover, description and the repository README. The README is
   fetched from the GitHub API already rendered as HTML (no markdown library),
   cleaned up, then cached for the rest of the visit. */
function initProjectDialog() {
  const dialog = document.getElementById('project-dialog');
  const triggers = document.querySelectorAll('.project-open');
  if (!dialog || !triggers.length) return;

  const panel    = dialog.querySelector('.pd-panel');
  const scroller = dialog.querySelector('.pd-scroll');
  const media    = dialog.querySelector('.pd-media');
  const img      = media.querySelector('img');
  const title    = dialog.querySelector('.pd-title');
  const desc     = dialog.querySelector('.pd-desc');
  const chips    = dialog.querySelector('.pd-chips');
  const github   = dialog.querySelector('.pd-github');
  const readme   = dialog.querySelector('.readme');
  const msg      = dialog.dataset;
  const cache    = new Map();
  let request    = 0;
  let closeTimer;

  // Very old browsers without <dialog>: fall back to opening the repository.
  if (typeof dialog.showModal !== 'function') {
    triggers.forEach((btn) => btn.addEventListener('click', () => {
      const link = btn.closest('.project-card').querySelector('.project-link');
      if (link) window.open(link.href, '_blank', 'noopener');
    }));
    return;
  }

  triggers.forEach((btn) => btn.addEventListener('click', () => open(btn.closest('.project-card'))));

  function open(card) {
    const heading = card.querySelector('.project-open').cloneNode(true);
    heading.querySelectorAll('.sr-only').forEach((el) => el.remove());
    title.textContent = heading.textContent.trim();
    desc.textContent = card.querySelector('p')?.textContent.trim() ?? '';
    const list = card.querySelector('.chip-list');
    chips.replaceChildren(...(list ? [list.cloneNode(true)] : []));

    const cover = card.querySelector('.project-media img');
    media.hidden = !cover;
    if (cover) img.src = cover.currentSrc || cover.src;

    const link = card.querySelector('.project-link');
    github.href = link ? link.href : 'https://github.com/';

    clearTimeout(closeTimer);
    dialog.showModal();
    scroller.scrollTop = 0;

    // Grow out of the clicked card: scale from the card's centre.
    const c = card.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    panel.style.transformOrigin =
      `${c.left + c.width / 2 - p.left}px ${c.top + c.height / 2 - p.top}px`;
    requestAnimationFrame(() => dialog.classList.add('is-open'));

    loadReadme(repoFrom(link?.href));
  }

  function close() {
    if (!dialog.open) return;
    if (!dialog.classList.contains('is-open')) { dialog.close(); return; }
    dialog.classList.remove('is-open');
    const done = () => {
      clearTimeout(closeTimer);
      panel.removeEventListener('transitionend', onEnd);
      if (dialog.open && !dialog.classList.contains('is-open')) dialog.close();
    };
    const onEnd = (e) => { if (e.target === panel && e.propertyName === 'transform') done(); };
    panel.addEventListener('transitionend', onEnd);
    closeTimer = setTimeout(done, 500); // fallback: reduced motion, interrupted transition
  }

  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Escape
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) close(); // backdrop or ✕
  });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('is-open');
    request++; // ignore a README that is still loading
  });

  // In-README anchor links (#section) scroll inside the dialog.
  readme.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const id = CSS.escape(decodeURIComponent(a.getAttribute('href').slice(1)));
    readme.querySelector(`[id="user-content-${id}"], [id="${id}"]`)?.scrollIntoView({ block: 'start' });
  });

  function status(text, loading = false) {
    const p = document.createElement('p');
    p.className = loading ? 'readme-status readme-status--loading' : 'readme-status';
    p.textContent = text;
    readme.replaceChildren(p);
  }

  async function loadReadme(repo) {
    const id = ++request;
    if (!repo) { status(msg.msgMissing); return; }

    let html = cache.get(repo);
    if (!html) {
      try { html = sessionStorage.getItem(`readme:${repo}`); } catch { /* storage blocked */ }
    }

    if (!html) {
      status(msg.msgLoading, true);
      readme.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/readme`, {
          headers: { Accept: 'application/vnd.github.html+json' },
        });
        if (id !== request) return;
        if (!res.ok) { status(res.status === 404 ? msg.msgMissing : msg.msgError); return; }
        html = await res.text();
        try { sessionStorage.setItem(`readme:${repo}`, html); } catch { /* quota or blocked */ }
      } catch {
        if (id === request) status(msg.msgError);
        return;
      } finally {
        readme.removeAttribute('aria-busy');
      }
    }

    if (id !== request) return;
    cache.set(repo, html);
    readme.replaceChildren(cleanReadme(html, repo));
  }
}

/* "https://github.com/owner/repo/…" → "owner/repo" */
function repoFrom(href) {
  try {
    const url = new URL(href);
    if (url.hostname !== 'github.com') return null;
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    return owner && repo ? `${owner}/${repo}` : null;
  } catch {
    return null;
  }
}

/* GitHub already sanitises rendered READMEs; this is a second line of defence.
   It also points relative links and images back at the repository. */
function cleanReadme(html, repo) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rawBase  = `https://raw.githubusercontent.com/${repo}/HEAD/`;
  const blobBase = `https://github.com/${repo}/blob/HEAD/`;

  // Heading permalinks carry the anchor id; move it to the heading, drop the link.
  doc.querySelectorAll('a.anchor').forEach((a) => {
    const heading = a.parentElement?.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading && a.id && !heading.id) heading.id = a.id;
    a.remove();
  });

  doc.querySelectorAll('script, style, link, meta, base, iframe, frame, object, embed, form, input, button, textarea, select, .octicon')
    .forEach((el) => el.remove());

  const resolve = (value, base) => {
    try {
      // "/docs/x.png" is relative to the repository root, not the host.
      const url = new URL(value.replace(/^\/(?!\/)/, ''), base);
      return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach(({ name }) => {
      if (name.startsWith('on') || name === 'formaction') el.removeAttribute(name);
    });
  });

  doc.querySelectorAll('img').forEach((im) => {
    const src = resolve(im.getAttribute('src') || '', rawBase);
    if (!src) { im.remove(); return; }
    im.setAttribute('src', src);
    im.setAttribute('loading', 'lazy');
    im.setAttribute('decoding', 'async');
  });

  doc.querySelectorAll('source[srcset]').forEach((s) => {
    s.setAttribute('srcset', s.getAttribute('srcset').split(',').map((part) => {
      const [u, ...rest] = part.trim().split(/\s+/);
      return [resolve(u, rawBase) ?? '', ...rest].join(' ');
    }).join(', '));
  });

  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href.startsWith('#')) return;
    const abs = resolve(href, blobBase);
    if (!abs) { a.removeAttribute('href'); return; }
    a.setAttribute('href', abs);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });

  const frag = document.createDocumentFragment();
  frag.append(...doc.body.childNodes);
  return frag;
}

/* Keep the current #section when switching language. */
function initLangSwitch() {
  document.querySelectorAll('.lang-switch a:not([aria-current])').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (!location.hash) return;
      e.preventDefault();
      window.location.href = link.getAttribute('href') + location.hash;
    });
  });
}

function initFooterYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = year; });
}
