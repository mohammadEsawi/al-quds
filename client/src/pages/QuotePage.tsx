import { Building2, Clock, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { QuoteForm } from '@/components/sections/QuoteForm';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { CardGridSkeleton, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getProducts } from '@/services/content.service';

/** `/quote?product=<slug>` — "request a quote" for companies; the product is preselected when the visitor comes from its page. */
export default function QuotePage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const products = useAsync(() => getProducts(), []);
  useSeo({ title: t.quote.pageTitle, description: t.quote.metaDescription });

  const wanted = params.get('product') ?? '';
  const initialSlug = products.data?.some((p) => p.slug === wanted) ? wanted : '';

  const points = [
    { icon: Building2, text: t.quote.pointCompanies },
    { icon: Clock, text: t.quote.pointFast },
    { icon: ShieldCheck, text: t.quote.pointOwn },
  ];

  return (
    <>
      <PageHero title={t.quote.pageTitle} text={t.quote.pageText} current={t.quote.pageTitle} />

      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <Reveal direction="right" className="rounded-3xl bg-linear-to-br from-primary to-primary-light p-8 text-white sm:p-10">
            <h2 className="font-display text-3xl font-bold">{t.quote.sideTitle}</h2>
            <ul className="mt-8 space-y-6">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="pt-2 leading-relaxed text-white/90">{text}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal direction="left" className="rounded-3xl bg-white p-6 shadow-lift sm:p-10">
            {products.loading ? (
              <CardGridSkeleton count={1} />
            ) : products.error ? (
              <ErrorState onRetry={products.reload} />
            ) : (
              // remount when the product list arrives so the preselected product applies
              <QuoteForm key={initialSlug} products={products.data ?? []} initialSlug={initialSlug} />
            )}
          </Reveal>
        </div>
      </Section>
    </>
  );
}
