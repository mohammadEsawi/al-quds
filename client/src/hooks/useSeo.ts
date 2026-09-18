import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useI18n } from '@/i18n/I18nProvider';
import { LOCALES } from '@/i18n/types';

interface SeoOptions {
  /** Page title without the brand suffix. Omit for the homepage. */
  title?: string;
  description?: string;
  /** Absolute or root-relative image used for Open Graph / Twitter cards. */
  image?: string;
  noindex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = `link[rel="${rel}"]${hreflang ? `[hreflang="${hreflang}"]` : ''}`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Sets title, description, Open Graph / Twitter tags, canonical and hreflang for the current page. */
export function useSeo({ title, description, image, noindex }: SeoOptions = {}) {
  const { t, locale, switchPath } = useI18n();
  const { pathname } = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const fullTitle = title ? `${title} | ${t.brand.name}` : t.brand.name;
    const desc = description ?? t.sectors.metaDescription;
    const img = image ? new URL(image, origin).href : `${origin}/assets/hero/hero-scene.webp`;
    const url = `${origin}${pathname}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:locale', locale === 'ar' ? 'ar_PS' : 'en_US');
    upsertMeta('property', 'og:site_name', t.brand.name);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);
    upsertLink('canonical', url);
    for (const target of LOCALES) upsertLink('alternate', `${origin}${switchPath(target)}`, target);
  }, [title, description, image, noindex, t, locale, pathname, switchPath]);
}
