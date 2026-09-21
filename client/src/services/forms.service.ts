import { api } from '@/api/client';

export interface ContactPayload {
  name: string;
  phone?: string;
  email: string;
  subject?: string;
  message: string;
}

export interface QuotePayload {
  /** Slug of a catalogue product, when the request is about one. */
  productSlug?: string;
  productName: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  quantity: string;
  city?: string;
  message?: string;
}

/** The Turnstile token travels in a header, so the server can refuse a bot before reading a body or a file. */
const captchaHeaders = (captchaToken?: string | null) => (captchaToken ? { 'x-captcha-token': captchaToken } : {});

/** POST /api/contact — stored in PostgreSQL and surfaced in the admin dashboard. */
export async function submitContact(payload: ContactPayload, captchaToken?: string | null): Promise<void> {
  await api.post('/contact', payload, { headers: captchaHeaders(captchaToken) });
}

/** POST /api/quotes — a company asking for a price. */
export async function submitQuote(payload: QuotePayload, captchaToken?: string | null): Promise<void> {
  await api.post('/quotes', payload, { headers: captchaHeaders(captchaToken) });
}

/** POST /api/jobs/:id/apply (multipart). Use `general` as the id for a spontaneous application. */
export async function submitApplication(jobId: string, form: FormData, captchaToken?: string | null): Promise<void> {
  await api.post(`/jobs/${encodeURIComponent(jobId)}/apply`, form, {
    headers: { 'Content-Type': 'multipart/form-data', ...captchaHeaders(captchaToken) },
    timeout: 60_000,
  });
}
