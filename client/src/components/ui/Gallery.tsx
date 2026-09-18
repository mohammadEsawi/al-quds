import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import type { GalleryImage } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';

/** Image grid that opens a keyboard-accessible lightbox. */
export function Gallery({ images, className }: { images: GalleryImage[]; className?: string }) {
  const { t, pick } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setActive(null);
    opener.current?.focus();
  }, []);
  const step = useCallback(
    (delta: number) => setActive((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      // Arrow keys follow the reading direction of the page.
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
      if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [active, close, step]);

  const current = active === null ? null : images[active];

  return (
    <>
      <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-3', className)}>
        {images.map((image, index) => (
          <Reveal key={image.src} direction="scale" delay={(index % 3) * 0.08}>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setActive(index);
              }}
              aria-label={`${t.realEstate.viewImage}: ${pick(image.caption)}`}
              className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl"
            >
              <img
                src={image.src}
                alt={pick(image.caption)}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/60 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <ZoomIn aria-hidden className="size-9" />
                <span className="text-sm font-medium">{pick(image.caption)}</span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={pick(current.caption)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <button
              type="button"
              autoFocus
              onClick={close}
              aria-label={t.common.close}
              className="absolute end-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X aria-hidden />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  aria-label={t.common.previous}
                  className="absolute start-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft aria-hidden className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label={t.common.next}
                  className="absolute end-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight aria-hidden className="rtl:rotate-180" />
                </button>
              </>
            )}
            <motion.figure
              key={current.src}
              className="max-h-full max-w-4xl"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={current.src} alt={pick(current.caption)} className="max-h-[80vh] rounded-xl object-contain" />
              <figcaption className="mt-3 text-center text-sm text-gray-300">{pick(current.caption)}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
