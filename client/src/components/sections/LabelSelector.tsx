import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { Reveal } from '@/components/ui/Reveal';
import type { WaterLabel } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

/** Lets the visitor switch between water labels; the label image cross-fades and slides. */
export function LabelSelector({ labels }: { labels: WaterLabel[] }) {
  const { t, pick, dir } = useI18n();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const current = labels[index];
  if (!current) return null;

  const select = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };
  const sign = dir === 'rtl' ? -1 : 1;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <Reveal direction="right">
        <div
          role="tablist"
          aria-label={t.water.labelSelector}
          className="mb-8 flex flex-wrap justify-center gap-2 lg:justify-start"
        >
          {labels.map((label, i) => (
            <button
              key={label.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => select(i)}
              className={cn(
                'rounded-full border-[1.5px] px-5 py-2 text-sm font-medium transition-all',
                i === index
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary',
              )}
            >
              {pick(label.name)}
            </button>
          ))}
        </div>
        <p className="text-center text-gray-600 lg:text-start">{t.water.labelsText}</p>
      </Reveal>

      <Reveal direction="left">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-gray-50 shadow-card">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={current.id}
              custom={direction}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 60 * direction * sign, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60 * direction * sign, scale: 0.96 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {current.image ? (
                <img src={current.image} alt={pick(current.name)} className="size-full object-contain p-6" />
              ) : (
                <ImagePlaceholder label={`UPLOAD WATER LABEL ${String(index + 1).padStart(2, '0')}`} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </div>
  );
}
