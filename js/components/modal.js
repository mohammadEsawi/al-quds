import { $, $$ } from '../utils/helpers.js';
import { CLASSES } from '../utils/constants.js';

export function initModals() {
  $$('[data-modal-trigger]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const targetId = trigger.dataset.modalTrigger;
      openModal(targetId);
    });
  });
}

export function openModal(id) {
  const overlay = $(`#${id}`);
  if (!overlay) return;

  overlay.classList.add('open');
  document.body.classList.add(CLASSES.modalOpen);

  const closeBtn = $('.modal__close', overlay);
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal(id));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      closeModal(id);
      document.removeEventListener('keydown', handler);
    }
  });
}

export function closeModal(id) {
  const overlay = $(`#${id}`);
  if (!overlay) return;

  overlay.classList.remove('open');
  document.body.classList.remove(CLASSES.modalOpen);
}
