import { useRef } from 'react';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { GranuleName } from '@/components/sections/GranuleName';
import { InquiryCta } from '@/components/sections/InquiryCta';
import { PlasticOverview } from '@/components/sections/PlasticOverview';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * The plastic page: granule hero, intro, in-house manufacturing story and process — with cards leading
 * to the preforms and caps pages, which each have their own hero and content (see PreformsPage.tsx and
 * CapsPage.tsx). Preforms and caps used to be merged into this page; both are their own pages again,
 * reachable from the cards in PlasticOverview and directly at `/preforms` and `/caps`.
 */
export default function SectorPage() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  const channel = company.whatsapp.plastic;
  const nameAnchor = useRef<HTMLDivElement>(null);
  const copy = t.sectorPage.plastic;
  const steps = Object.values(t.process.plastic);

  useSeo({ title: copy.heroTitle, description: copy.metaDescription });

  return (
    <>
      <PageHero
        tall
        title={copy.heroTitle}
        text={copy.heroText}
        current={t.nav.plastic}
        trail={[{ label: t.nav.sectors, to: '/sectors' }]}
        // Granules and pigments assemble into the logo and the company name instead of a plain title.
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
      </Section>

      <PlasticOverview />

      <Section muted id="process">
        <SectionHeader overline={t.sectorPage.processOverline} title={copy.processTitle} />
        <ProcessSteps steps={steps} />
      </Section>

      <Section>
        <InquiryCta
          title={t.sectorPage.inquiryTitle}
          text={t.sectorPage.inquiryText}
          whatsappNumber={(channel ?? company.whatsapp.general).number}
          whatsappMessage={channel ? pick(channel.message) : copy.whatsappMessage}
          quoteTo="/quote"
        />
      </Section>
    </>
  );
}
