import { z } from 'zod';

/** `{ ar, en }` where both languages are required. */
export const localizedRequired = z.object({
  ar: z.string().trim().min(1).max(3000),
  en: z.string().trim().min(1).max(3000),
});

/** `{ ar, en }` where either or both may be empty. */
export const localizedOptional = z.object({
  ar: z.string().trim().max(3000),
  en: z.string().trim().max(3000),
});

export const localizedList = z.array(localizedRequired).max(60);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and dashes')
  .max(100);

/** A site-relative path (`/assets/...`, `/uploads/...`) or an absolute https URL. Blocks `javascript:`, plain http and `//host`. */
export const assetUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^(https:\/\/|\/(?!\/))[^\s]*$/.test(v), 'Must be an https URL or a /path');

export const optionalAssetUrl = assetUrl.nullish().transform((v) => v || null);

export const idParams = z.object({ id: z.string().min(1).max(64) });

export const sortOrder = z.number().int().min(0).max(100000);
