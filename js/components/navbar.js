import { $, $$, throttle } from '../utils/helpers.js';
import { SELECTORS, CLASSES, SCROLL } from '../utils/constants.js';

export function initNavbar() {
  const header = $(SELECTORS.header);
  const nav = $(SELECTORS.nav);
  const toggle = $(SELECTORS.navToggle);

  if (!header) return;

  handleScroll(header);
  window.addEventListener('scroll', throttle(() => handleScroll(header), SCROLL.throttleMs));

  if (toggle && nav) {
    toggle.addEventListener('click', () => toggleMenu(toggle, nav));

    $$(`.nav__link`, nav).forEach(link => {
      link.addEventListener('click', () => closeMenu(toggle, nav));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains(CLASSES.navOpen)) {
        closeMenu(toggle, nav);
      }
    });
  }

  highlightActiveLink();
}

function handleScroll(header) {
  if (window.scrollY > 50) {
    header.classList.add(CLASSES.scrolled);
  } else {
    header.classList.remove(CLASSES.scrolled);
  }
}

function toggleMenu(toggle, nav) {
  const isOpen = nav.classList.contains(CLASSES.navOpen);
  if (isOpen) {
    closeMenu(toggle, nav);
  } else {
    openMenu(toggle, nav);
  }
}

function openMenu(toggle, nav) {
  toggle.classList.add(CLASSES.toggleActive);
  nav.classList.add(CLASSES.navOpen);
  document.body.style.overflow = 'hidden';
}

function closeMenu(toggle, nav) {
  toggle.classList.remove(CLASSES.toggleActive);
  nav.classList.remove(CLASSES.navOpen);
  document.body.style.overflow = '';
}

function highlightActiveLink() {
  const path = window.location.pathname;
  $$('.nav__link').forEach(link => {
    link.classList.remove('nav__link--active');
    const href = link.getAttribute('href');
    if (
      (href === '/index.html' && (path === '/' || path.endsWith('index.html'))) ||
      (href !== '/index.html' && path.includes(href))
    ) {
      link.classList.add('nav__link--active');
    }
  });
}
