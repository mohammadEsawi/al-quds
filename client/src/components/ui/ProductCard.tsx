import { ArrowRight } from 'lucide-react';
import type { Product } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';
import { ImagePlaceholder } from './ImagePlaceholder';

const placeholderLabel: Record<Product['sector'], string> = {
  water: 'UPLOAD WATER BOTTLE',
  plastic: 'UPLOAD PLASTIC FACTORY IMAGE',
  preforms: 'UPLOAD PREFORM IMAGE',
  caps: 'UPLOAD CAP IMAGE',
  food: 'UPLOAD FOOD PRODUCT IMAGE',
};

/** Product tile used on every product listing (water, food, preforms, caps, all products). */
export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { t, pick } = useI18n();
  const name = pick(product.name);

  return (
    <LocalizedLink
      to={`/products/${product.slug}`}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.image ? (
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder label={placeholderLabel[product.sector]} />
        )}
        {(product.tag || product.isPlaceholder) && (
          <span className="absolute start-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
            {product.isPlaceholder ? t.common.sample : product.tag && pick(product.tag)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <span className="text-overline text-accent">{pick(product.category)}</span>
        <h3 className="mt-2 font-display text-xl leading-snug font-semibold text-gray-900">{name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{pick(product.shortDescription)}</p>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          {product.size ? (
            <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              {pick(product.size)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all group-hover:gap-3">
            {t.common.discoverProduct}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </LocalizedLink>
  );
}
