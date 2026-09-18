import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { useSiteData } from '@/context/SiteData';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { whatsappLink } from '@/lib/whatsapp';
import { getProduct, getProducts } from '@/services/content.service';

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { t, pick, format } = useI18n();
  const { company } = useSiteData();
  const query = useAsync(() => getProduct(slug), [slug]);
  const product = query.data;
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [slug]);

  const related = useAsync(
    () => (product ? getProducts({ sector: product.sector }) : Promise.resolve([])),
    [product?.sector],
  );

  useSeo({
    title: product ? pick(product.name) : t.products.notFoundTitle,
    description: product ? pick(product.shortDescription) : undefined,
    image: product?.image,
    noindex: !product && !query.loading,
  });

  if (query.loading) {
    return (
      <Section className="pt-40">
        <Skeleton className="mx-auto h-96 max-w-4xl" />
      </Section>
    );
  }
  if (query.error) {
    return (
      <Section className="pt-40">
        <ErrorState onRetry={query.reload} />
      </Section>
    );
  }
  if (!product) {
    return (
      <Section className="pt-40">
        <EmptyState
          heading="h1"
          title={t.products.notFoundTitle}
          text={t.products.notFoundText}
          action={<ButtonLink to="/products">{t.products.backToProducts}</ButtonLink>}
        />
      </Section>
    );
  }

  const name = pick(product.name);
  const images = product.gallery.length ? product.gallery : product.image ? [product.image] : [];
  const message = format(t.products.inquiryMessage, { name });
  const others = related.data?.filter((p) => p.id !== product.id) ?? [];
  const facts = [
    product.size && { label: t.common.size, value: pick(product.size) },
    product.sku && { label: t.products.sku, value: product.sku },
    ...product.specs.map((s) => ({ label: pick(s.label), value: pick(s.value) })),
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <PageHero
        title={name}
        text={pick(product.category)}
        current={name}
        trail={[{ label: t.nav.products, to: '/products' }]}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <div className="aspect-square overflow-hidden rounded-3xl bg-gray-50 shadow-card">
              {images[active] ? (
                <img src={images[active]} alt={name} className="size-full object-cover" />
              ) : (
                <ImagePlaceholder label="UPLOAD PRODUCT IMAGE" />
              )}
            </div>
            {images.length > 1 && (
              <ul className="mt-4 flex gap-3">
                {images.map((src, index) => (
                  <li key={src}>
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-label={`${name} ${index + 1}`}
                      aria-current={index === active}
                      className={cn(
                        'size-20 overflow-hidden rounded-xl border-2 transition',
                        index === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                      )}
                    >
                      <img src={src} alt="" className="size-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal direction="left">
            {product.isPlaceholder && (
              <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {t.common.sample}
              </span>
            )}
            <span className="text-overline text-accent">{pick(product.category)}</span>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{name}</h2>
            <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
            <p className="mt-6 text-lg leading-relaxed text-gray-600">{pick(product.description)}</p>

            {facts.length > 0 && (
              <dl className="mt-8 grid gap-3 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="rounded-lg bg-gray-50 p-4">
                    <dt className="text-overline mb-1 text-gray-400">{fact.label}</dt>
                    <dd className="font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.features.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 font-display text-lg font-semibold">{t.common.features}</h3>
                <ul className="list-disc space-y-2 ps-6 text-gray-600 marker:text-primary">
                  {product.features.map((feature) => (
                    <li key={feature.en}>{pick(feature)}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonAnchor
                href={whatsappLink(company.whatsapp.general.number, message)}
                variant="whatsapp"
                size="lg"
              >
                <WhatsAppIcon className="size-5" />
                {t.common.orderNow}
              </ButtonAnchor>
              <ButtonLink to="/contact" variant="secondary" size="lg">
                {t.common.contactUs}
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Section>

      {others.length > 0 && (
        <Section muted>
          <SectionHeader title={t.common.relatedProducts} />
          <ProductGrid products={others} limit={3} />
        </Section>
      )}
    </>
  );
}
