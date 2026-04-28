'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initScrollNav();
  initScrollAnimations();
  initMobileNav();
});

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  const html = document.documentElement;

  const saved = localStorage.getItem('theme');
  if (saved) html.setAttribute('data-theme', saved);

  btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

function initScrollNav() {
  const nav = document.getElementById('site-nav');
  let lastY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (nav.classList.contains('nav-open')) return;

    const currentY = window.scrollY;
    if (currentY < 80) {
      nav.classList.remove('nav--hidden');
    } else if (currentY > lastY) {
      nav.classList.add('nav--hidden');
    } else {
      nav.classList.remove('nav--hidden');
    }
    lastY = currentY;
  }, { passive: true });
}

function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.animate').forEach((el) => observer.observe(el));
}

function initMobileNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const nav = document.getElementById('site-nav');

  hamburger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}
