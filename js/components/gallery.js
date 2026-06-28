import { $, $$ } from '../utils/helpers.js';
import { CLASSES } from '../utils/constants.js';

export function initGallery() {
  const items = $$('.gallery__item');
  const filters = $$('.gallery__filter-btn');

  if (!items.length) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.filter;
      filterItems(items, category);
      setActiveFilter(filters, btn);
    });
  });

  items.forEach(item => {
    item.addEventListener('click', () => openLightbox(item));
  });
}

function filterItems(items, category) {
  items.forEach(item => {
    const match = category === 'all' || item.dataset.category === category;
    item.style.display = match ? '' : 'none';
    if (match) {
      item.style.opacity = '0';
      item.style.transform = 'scale(0.9)';
      requestAnimationFrame(() => {
        item.style.transition = 'opacity 0.4s, transform 0.4s';
        item.style.opacity = '1';
        item.style.transform = 'scale(1)';
      });
    }
  });
}

function setActiveFilter(filters, activeBtn) {
  filters.forEach(btn => btn.classList.remove('gallery__filter-btn--active'));
  activeBtn.classList.add('gallery__filter-btn--active');
}

function openLightbox(item) {
  const img = item.querySelector('img');
  if (!img) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal--lightbox open';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal__close" aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="modal__body">
        <img src="${img.src}" alt="${img.alt || ''}" loading="lazy">
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add(CLASSES.modalOpen);

  const close = () => {
    overlay.classList.remove('open');
    document.body.classList.remove(CLASSES.modalOpen);
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('.modal__close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handler);
    }
  });
}
