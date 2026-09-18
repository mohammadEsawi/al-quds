import { FeatureCard } from '@/components/ui/FeatureCard';
import { featureIcons } from '@/components/ui/icons';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CardGridSkeleton, ErrorState } from '@/components/ui/States';
import { DistributionTruck } from '@/components/sections/DistributionTruck';
import { InquiryCta } from '@/components/sections/InquiryCta';
import { LabelSelector } from '@/components/sections/LabelSelector';
import { WaterSizeCard } from '@/components/sections/WaterSizeCard';
import { useSiteData } from '@/context/SiteData';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getProducts, getWaterLabels, getWaterOverview } from '@/services/content.service';

export default function WaterPage() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  useSeo({ title: t.nav.water, description: t.water.metaDescription, image: '/assets/water/water-lake-bottle.webp' });

  const overview = useAsync(getWaterOverview);
  const products = useAsync(() => getProducts({ sector: 'water' }));
  const labels = useAsync(getWaterLabels);
  const info = overview.data;

  return (
    <>
      <PageHero title={t.water.heroTitle} text={t.water.heroText} current={t.nav.water} />

      {/* Featured product */}
      {info && (
        <Section>
          <div className="grid items-center gap-12 rounded-3xl border border-gray-100 bg-white p-6 sm:p-12 lg:grid-cols-2 lg:gap-16">
            <Reveal direction="right" className="text-center">
              <img
                src={info.image}
                alt={pick(info.title)}
                width={400}
                height={500}
                loading="lazy"
                className="mx-auto max-h-[440px] w-auto drop-shadow-2xl"
              />
            </Reveal>
            <Reveal direction="left">
              <span className="text-overline text-primary">{t.water.featuredOverline}</span>
              <h2 className="mt-2 font-display text-3xl leading-snug font-semibold sm:text-4xl">{pick(info.title)}</h2>
              <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
              <p className="mt-6 text-xl leading-relaxed font-light text-gray-600">{pick(info.lead)}</p>
              <p className="mt-4 leading-relaxed text-gray-600">{pick(info.body)}</p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                {info.specs.map((spec) => (
                  <div key={spec.label.en} className="rounded-lg bg-gray-50 p-4">
                    <dt className="text-overline mb-1 text-gray-400">{pick(spec.label)}</dt>
                    <dd className="font-semibold">{pick(spec.value)}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </Section>
      )}

      {/* Sizes */}
      <Section muted id="catalog">
        <SectionHeader overline={t.water.catalogOverline} title={t.water.catalogTitle} text={t.water.catalogText} />
        {products.loading && <CardGridSkeleton />}
        {products.error && <ErrorState onRetry={products.reload} />}
        {products.data && (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.map((product, index) => (
              <Reveal as="li" key={product.id} delay={index * 0.08}>
                <WaterSizeCard product={product} />
              </Reveal>
            ))}
          </ul>
        )}
      </Section>

      {/* Labels */}
      {labels.data && labels.data.length > 0 && (
        <Section id="labels">
          <SectionHeader overline={t.water.labelsOverline} title={t.water.labelsTitle} />
          <LabelSelector labels={labels.data} />
        </Section>
      )}

      <DistributionTruck
        overline={t.home.distributionOverline}
        title={t.home.distributionTitle}
        text={t.home.distributionText}
      />

      {/* Standards */}
      <Section>
        <SectionHeader overline={t.water.standardsOverline} title={t.water.standardsTitle} text={t.water.standardsText} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {company.standards.map((standard, index) => (
            <Reveal key={standard.title.en} delay={index * 0.08}>
              <FeatureCard icon={featureIcons[standard.icon]} title={pick(standard.title)} text={pick(standard.text)} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section muted>
        <InquiryCta
          title={t.sectorPage.inquiryTitle}
          text={t.sectorPage.inquiryText}
          whatsappNumber={company.whatsapp.water.number}
          whatsappMessage={pick(company.whatsapp.water.message)}
        />
      </Section>
    </>
  );
}
