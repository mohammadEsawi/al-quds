import { ArrowRight, Quote } from 'lucide-react';
import { AboutTabs } from '@/components/about/AboutTabs';
import { PersonPhoto } from '@/components/about/PersonPhoto';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CardGridSkeleton, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { messageParagraphs } from '@/lib/messages';
import { getTeam } from '@/services/content.service';

/** مجلس الإدارة: the chairman with his message, then the other members of the board. */
export default function BoardPage() {
  const { t, pick } = useI18n();
  const query = useAsync(() => getTeam(), []);
  useSeo({ title: t.aboutNav.board, description: t.aboutNav.metaBoard });

  const board = query.data?.board ?? [];
  const chairman = board.find((m) => m.role === 'chairman');
  const others = board.filter((m) => m !== chairman);
  const chairmanName = chairman ? pick(chairman.name) : '';
  const excerpt = messageParagraphs(chairman?.message && pick(chairman.message))[0];

  return (
    <>
      <PageHero title={t.aboutNav.board} text={t.aboutNav.boardHeroText} current={t.aboutNav.board} trail={[{ label: t.nav.about, to: '/about' }]} />
      <div className="-mt-7 px-4">
        <AboutTabs className="relative z-10" />
      </div>

      <Section>
        {query.loading ? (
          <CardGridSkeleton count={1} />
        ) : query.error ? (
          <ErrorState onRetry={query.reload} />
        ) : (
          <>
            {chairman && (
              <article className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-14 lg:grid-cols-[minmax(0,20rem)_1fr]">
                <Reveal direction="right" className="mx-auto w-full max-w-xs md:max-w-none">
                  <PersonPhoto photo={chairman.photo} name={chairmanName || pick(chairman.title)} />
                </Reveal>
                <div>
                  <Reveal>
                    <span className="text-overline text-primary">{pick(chairman.title)}</span>
                    {chairmanName && <h2 className="mt-2 font-display text-3xl leading-snug font-bold text-gray-900">{chairmanName}</h2>}
                    {chairman.department && <p className="mt-1 text-gray-500">{pick(chairman.department)}</p>}
                    <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
                  </Reveal>

                  {chairman.bio.length > 0 && (
                    <div className="mt-6 space-y-4 leading-loose text-gray-600">
                      <span className="text-overline block text-gray-400">{t.aboutNav.experience}</span>
                      {chairman.bio.map((paragraph, i) => (
                        <Reveal key={paragraph.en || paragraph.ar} delay={0.08 + i * 0.08}>
                          <p>{pick(paragraph)}</p>
                        </Reveal>
                      ))}
                    </div>
                  )}

                  <Reveal delay={0.1} className="mt-8 rounded-2xl border border-gray-100 bg-gray-50/70 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-gray-900">{t.aboutNav.chairmanMessage}</h3>
                      <Quote aria-hidden className="size-6 shrink-0 text-primary/25" />
                    </div>
                    <p className={excerpt ? 'mt-3 line-clamp-3 leading-loose text-gray-600' : 'mt-3 leading-loose text-gray-400 italic'}>{excerpt || t.aboutNav.messagePending}</p>
                    {excerpt && (
                      <LocalizedLink to="/about/chairman-message" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary transition-all hover:gap-3">
                        {t.aboutNav.readFullMessage}
                        <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
                      </LocalizedLink>
                    )}
                  </Reveal>
                </div>
              </article>
            )}

            {others.length > 0 && (
              <div className="mt-24">
                <SectionHeader overline={t.aboutNav.board} title={t.aboutNav.boardMembers} />
                <ul className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {others.map((member, index) => (
                    <Reveal as="li" key={member.id} delay={(index % 3) * 0.08}>
                      <PersonPhoto photo={member.photo} name={pick(member.name)} />
                      <h3 className="mt-4 font-display text-lg font-semibold">{pick(member.name)}</h3>
                      <p className="text-sm text-gray-500">{pick(member.title)}</p>
                      {member.bio.length > 0 && <p className="mt-2 text-sm leading-relaxed text-gray-600">{pick(member.bio[0]!)}</p>}
                    </Reveal>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Section>
    </>
  );
}
