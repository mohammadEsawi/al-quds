import { useRef } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { GranuleName } from '@/components/sections/GranuleName';
import { InquiryCta } from '@/components/sections/InquiryCta';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';
import { ButtonAnchor } from '@/components/ui/Button';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { whatsappLink } from '@/lib/whatsapp';

// Decorative only — illustrates that colors aren't limited to the two shown above, not an exact catalogue.
const swatchColors = ['#dc2626', '#0d9488', '#2563eb', '#16a34a', '#f59e0b', '#1f2937', '#ffffff'];

/**
 * The caps page: its own granule-assembled hero (the same treatment the plastic page uses for the
 * company name), the manufacturing story (HDPE/LDPE, our own machines, imported pigments we process
 * ourselves), and the caps we make. Reachable from the plastic page's "الأغطية" card and directly at
 * `/caps` — deliberately not listed in the "قطاعاتنا" navbar menu, which only covers the top-level
 * sectors; this is a page of caps' own, living conceptually under plastic.
 */
export default function CapsPage() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  const channel = company.whatsapp.caps;
  const nameAnchor = useRef<HTMLDivElement>(null);
  const copy = t.sectorPage.caps;
  const steps = Object.values(t.process.caps);

  useSeo({ title: copy.heroTitle, description: copy.metaDescription });

  return (
    <>
      <PageHero
        tall
        title={copy.heroTitle}
        text={copy.heroText}
        current={t.nav.caps}
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
        <ProductGrid sector="caps" imageAspect="wide" />

        <div className="mx-auto mt-14 max-w-2xl text-center">
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-gray-900">{copy.customColorsTitle}</h3>
            <p className="mt-3 leading-relaxed text-gray-600">{copy.customColorsText}</p>
            <ul aria-hidden className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {swatchColors.map((color) => (
                <li
                  key={color}
                  className="size-9 rounded-full border border-gray-200 shadow-card"
                  style={{ backgroundColor: color }}
                />
              ))}
              <li className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400">
                <Plus aria-hidden className="size-4" />
              </li>
            </ul>
            <div className="mt-6">
              <ButtonAnchor
                href={whatsappLink((channel ?? company.whatsapp.general).number, channel ? pick(channel.message) : copy.whatsappMessage)}
                variant="whatsapp"
              >
                <WhatsAppIcon className="size-5" />
                {copy.customColorsCta}
              </ButtonAnchor>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section muted>
        <InquiryCta
          title={t.sectorPage.inquiryTitle}
          text={t.sectorPage.inquiryText}
          whatsappNumber={(channel ?? company.whatsapp.general).number}
          whatsappMessage={channel ? pick(channel.message) : copy.whatsappMessage}
          quoteTo="/quote?sector=caps"
        />
      </Section>
    </>
  );
}
