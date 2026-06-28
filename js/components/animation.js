import { $$ } from '../utils/helpers.js';
import { SELECTORS, CLASSES, ANIMATION } from '../utils/constants.js';

export function initRevealAnimations() {
  const elements = $$(SELECTORS.revealElements);
  if (!elements.length) return;

  const observer = new IntersectionObserver(handleReveal, {
    threshold: ANIMATION.threshold,
    rootMargin: ANIMATION.rootMargin,
  });

  elements.forEach(el => observer.observe(el));
}

function handleReveal(entries, observer) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add(CLASSES.revealed);
      observer.unobserve(entry.target);
    }
  });
}

export function initParallax() {
  const elements = $$('[data-parallax]');
  if (!elements.length) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    elements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + scrollY) * speed;
      el.style.transform = `translateY(${scrollY * speed - offset}px)`;
    });
  });
}
