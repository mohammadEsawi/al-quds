import { Eye, Target } from 'lucide-react';
import { AboutTabs } from '@/components/about/AboutTabs';
import { ButtonLink } from '@/components/ui/Button';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CardGridSkeleton, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getAboutPage } from '@/services/content.service';

/** "About Lamico for Industrial Investment and Supplies": who we are, vision, mission and the strategic goals. */
export default function AboutPage() {
  const { t, pick } = useI18n();
  const query = useAsync(() => getAboutPage(), []);
  const about = query.data;
  useSeo({ title: t.aboutNav.company, description: t.aboutNav.metaCompany });

  return (
    <>
      <PageHero title={t.aboutNav.company} text={t.aboutNav.companyHeroText} current={t.nav.about} />

      <div className="-mt-7 px-4">
        <AboutTabs className="relative z-10" />
      </div>

      {query.loading && (
        <Section>
          <CardGridSkeleton count={3} />
        </Section>
      )}
      {query.error && (
        <Section>
          <ErrorState onRetry={query.reload} />
        </Section>
      )}

      {about && (
        <>
          <Section id="company">
            <div className="mx-auto max-w-3xl">
              <Reveal>
                <span className="text-overline text-primary">{t.aboutNav.whoWeAre}</span>
                <h2 className="mt-2 font-display text-3xl leading-snug font-bold sm:text-4xl">{pick(about.companyName)}</h2>
                <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
              </Reveal>
              <div className="mt-8 space-y-6 border-primary/15 text-lg leading-loose text-gray-600 ps-6 md:border-s-2 md:ps-8">
                {about.intro.map((paragraph, index) => (
                  <Reveal key={paragraph.en || paragraph.ar} delay={Math.min(index * 0.05, 0.2)}>
                    <p className={index === 0 ? 'text-xl font-light text-gray-800' : undefined}>{pick(paragraph)}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </Section>

          <Section muted id="vision-mission">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              <Reveal direction="right" className="rounded-3xl border border-gray-100 bg-white p-8 shadow-card sm:p-10">
                <Eye aria-hidden className="size-10 text-primary" strokeWidth={1.5} />
                <span className="text-overline mt-5 block text-primary">{t.aboutNav.vision}</span>
                <h3 className="mt-2 font-display text-2xl leading-snug font-bold">{pick(about.vision.title)}</h3>
                <p className="mt-4 leading-loose text-gray-600">{pick(about.vision.text)}</p>
              </Reveal>
              <Reveal direction="left" className="rounded-3xl bg-linear-to-br from-primary to-primary-light p-8 text-white shadow-primary sm:p-10">
                <Target aria-hidden className="size-10 text-white/80" strokeWidth={1.5} />
                <span className="text-overline mt-5 block text-white/70">{t.aboutNav.mission}</span>
                <h3 className="mt-2 font-display text-2xl leading-snug font-bold">{pick(about.mission.title)}</h3>
                <p className="mt-4 leading-loose text-white/90">{pick(about.mission.text)}</p>
              </Reveal>
            </div>
          </Section>

          <Section id="goals">
            <SectionHeader overline={t.aboutNav.goalsOverline} title={t.aboutNav.goalsTitle} />
            <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {about.goals.map((goal, index) => (
                <Reveal as="li" key={goal.title.en || goal.title.ar} delay={(index % 4) * 0.07}>
                  <div className="group h-full rounded-2xl border border-gray-100 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                    <span dir="ltr" className="font-display text-3xl font-bold text-primary/25 transition-colors group-hover:text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-3 font-display text-lg font-semibold text-gray-900">{pick(goal.title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{pick(goal.text)}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Section>

          <Section muted>
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.aboutNav.nextTitle}</h2>
              <p className="mt-3 text-gray-600">{t.aboutNav.nextText}</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink to="/about/board" variant="secondary">
                  {t.aboutNav.board}
                </ButtonLink>
                <ButtonLink to="/about/executive" arrow>
                  {t.aboutNav.executive}
                </ButtonLink>
              </div>
            </Reveal>
          </Section>
        </>
      )}
    </>
  );
}

