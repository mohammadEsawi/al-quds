import { HeroIntro } from '@/components/hero/HeroIntro';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { DistributionTruck } from '@/components/sections/DistributionTruck';
import { CitiesBand, CtaBanner, StatsBand } from '@/components/sections/HomeBands';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { RealEstateTeaser } from '@/components/sections/RealEstateTeaser';
import { SectorsGrid } from '@/components/sections/SectorsGrid';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

export default function HomePage() {
  const { t } = useI18n();
  const { company } = useSiteData();
  useSeo({ description: t.hero.subtitle });

  return (
    <>
      <HeroIntro />

      {/* About */}
      <Section id="about">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right" className="relative">
            <img
              src="/assets/water/water-lake-bottle.webp"
              alt={t.hero.productAlt}
              width={560}
              height={448}
              loading="lazy"
              className="w-full rounded-3xl object-cover shadow-lift"
            />
            <div className="absolute -bottom-5 -start-3 rounded-2xl bg-primary p-6 text-center text-white shadow-primary max-sm:-top-4 max-sm:bottom-auto sm:-start-5">
              <div dir="ltr" className="font-display text-4xl leading-none font-bold">
                {new Date().getFullYear() - company.founded}+
              </div>
              <div className="text-overline mt-1">{t.home.experienceLabel}</div>
            </div>
          </Reveal>

          <Reveal direction="left" className="text-center lg:text-start">
            <span className="text-overline text-primary">{t.home.aboutOverline}</span>
            <h2 className="mt-2 font-display text-3xl leading-tight font-bold sm:text-5xl">{t.home.aboutTitle}</h2>
            <span aria-hidden className="mx-auto mt-4 block h-1 w-12 rounded-full bg-primary lg:mx-0" />
            <p className="mt-6 text-xl leading-relaxed font-light text-gray-600">{t.home.aboutLead}</p>
            <p className="mt-4 mb-8 leading-relaxed text-gray-600">{t.home.aboutBody}</p>
            <ButtonLink to="/about" arrow>
              {t.home.aboutCta}
            </ButtonLink>
          </Reveal>
        </div>
      </Section>

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
