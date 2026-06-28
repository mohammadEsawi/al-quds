export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1200,
  xxl: 1400,
};

export const ANIMATION = {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px',
};

export const SCROLL = {
  headerOffset: 80,
  throttleMs: 16,
};

export const SELECTORS = {
  header: '.header',
  nav: '.nav',
  navToggle: '.header__toggle',
  revealElements: '.reveal',
  counterElements: '[data-counter]',
  lazyImages: 'img[data-src]',
};

export const CLASSES = {
  scrolled: 'header--scrolled',
  navOpen: 'open',
  toggleActive: 'active',
  revealed: 'revealed',
  modalOpen: 'modal-open',
};

export const NAV_ITEMS = [
  { label: 'الرئيسية', href: '/index.html' },
  { label: 'من نحن', href: '/pages/about.html' },
  { label: 'المياه', href: '/pages/products.html' },
  { label: 'العقارات', href: '/pages/gallery.html' },
  { label: 'تواصل معنا', href: '/pages/contact.html' },
];
