import { useSearchParams } from 'react-router';
import { PageHero } from '@/components/ui/PageHero';
import { Section } from '@/components/ui/Section';
import { ProductGrid } from '@/components/sections/ProductGrid';
import type { ProductSector } from '@/content/types';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

const SECTORS: ProductSector[] = ['water', 'plastic', 'preforms', 'caps', 'food'];

function isSector(value: string | null): value is ProductSector {
  return !!value && (SECTORS as string[]).includes(value);
}

export default function ProductsPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const param = params.get('sector');
  const sector = isSector(param) ? param : undefined;
  useSeo({ title: t.products.pageTitle, description: t.products.metaDescription });

  const tabs: { key: ProductSector | undefined; label: string }[] = [
    { key: undefined, label: t.common.all },
    ...SECTORS.filter((key) => key !== 'plastic').map((key) => ({ key, label: t.nav[key] })),
  ];

  return (
    <>
      <PageHero title={t.products.pageTitle} text={t.products.pageText} current={t.nav.products} />
      <Section>
        <div role="group" aria-label={t.products.filterLabel} className="mb-12 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => {
            const active = tab.key === sector;
            return (
              <button
                key={tab.key ?? 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setParams(tab.key ? { sector: tab.key } : {}, { replace: true })}
                className={cn(
                  'rounded-full border-[1.5px] px-5 py-2 text-sm font-medium transition-all',
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <ProductGrid sector={sector} emptyText={t.products.empty} />
      </Section>
    </>
  );
}
