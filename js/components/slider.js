import { $, $$ } from '../utils/helpers.js';

export function initSlider(containerSelector, options = {}) {
  const container = $(containerSelector);
  if (!container) return null;

  const track = $('.slider__track', container);
  const slides = $$('.slider__slide', container);
  const dots = $$('.slider__dot', container);
  const prevBtn = $('.slider__arrow--prev', container);
  const nextBtn = $('.slider__arrow--next', container);

  if (!track || slides.length === 0) return null;

  const config = {
    autoplay: options.autoplay ?? true,
    interval: options.interval ?? 5000,
    loop: options.loop ?? true,
  };

  let current = 0;
  let autoplayTimer = null;

  function goTo(index) {
    if (config.loop) {
      current = (index + slides.length) % slides.length;
    } else {
      current = Math.max(0, Math.min(index, slides.length - 1));
    }

    track.style.transform = `translateX(-${current * 100}%)`;
    updateDots();
  }

  function next() {
    goTo(current + 1);
  }

  function prev() {
    goTo(current - 1);
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('slider__dot--active', i === current);
    });
  }

  function startAutoplay() {
    if (!config.autoplay) return;
    stopAutoplay();
    autoplayTimer = setInterval(next, config.interval);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAutoplay(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAutoplay(); });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startAutoplay(); });
  });

  container.addEventListener('mouseenter', stopAutoplay);
  container.addEventListener('mouseleave', startAutoplay);

  updateDots();
  startAutoplay();

  return { goTo, next, prev, destroy: stopAutoplay };
}
