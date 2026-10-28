import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { getNews } from '@/services/content.service';
import type { NewsItem } from '@/content/types';

// A near-empty grid trails off to one side instead of sitting centered; constrain and center it instead.
const layoutByCount: Record<number, string> = {
  1: 'max-w-md sm:grid-cols-1',
  2: 'max-w-4xl sm:grid-cols-2',
};

/** Homepage "latest news" cards — admin-managed, so this renders nothing until at least one exists. */
export function NewsSection() {
  const { t, pick, locale } = useI18n();
  const { data } = useAsync(getNews);
  const [zoomed, setZoomed] = useState<NewsItem | null>(null);

  if (!data?.length) return null;

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-PS-u-nu-latn' : 'en-GB', { dateStyle: 'medium' });

  return (
    <Section id="news">
      <SectionHeader overline={t.home.newsOverline} title={t.home.newsTitle} />
      <ul className={cn('mx-auto grid max-w-6xl gap-8', layoutByCount[data.length] ?? 'sm:grid-cols-2 lg:grid-cols-3')}>
        {data.map((item, index) => {
          const text = (
            <div className="p-5">
              <p className="text-xs text-gray-400">{dateFormat.format(new Date(item.publishedAt))}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-gray-900">{pick(item.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{pick(item.text)}</p>
            </div>
          );
          return (
            <Reveal
              as="li"
              key={item.id}
              delay={(index % 3) * 0.08}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-lift"
            >
              {item.image && (
                <button
                  type="button"
                  onClick={() => setZoomed(item)}
                  aria-label={pick(item.title)}
                  className="relative block aspect-4/3 w-full overflow-hidden rounded-t-2xl bg-gray-50"
                >
                  <img src={item.image} alt="" loading="lazy" className="size-full object-contain p-3" />
                  <span className="absolute inset-0 flex items-center justify-center bg-gray-900/0 text-white opacity-0 transition-all duration-300 group-hover:bg-gray-900/35 group-hover:opacity-100">
                    <ZoomIn aria-hidden className="size-8" />
                  </span>
                </button>
              )}
              {item.link ? (
                <a href={item.link} target={item.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block">
                  {text}
                </a>
              ) : (
                text
              )}
            </Reveal>
          );
        })}
      </ul>

      <AnimatePresence>
        {zoomed?.image && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={pick(zoomed.title)}
            className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(null)}
          >
            <button
              type="button"
              autoFocus
              onClick={() => setZoomed(null)}
              aria-label={t.common.close}
              className="absolute end-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X aria-hidden />
            </button>
            <motion.figure
              className="max-h-full max-w-4xl"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={zoomed.image} alt={pick(zoomed.title)} className="max-h-[80vh] rounded-xl object-contain" />
              <figcaption className="mt-3 text-center text-sm text-gray-300">{pick(zoomed.title)}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
