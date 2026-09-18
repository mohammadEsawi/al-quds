import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';

/**
 * A water size. The bottle tilts slightly on hover / touch while a light reflection sweeps across it
 * and its shadow shifts. Deliberately subtle — no exaggerated rotation.
 */
export function WaterSizeCard({ product }: { product: Product }) {
  const { t, pick } = useI18n();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const name = pick(product.name);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-shadow hover:shadow-lift">
      <LocalizedLink
        to={`/products/${product.slug}`}
        aria-label={name}
        className="relative block aspect-square overflow-hidden bg-gray-50"
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onTouchStart={() => setActive(true)}
        onTouchEnd={() => setActive(false)}
      >
        <motion.img
          src={product.image}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
          animate={reduced ? undefined : { rotate: active ? -2.5 : 0, scale: active ? 1.04 : 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        />
        {/* moving light reflection */}
        {!reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/45 to-transparent"
            initial={{ insetInlineStart: '-40%' }}
            animate={{ insetInlineStart: active ? '110%' : '-40%' }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
        )}
        {product.tag && (
          <span className="absolute start-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
            {pick(product.tag)}
          </span>
        )}
      </LocalizedLink>

      <div className="flex flex-1 flex-col p-6">
        <span className="text-overline text-primary">{pick(product.category)}</span>
        <h3 className="mt-2 font-display text-xl font-semibold">{name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{pick(product.shortDescription)}</p>
      </div>

      {product.secondaryImage && (
        <div className="border-t border-gray-100">
          <img
            src={product.secondaryImage}
            alt={`${t.water.fullPack} — ${name}`}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="p-6 pt-3">
            <span className="text-overline text-primary">{t.water.fullPack}</span>
            <p className="mt-1 text-sm text-gray-600">{t.water.packText}</p>
          </div>
        </div>
      )}
    </article>
  );
}
