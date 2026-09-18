import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';

interface PageHeroProps {
  title: string;
  text?: string;
  /** Extra breadcrumb trail between "Home" and the current page. */
  trail?: { label: string; to: string }[];
  current?: string;
  children?: ReactNode;
  /** Decorative background layer (e.g. the granule canvas). */
  backdrop?: ReactNode;
  tall?: boolean;
  /** Keep the <h1> for screen readers / SEO but hide it visually (the title is drawn elsewhere). */
  hideTitle?: boolean;
  /** Rendered where the title would be — e.g. the space a canvas draws the title into. */
  titleSlot?: ReactNode;
}

/** Dark page header used by every inner page (same look as the original site's `hero--page`). */
export function PageHero({ title, text, trail = [], current, children, backdrop, tall, hideTitle, titleSlot }: PageHeroProps) {
  const { t } = useI18n();

  return (
    <section
      className={cn(
        'relative isolate flex items-center overflow-hidden bg-linear-to-br from-gray-900 to-gray-800 pt-32 pb-16 text-white',
        tall ? 'min-h-[70vh]' : 'min-h-[46vh]',
      )}
    >
      {backdrop}
      <div className="container-x relative z-10 text-center">
        <nav aria-label={t.nav.breadcrumb} className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-400">
          <LocalizedLink to="/" className="hover:text-white">
            {t.nav.home}
          </LocalizedLink>
          {trail.map((item) => (
            <span key={item.to} className="flex items-center gap-2">
              <span className="text-gray-600">/</span>
              <LocalizedLink to={item.to} className="hover:text-white">
                {item.label}
              </LocalizedLink>
            </span>
          ))}
          {current && (
            <>
              <span className="text-gray-600">/</span>
              <span aria-current="page">{current}</span>
            </>
          )}
        </nav>
        {titleSlot}
        <h1
          className={
            hideTitle
              ? 'sr-only'
              : 'mx-auto max-w-3xl font-display text-3xl leading-tight font-bold sm:text-5xl'
          }
        >
          {title}
        </h1>
        {text && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-300">{text}</p>}
        {children}
      </div>
    </section>
  );
}
