import { $ } from '../utils/helpers.js';

export function initContactPage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('sent') === 'true') {
    const form = $('.contact-form form');
    const success = $('.contact-form__success');
    if (form) form.style.display = 'none';
    if (success) success.classList.add('show');
    $('.contact-form__title')?.remove();
    $('.contact-form__subtitle')?.remove();
  }
}
