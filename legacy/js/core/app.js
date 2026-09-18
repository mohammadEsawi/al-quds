import { onReady } from '../utils/helpers.js';
import { initNavbar } from '../components/navbar.js';
import { initRevealAnimations, initParallax } from '../components/animation.js';
import { initCounters } from '../components/counter.js';
import { initModals } from '../components/modal.js';
import { initPageModule } from './router.js';

function boot() {
  initNavbar();
  initRevealAnimations();
  initParallax();
  initCounters();
  initModals();
  initPageModule();
  initLazyImages();
  initSmoothScroll();
}

function initLazyImages() {
  const images = document.querySelectorAll('img[data-src]');
  if (!images.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.removeAttribute('data-src');
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  images.forEach(img => observer.observe(img));
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

onReady(boot);
