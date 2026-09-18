/** A bilingual content field, as used by the website and the admin dashboard. */
export interface Localized {
  ar: string;
  en: string;
}

export const loc = (ar: string, en: string): Localized => ({ ar, en });

/** Builds `{ ar, en }` from a nullable column pair, or `undefined` when both are empty. */
export function locOpt(ar?: string | null, en?: string | null): Localized | undefined {
  return ar || en ? { ar: ar ?? '', en: en ?? '' } : undefined;
}

/** Splits an optional `{ ar, en }` back into column values (`null` when both are empty). */
export function splitOpt(value?: Localized | null): { ar: string | null; en: string | null } {
  const ar = value?.ar?.trim() || null;
  const en = value?.en?.trim() || null;
  return ar || en ? { ar, en } : { ar: null, en: null };
}
