import { initSlider } from '../components/slider.js';

export function initHomePage() {
  initSlider('.testimonials__slider', {
    autoplay: true,
    interval: 6000,
  });
}
