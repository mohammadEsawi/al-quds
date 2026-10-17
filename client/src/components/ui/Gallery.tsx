import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from 'lucide-react';
import type { GalleryImage } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';

/** Image grid that opens a keyboard-accessible lightbox. `tileAspect` (default 3/4) also sets the grid columns for portrait video reels. */
export function Gallery({ images, className, tileAspect = '3/4', columns = 'grid-cols-2 lg:grid-cols-3' }: { images: GalleryImage[]; className?: string; tileAspect?: string; columns?: string }) {
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
      <div className={cn('grid gap-4', columns, className)}>
        {images.map((image, index) => (
          <Reveal key={image.src} direction="scale" delay={(index % 3) * 0.08}>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setActive(index);
              }}
              aria-label={`${image.kind === 'video' ? t.realEstate.playVideo : t.realEstate.viewImage}: ${pick(image.caption)}`}
              style={{ aspectRatio: tileAspect }}
              className="group relative block w-full overflow-hidden rounded-xl"
            >
              <img
                src={image.kind === 'video' ? (image.poster ?? image.src) : image.src}
                alt={pick(image.caption)}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {image.kind === 'video' && (
                <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-gray-900/25">
                  <span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lift transition-transform group-hover:scale-110">
                    <Play aria-hidden className="size-6 translate-x-0.5 fill-current rtl:-translate-x-0.5 rtl:-scale-x-100" />
                  </span>
                </span>
              )}
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
              {current.kind === 'video' ? (
                // autoPlay: the whole point of opening it is to watch it right away.
                <video
                  key={current.src}
                  src={current.src}
                  poster={current.poster}
                  autoPlay
                  controls
                  playsInline
                  className="max-h-[80vh] max-w-full rounded-xl"
                >
                  <track kind="captions" />
                </video>
              ) : (
                <img src={current.src} alt={pick(current.caption)} className="max-h-[80vh] rounded-xl object-contain" />
              )}
              <figcaption className="mt-3 text-center text-sm text-gray-300">{pick(current.caption)}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
