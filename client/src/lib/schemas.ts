import { z } from 'zod';
import type { Dictionary } from '@/i18n/I18nProvider';

/** CV upload limits. The server enforces the same values (configurable there via MAX_UPLOAD_MB). */
export const CV_MAX_MB = 5;
export const CV_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;

const PHONE = /^\+?[\d\s\-()]{7,20}$/;

type Errors = Dictionary['forms']['errors'];

export const contactSchema = (e: Errors) =>
  z.object({
    name: z.string().trim().min(2, e.required),
    email: z.string().trim().pipe(z.email(e.email)),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || PHONE.test(v), e.phone),
    subject: z.string(),
    message: z.string().trim().min(10, e.messageMin),
    // Honeypot: real visitors never fill it.
    website: z.string().max(0),
  });

export type ContactValues = z.infer<ReturnType<typeof contactSchema>>;

const optionalUrl = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), message);

export const applicationSchema = (e: Errors) =>
  z.object({
    fullName: z.string().trim().min(2, e.required),
    phone: z.string().trim().regex(PHONE, e.phone),
    email: z.string().trim().pipe(z.email(e.email)),
    city: z.string().trim().min(2, e.required),
    position: z.string().trim().min(2, e.required),
    education: z.string().trim().min(2, e.required),
    experience: z.string().trim().min(2, e.required),
    message: z.string().trim(),
    linkedin: optionalUrl(e.url),
    portfolio: optionalUrl(e.url),
    website: z.string().max(0),
    cv: z
      .custom<FileList>((v) => typeof FileList !== 'undefined' && v instanceof FileList && v.length > 0, e.fileRequired)
      .refine((files) => {
        const name = files[0]?.name.toLowerCase() ?? '';
        return CV_EXTENSIONS.some((ext) => name.endsWith(`.${ext}`));
      }, e.fileType)
      .refine((files) => (files[0]?.size ?? 0) <= CV_MAX_MB * 1024 * 1024, e.fileSize),
  });

export type ApplicationValues = z.infer<ReturnType<typeof applicationSchema>>;

export const quoteSchema = (e: Errors) =>
  z.object({
    productSlug: z.string(),
    company: z.string().trim().min(2, e.required),
    name: z.string().trim().min(2, e.required),
    email: z.string().trim().pipe(z.email(e.email)),
    phone: z.string().trim().regex(PHONE, e.phone),
    quantity: z.string().trim().min(1, e.required).max(80),
    city: z.string().trim(),
    message: z.string().trim(),
    // Honeypot: real visitors never fill it.
    website: z.string().max(0),
  });

export type QuoteValues = z.infer<ReturnType<typeof quoteSchema>>;
