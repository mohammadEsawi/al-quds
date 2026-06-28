import { $ } from '../utils/helpers.js';

export function initContactPage() {
  const form = $('.contact-form form');
  if (!form) return;

  form.addEventListener('submit', handleSubmit);
}

function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const fields = {
    name: form.querySelector('[name="name"]'),
    email: form.querySelector('[name="email"]'),
    phone: form.querySelector('[name="phone"]'),
    subject: form.querySelector('[name="subject"]'),
    message: form.querySelector('[name="message"]'),
  };

  clearErrors(form);

  if (!validate(fields)) return;

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري الإرسال...';

  setTimeout(() => {
    form.style.display = 'none';
    const success = $('.contact-form__success');
    if (success) success.classList.add('show');
    submitBtn.disabled = false;
    submitBtn.textContent = 'إرسال الرسالة';
  }, 1500);
}

function validate(fields) {
  let valid = true;

  if (!fields.name?.value.trim()) {
    showError(fields.name, 'يرجى إدخال اسمك');
    valid = false;
  }

  if (!fields.email?.value.trim() || !isEmail(fields.email.value)) {
    showError(fields.email, 'يرجى إدخال بريد إلكتروني صحيح');
    valid = false;
  }

  if (!fields.message?.value.trim()) {
    showError(fields.message, 'يرجى إدخال رسالتك');
    valid = false;
  }

  return valid;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function showError(input, message) {
  if (!input) return;
  input.classList.add('form-input--error');
  const error = document.createElement('span');
  error.className = 'form-error';
  error.textContent = message;
  input.parentElement.appendChild(error);
}

function clearErrors(form) {
  form.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
  form.querySelectorAll('.form-error').forEach(el => el.remove());
}
