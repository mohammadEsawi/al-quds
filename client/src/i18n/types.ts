export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';

export const DIRECTIONS: Record<Locale, 'rtl' | 'ltr'> = { ar: 'rtl', en: 'ltr' };

/** A piece of content that exists in every supported language (mirrors the nameAr / nameEn DB columns). */
export type LocalizedText = Record<Locale, string>;

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Turns a literal-typed dictionary into a plain string-typed shape so other languages can implement it. */
export type DeepString<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly DeepString<U>[]
    : { [K in keyof T]: DeepString<T[K]> };

/** Shorthand for building a bilingual content field: `L('مياه', 'Water')`. */
export const L = (ar: string, en: string): LocalizedText => ({ ar, en });
