import { HeroIntro } from '@/components/hero/HeroIntro';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { AboutHome } from '@/components/sections/AboutHome';
import { DistributionTruck } from '@/components/sections/DistributionTruck';
import { CitiesBand, CtaBanner, StatsBand } from '@/components/sections/HomeBands';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { RealEstateTeaser } from '@/components/sections/RealEstateTeaser';
import { SectorsGrid } from '@/components/sections/SectorsGrid';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

export default function HomePage() {
  const { t } = useI18n();
  useSeo({ description: t.hero.subtitle });

  return (
    <>
      <HeroIntro />

      {/* About the company: tabs + the chairman's and the general manager's messages */}
      <AboutHome />

      {/* Sectors */}
      <Section muted id="sectors">
        <SectionHeader overline={t.home.sectorsOverline} title={t.home.sectorsTitle} text={t.home.sectorsText} />
        <SectorsGrid />
      </Section>

      {/* Water */}
      <Section id="water">
        <SectionHeader overline={t.home.waterOverline} title={t.home.waterTitle} text={t.home.waterText} />
        <ProductGrid sector="water" />
        <Reveal className="mt-12 text-center">
          <ButtonLink to="/water" variant="secondary" arrow>
            {t.home.waterCta}
          </ButtonLink>
        </Reveal>
      </Section>

      {/* Distribution */}
      <DistributionTruck
        overline={t.home.distributionOverline}
        title={t.home.distributionTitle}
        text={t.home.distributionText}
      />

      {/* Food */}
      <Section id="food">
        <SectionHeader overline={t.home.foodOverline} title={t.home.foodTitle} text={t.home.foodText} />
        <ProductGrid sector="food" featured limit={3} />
        <Reveal className="mt-12 text-center">
          <ButtonLink to="/food" variant="secondary" arrow>
            {t.home.foodCta}
          </ButtonLink>
        </Reveal>
      </Section>

      <RealEstateTeaser />
      <StatsBand />
      <CitiesBand />

      {/* Careers teaser */}
      <Section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-overline text-primary">{t.home.careersOverline}</span>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t.home.careersTitle}</h2>
          <p className="mt-4 mb-8 text-lg leading-relaxed text-gray-600">{t.home.careersText}</p>
          <ButtonLink to="/careers" variant="secondary" arrow>
            {t.home.careersCta}
          </ButtonLink>
        </Reveal>
      </Section>

      <CtaBanner
        overline={t.home.ctaOverline}
        title={t.home.ctaTitle}
        text={t.home.ctaText}
        primary={{ to: '/contact', label: t.common.contactUs }}
        secondary={{ to: '/products', label: t.home.ctaProducts }}
      />
    </>
  );
}
