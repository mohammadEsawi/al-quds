import { useMemo } from 'react';
import { ProductCard } from '@/components/ui/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import type { Product, ProductSector } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { getProducts } from '@/services/content.service';

interface ProductGridProps {
  sector?: ProductSector;
  featured?: boolean;
  limit?: number;
  /** Pass already-loaded products instead of fetching. */
  products?: Product[];
  emptyText?: string;
}

/** Data-driven product listing with loading, error and empty states. */
export function ProductGrid({ sector, featured, limit, products, emptyText }: ProductGridProps) {
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
    <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((product, index) => (
        <Reveal as="li" key={product.id} delay={(index % 3) * 0.08}>
          <ProductCard product={product} />
        </Reveal>
      ))}
    </ul>
  );
}
