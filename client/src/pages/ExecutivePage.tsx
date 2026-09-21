import { ArrowRight } from 'lucide-react';
import { AboutTabs } from '@/components/about/AboutTabs';
import { PersonPhoto } from '@/components/about/PersonPhoto';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import type { TeamMember } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';
import { getTeam } from '@/services/content.service';

/** One executive: portrait on one side, title, name and experience on the other; sides alternate and everything eases in on scroll. */
function ExecutiveRow({ member, index }: { member: TeamMember; index: number }) {
  const { t, pick } = useI18n();
  const name = pick(member.name);
  const flipped = index % 2 === 1;

  return (
    <article
      className={cn(
        'mx-auto grid max-w-5xl items-center gap-8 md:gap-14',
        // the photo column keeps its width on whichever side the photo is
        flipped ? 'md:grid-cols-[1fr_minmax(0,17rem)] lg:grid-cols-[1fr_minmax(0,20rem)]' : 'md:grid-cols-[minmax(0,17rem)_1fr] lg:grid-cols-[minmax(0,20rem)_1fr]',
      )}
    >
      <Reveal direction={flipped ? 'left' : 'right'} className={cn('mx-auto w-full max-w-[15rem] md:max-w-none', flipped && 'md:order-2')}>
        <PersonPhoto photo={member.photo} name={name} />
      </Reveal>

      <div className={cn(flipped && 'md:order-1')}>
        <Reveal>
          <span className="text-overline text-primary">{pick(member.title)}</span>
          <h2 className="mt-2 font-display text-3xl leading-snug font-bold text-gray-900">{name}</h2>
          {member.department && <p className="mt-1 text-gray-500">{pick(member.department)}</p>}
          <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
        </Reveal>

        {member.bio.length > 0 && (
          <div className="mt-6 space-y-4 leading-loose text-gray-600">
            <span className="text-overline block text-gray-400">{t.aboutNav.experience}</span>
            {member.bio.map((paragraph, i) => (
              <Reveal key={paragraph.en || paragraph.ar} delay={0.08 + i * 0.08}>
                <p>{pick(paragraph)}</p>
              </Reveal>
            ))}
          </div>
        )}

        {member.role === 'general_manager' && member.message && (
          <Reveal delay={0.2} className="mt-6">
            <LocalizedLink to="/about/gm-message" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary/5 px-5 text-sm font-semibold text-primary transition-all hover:gap-3 hover:bg-primary hover:text-white">
              {t.aboutNav.gmMessage}
              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
            </LocalizedLink>
          </Reveal>
        )}
      </div>
    </article>
  );
}

/** الإدارة التنفيذية */
export default function ExecutivePage() {
  const { t } = useI18n();
  const query = useAsync(() => getTeam(), []);
  useSeo({ title: t.aboutNav.executive, description: t.aboutNav.metaExecutive });

  return (
    <>
      <PageHero title={t.aboutNav.executive} text={t.aboutNav.executiveHeroText} current={t.aboutNav.executive} trail={[{ label: t.nav.about, to: '/about' }]} />
      <div className="-mt-7 px-4">
        <AboutTabs className="relative z-10" />
      </div>

      <Section>
        {query.loading ? (
          <CardGridSkeleton count={3} />
        ) : query.error ? (
          <ErrorState onRetry={query.reload} />
        ) : !query.data?.executive.length ? (
          <EmptyState />
        ) : (
          <div className="space-y-20 sm:space-y-28">
            {query.data.executive.map((member, index) => (
              <ExecutiveRow key={member.id} member={member} index={index} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
