import { Eye, Target } from 'lucide-react';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { featureIcons } from '@/components/ui/icons';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

export default function AboutPage() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  useSeo({ title: t.nav.about, description: t.about.metaDescription });

  return (
    <>
      <PageHero title={t.about.heroTitle} text={t.about.heroText} current={t.nav.about} />

      <Section id="story">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <img
              src="/assets/water/water-lake-bottle.webp"
              alt={t.hero.productAlt}
              width={560}
              height={448}
              loading="lazy"
              className="w-full rounded-3xl object-cover shadow-lift"
            />
          </Reveal>
          <Reveal direction="left">
            <span className="text-overline text-primary">{t.about.storyOverline}</span>
            <h2 className="mt-2 font-display text-3xl leading-snug font-semibold sm:text-4xl">{t.about.storyTitle}</h2>
            <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-gray-600">
              {company.about.map((paragraph) => (
                <p key={paragraph.en}>{pick(paragraph)}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      <Section id="mission-vision">
        <SectionHeader overline={t.about.goalOverline} title={t.about.goalTitle} />
        <div className="grid gap-8 md:grid-cols-2">
          <Reveal delay={0.05} className="rounded-3xl bg-linear-to-br from-primary to-primary-light p-10 text-white">
            <Target aria-hidden className="mb-6 size-12 opacity-80" strokeWidth={1.5} />
            <h3 className="font-display text-2xl font-bold">{t.about.mission}</h3>
            <p className="mt-4 leading-relaxed text-white/90">{pick(company.mission)}</p>
          </Reveal>
          <Reveal delay={0.12} className="rounded-3xl border border-gray-100 bg-white p-10">
            <Eye aria-hidden className="mb-6 size-12 text-primary opacity-80" strokeWidth={1.5} />
            <h3 className="font-display text-2xl font-bold">{t.about.vision}</h3>
            <p className="mt-4 leading-relaxed text-gray-600">{pick(company.vision)}</p>
          </Reveal>
        </div>
      </Section>

      <Section muted id="values">
        <SectionHeader overline={t.about.valuesOverline} title={t.about.valuesTitle} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {company.values.map((value, index) => (
            <Reveal key={value.title.en} delay={(index % 3) * 0.08}>
              <FeatureCard icon={featureIcons[value.icon]} title={pick(value.title)} text={pick(value.text)} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="journey">
        <SectionHeader overline={t.about.journeyOverline} title={t.about.journeyTitle} />
        <ol className="relative mx-auto max-w-2xl ps-12 before:absolute before:inset-y-0 before:start-[15px] before:w-0.5 before:bg-linear-to-b before:from-primary before:via-secondary before:to-accent">
          {company.milestones.map((milestone) => (
            <Reveal as="li" key={milestone.year} className="group relative pb-12 last:pb-0">
              <span
                aria-hidden
                className="absolute -start-12 top-1 size-5 translate-x-[6px] rounded-full border-[3px] border-primary bg-white transition group-hover:scale-125 group-hover:bg-primary rtl:-translate-x-[6px]"
              />
              <span dir="ltr" className="block text-sm font-semibold tracking-wider text-primary">
                {milestone.year}
              </span>
              <h3 className="mt-1 font-display text-xl font-semibold">{pick(milestone.title)}</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-600">{pick(milestone.text)}</p>
            </Reveal>
          ))}
        </ol>
      </Section>
    </>
  );
}
