import { api } from '@/api/client';

export interface ContactPayload {
  name: string;
  phone?: string;
  email: string;
  subject?: string;
  message: string;
}

/** POST /api/contact — stored in PostgreSQL and surfaced in the admin dashboard. */
export async function submitContact(payload: ContactPayload): Promise<void> {
  await api.post('/contact', payload);
}

/** POST /api/jobs/:id/apply (multipart). Use `general` as the id for a spontaneous application. */
export async function submitApplication(jobId: string, form: FormData): Promise<void> {
  await api.post(`/jobs/${encodeURIComponent(jobId)}/apply`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  });
}
