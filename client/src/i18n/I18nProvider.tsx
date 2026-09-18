import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { ar } from './ar';
import { en } from './en';
import { DIRECTIONS, type DeepString, type Locale, type LocalizedText } from './types';

export type Dictionary = DeepString<typeof ar>;

const dictionaries: Record<Locale, Dictionary> = { ar, en };

export const LOCALE_STORAGE_KEY = 'lamico:locale';

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dictionary;
  /** Picks the current language from a bilingual content field. */
  pick: (text: LocalizedText) => string;
  /** Prefixes an app path with the current language: `/about` → `/ar/about`. */
  localePath: (to: string) => string;
  /** The current URL rewritten for another language (used by the language switch). */
  switchPath: (target: Locale) => string;
  /** Replaces `{name}` style placeholders. */
  format: (template: string, values: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIRECTIONS[locale];
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* storage can be unavailable (private mode) — the URL is the source of truth anyway */
    }
  }, [locale]);

  const localePath = useCallback(
    (to: string) => {
      if (/^(https?:|mailto:|tel:|#)/.test(to)) return to;
      const path = to === '/' ? '' : to.startsWith('/') ? to : `/${to}`;
      return `/${locale}${path}`;
    },
    [locale],
  );

  const switchPath = useCallback(
    (target: Locale) => {
      const rest = location.pathname.replace(/^\/(ar|en)(?=\/|$)/, '');
      return `/${target}${rest}${location.search}${location.hash}`;
    },
    [location.pathname, location.search, location.hash],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: DIRECTIONS[locale],
      t: dictionaries[locale],
      pick: (text) => text[locale],
      localePath,
      switchPath,
      format: (template, values) =>
        template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')),
    }),
    [locale, localePath, switchPath],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}
