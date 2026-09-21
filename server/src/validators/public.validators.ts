import { z } from 'zod';
import { productSectors } from './admin.validators.js';

const phone = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\+?[\d\s\-()]{7,20}$/.test(v), 'Invalid phone number');

export const publicProductsQuery = z.object({
  sector: z.enum(productSectors).optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const slugParams = z.object({ slug: z.string().trim().min(1).max(120) });

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: phone.optional(),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(5000),
  /** Honeypot: humans never fill it. */
  website: z.string().max(0).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/.test(v), 'Invalid URL');

/** Text fields of a job application (the CV arrives as the multipart `cv` file). */
export const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number'),
  email: z.string().trim().max(254).pipe(z.email()),
  city: z.string().trim().min(2).max(100),
  position: z.string().trim().min(2).max(160),
  education: z.string().trim().min(2).max(300),
  experience: z.string().trim().min(2).max(3000),
  message: z.string().trim().max(3000).optional(),
  linkedin: url.optional(),
  portfolio: url.optional(),
  website: z.string().max(0).optional(),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

/** "Request a quote": companies asking for a price on a product and quantity. */
export const quoteSchema = z.object({
  productSlug: z.string().trim().max(120).optional(),
  productName: z.string().trim().min(2).max(200),
  company: z.string().trim().min(2).max(160),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z.string().trim().regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number'),
  quantity: z.string().trim().min(1).max(80),
  city: z.string().trim().max(100).optional(),
  message: z.string().trim().max(3000).optional(),
  /** Honeypot: humans never fill it. */
  website: z.string().max(0).optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;
