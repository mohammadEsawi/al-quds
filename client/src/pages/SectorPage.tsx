import { useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { GranuleField } from '@/components/sections/GranuleField';
import { GranuleName } from '@/components/sections/GranuleName';
import { InquiryCta } from '@/components/sections/InquiryCta';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

type ManufacturingSector = 'plastic' | 'preforms' | 'caps';

/**
 * Shared page for the manufacturing sectors (plastic, preforms, caps): granule hero, intro,
 * scroll-driven process, optional product list, and an inquiry block. Copy comes from the
 * dictionary; products come from the data layer.
 */
export default function SectorPage({ sector }: { sector: ManufacturingSector }) {
  const { t } = useI18n();
  const { company } = useSiteData();
  const nameAnchor = useRef<HTMLDivElement>(null);
  const copy = t.sectorPage[sector];
  const stages = t.process[sector] as Record<string, { title: string; text: string }>;
  const steps = Object.values(stages);

  useSeo({ title: copy.heroTitle, description: copy.metaDescription });

  const features = sector === 'preforms' ? t.sectorPage.preforms.features : [];
  const showProducts = sector !== 'plastic';
  const typesTitle = sector === 'caps' ? t.sectorPage.caps.typesTitle : t.sectorPage.productsOverline;

  return (
    <>
      <PageHero
        tall
        title={copy.heroTitle}
        text={copy.heroText}
        current={t.nav[sector]}
        trail={[{ label: t.nav.sectors, to: '/sectors' }]}
        // Plastic: granules and pigments assemble into the company name. Other sectors keep the wave.
        hideTitle={sector === 'plastic'}
        titleSlot={sector === 'plastic' ? <div ref={nameAnchor} className="mx-auto h-36 w-full max-w-5xl sm:h-52" /> : undefined}
        backdrop={
          <>
            {sector === 'plastic' ? <GranuleName text={copy.heroTitle} anchorRef={nameAnchor} /> : <GranuleField />}
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-gray-900/70 via-transparent to-gray-900/40" />
          </>
        }
      />

      <Section id="intro">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-display text-3xl leading-snug font-bold sm:text-4xl">{copy.introTitle}</h2>
            <span aria-hidden className="mx-auto mt-4 block h-1 w-12 rounded-full bg-primary" />
            <p className="mt-6 text-xl leading-relaxed font-light text-gray-600">{copy.introText}</p>
          </Reveal>
        </div>
        {features.length > 0 && (
          <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal as="li" key={feature} delay={index * 0.06}>
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
                  <CheckCircle2 aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="font-medium">{feature}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        )}
      </Section>

      <Section muted id="process">
        <SectionHeader overline={t.sectorPage.processOverline} title={copy.processTitle} />
        <ProcessSteps steps={steps} />
      </Section>

      {showProducts && (
        <Section id="products">
          <SectionHeader overline={t.sectorPage.productsOverline} title={typesTitle} />
          <ProductGrid sector={sector as 'preforms' | 'caps'} />
        </Section>
      )}

      <Section muted={!showProducts}>
        <InquiryCta
          title={t.sectorPage.inquiryTitle}
          text={t.sectorPage.inquiryText}
          whatsappNumber={company.whatsapp.general.number}
          whatsappMessage={copy.whatsappMessage}
        />
      </Section>
    </>
  );
}
