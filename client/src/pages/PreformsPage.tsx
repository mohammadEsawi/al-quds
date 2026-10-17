import { useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { GranuleName } from '@/components/sections/GranuleName';
import { InquiryCta } from '@/components/sections/InquiryCta';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * The preforms page: its own granule-assembled hero (the same treatment the plastic page uses for the
 * company name), the manufacturing story (dimensional accuracy, weight consistency, our own injection
 * machines), and the preforms we make. Reachable from the plastic page's "البريفورم" card and directly
 * at `/preforms` — deliberately not listed in the "قطاعاتنا" navbar menu, which only covers the
 * top-level sectors; this is a page of preforms' own, living conceptually under plastic (same treatment
 * as CapsPage.tsx).
 */
export default function PreformsPage() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  const channel = company.whatsapp.preforms;
  const nameAnchor = useRef<HTMLDivElement>(null);
  const copy = t.sectorPage.preforms;
  const steps = Object.values(t.process.preforms);

  useSeo({ title: copy.heroTitle, description: copy.metaDescription });

  return (
    <>
      <PageHero
        tall
        title={copy.heroTitle}
        text={copy.heroText}
        current={t.nav.preforms}
        trail={[{ label: t.nav.plastic, to: '/plastic' }]}
        hideTitle
        titleSlot={<div ref={nameAnchor} className="mx-auto h-[22rem] w-full max-w-6xl sm:h-[28rem]" />}
        backdrop={
          <>
            <GranuleName lines={copy.granuleLines} compactLines={copy.granuleLinesCompact} logoSrc={company.logo} anchorRef={nameAnchor} />
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
        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
          {copy.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-sm font-medium shadow-card">
              <CheckCircle2 aria-hidden className="size-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </Section>

      <Section muted id="process">
        <SectionHeader overline={t.sectorPage.processOverline} title={copy.processTitle} />
        <ProcessSteps steps={steps} />
      </Section>

      <Section id="products">
        <SectionHeader overline={t.sectorPage.productsOverline} title={copy.typesTitle} />
        <ProductGrid sector="preforms" />
      </Section>

      <Section muted>
        <InquiryCta
          title={t.sectorPage.inquiryTitle}
          text={t.sectorPage.inquiryText}
          whatsappNumber={(channel ?? company.whatsapp.general).number}
          whatsappMessage={channel ? pick(channel.message) : copy.whatsappMessage}
          quoteTo="/quote?sector=preforms"
        />
      </Section>
    </>
  );
}
