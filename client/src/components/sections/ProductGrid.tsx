import { useMemo } from 'react';
import { ProductCard } from '@/components/ui/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import type { Product, ProductSector } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { cn } from '@/lib/cn';
import { getProducts } from '@/services/content.service';

// A near-empty grid trails off to one side instead of sitting centered; constrain and center it instead.
const layoutByCount: Record<number, string> = {
  1: 'max-w-sm sm:grid-cols-1',
  2: 'max-w-3xl sm:grid-cols-2',
};

interface ProductGridProps {
  sector?: ProductSector;
  featured?: boolean;
  limit?: number;
  /** Pass already-loaded products instead of fetching. */
  products?: Product[];
  emptyText?: string;
  /** Forwarded to each ProductCard; 'wide' fits landscape product photos without cropping them tight. */
  imageAspect?: 'square' | 'wide';
}

/** Data-driven product listing with loading, error and empty states. */
export function ProductGrid({ sector, featured, limit, products, emptyText, imageAspect }: ProductGridProps) {
  const query = useAsync(() => (products ? Promise.resolve(products) : getProducts({ sector, featured })), [
    sector,
    featured,
    products,
  ]);

  const list = useMemo(() => (limit ? query.data?.slice(0, limit) : query.data), [query.data, limit]);

  if (query.loading) return <CardGridSkeleton count={limit ?? 3} />;
  if (query.error) return <ErrorState onRetry={query.reload} />;
  if (!list?.length) return <EmptyState text={emptyText} />;

  return (
    <ul className={cn('mx-auto grid gap-8', layoutByCount[list.length] ?? 'sm:grid-cols-2 lg:grid-cols-3')}>
      {list.map((product, index) => (
        <Reveal as="li" key={product.id} delay={(index % 3) * 0.08}>
          <ProductCard product={product} imageAspect={imageAspect} />
        </Reveal>
      ))}
    </ul>
  );
}
