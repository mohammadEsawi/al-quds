import { ArrowRight, Quote } from 'lucide-react';
import { PersonPhoto } from '@/components/about/PersonPhoto';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { CardGridSkeleton, ErrorState } from '@/components/ui/States';
import type { TeamMember } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { messageParagraphs } from '@/lib/messages';
import { getTeam } from '@/services/content.service';

type Leader = 'chairman' | 'general-manager';

const linkClass =
  'group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lift';
const arrowClass = 'size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1';

/** The full message of the chairman or of the general manager, on its own quiet page. */
export default function MessagePage({ leader }: { leader: Leader }) {
  const { t, pick } = useI18n();
  const query = useAsync(() => getTeam(), []);
  const isChairman = leader === 'chairman';
  const heading = isChairman ? t.aboutNav.chairmanMessage : t.aboutNav.gmMessage;
  const otherHeading = isChairman ? t.aboutNav.gmMessage : t.aboutNav.chairmanMessage;
  const otherPath = isChairman ? '/about/gm-message' : '/about/chairman-message';
  const profilePath = isChairman ? '/about/board' : '/about/executive';
  const profileLabel = isChairman ? t.aboutNav.board : t.aboutNav.executive;
  useSeo({ title: heading, description: isChairman ? t.aboutNav.metaChairmanMessage : t.aboutNav.metaGmMessage });

  const member: TeamMember | undefined = isChairman ? query.data?.board.find((m) => m.role === 'chairman') : query.data?.executive.find((m) => m.role === 'general_manager');
  const name = member ? pick(member.name) : '';
  const paragraphs = messageParagraphs(member?.message && pick(member.message));

  return (
    <>
      <PageHero title={heading} text={name || undefined} current={heading} trail={[{ label: t.nav.about, to: '/about' }]} />

      <Section>
        {query.loading ? (
          <CardGridSkeleton count={1} />
        ) : query.error ? (
          <ErrorState onRetry={query.reload} />
        ) : (
          <div className="mx-auto max-w-3xl">
            <Reveal className="flex items-center gap-5">
              <PersonPhoto photo={member?.photo} name={name || heading} size="small" className="w-24 shrink-0 sm:w-28" />
              <div className="min-w-0">
                {member && <span className="text-overline text-primary">{pick(member.title)}</span>}
                {name && <h2 className="mt-1 font-display text-2xl leading-snug font-bold text-gray-900 sm:text-3xl">{name}</h2>}
                {member?.department && <p className="mt-0.5 text-gray-500">{pick(member.department)}</p>}
              </div>
            </Reveal>

            <span aria-hidden className="my-8 block h-px bg-linear-to-r from-primary/40 to-transparent" />

            {paragraphs.length === 0 ? (
              <p className="leading-loose text-gray-400 italic">{t.aboutNav.messagePending}</p>
            ) : (
              <div className="relative space-y-6 sm:ps-12">
                <Quote aria-hidden className="size-9 text-primary/20 sm:absolute sm:-start-1 sm:top-0" />
                {paragraphs.map((paragraph, i) => (
                  <Reveal key={paragraph} delay={i * 0.06}>
                    <p className={i === 0 ? 'text-xl leading-loose font-medium text-gray-800' : 'text-lg leading-loose text-gray-600'}>{paragraph}</p>
                  </Reveal>
                ))}

                <Reveal delay={0.1} className="pt-4">
                  <span aria-hidden className="mb-4 block h-1 w-12 rounded-full bg-primary" />
                  {name && <p className="font-display text-lg font-bold text-gray-900">{name}</p>}
                  {member && <p className="text-gray-500">{pick(member.title)}</p>}
                </Reveal>
              </div>
            )}

            <Reveal className="mt-14 grid gap-4 sm:grid-cols-2">
              <LocalizedLink to={otherPath} className={linkClass}>
                <span>
                  <span className="text-overline block text-gray-400">{t.aboutNav.alsoRead}</span>
                  <span className="font-semibold text-gray-900">{otherHeading}</span>
                </span>
                <ArrowRight aria-hidden className={arrowClass} />
              </LocalizedLink>
              <LocalizedLink to={profilePath} className={linkClass}>
                <span>
                  <span className="text-overline block text-gray-400">{t.aboutNav.getToKnow}</span>
                  <span className="font-semibold text-gray-900">{profileLabel}</span>
                </span>
                <ArrowRight aria-hidden className={arrowClass} />
              </LocalizedLink>
            </Reveal>
          </div>
        )}
      </Section>
    </>
  );
}
