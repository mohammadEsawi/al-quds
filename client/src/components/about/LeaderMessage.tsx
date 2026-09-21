import { ArrowRight, Quote } from 'lucide-react';
import { PersonPhoto } from '@/components/about/PersonPhoto';
import { Reveal } from '@/components/ui/Reveal';
import type { TeamMember } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { messageParagraphs } from '@/lib/messages';

interface LeaderMessageProps {
  /** "Chairman's message" / "General Manager's message". */
  heading: string;
  member: TeamMember | undefined;
  /** The page with the full message. */
  to: string;
  delay?: number;
}

/**
 * A leader's message on the homepage: a small portrait, the opening of the message and a link to read the rest
 * on its own page. Shows a calm "coming soon" until the text is entered.
 */
export function LeaderMessage({ heading, member, to, delay = 0 }: LeaderMessageProps) {
  const { t, pick } = useI18n();
  const name = member ? pick(member.name) : '';
  const excerpt = messageParagraphs(member?.message && pick(member.message))[0];

  return (
    <Reveal delay={delay} className="h-full">
      <article className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-card transition-shadow hover:shadow-lift sm:p-8">
        <h3 className="font-display text-xl font-bold text-gray-900">{heading}</h3>
        <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-primary" />

        <div className="mt-6 flex items-center gap-4">
          <PersonPhoto photo={member?.photo} name={name || heading} size="small" className="w-16 shrink-0 sm:w-20" />
          <p className="min-w-0">
            {name && <span className="block font-semibold text-gray-900">{name}</span>}
            {member && <span className="block text-sm text-gray-500">{pick(member.title)}</span>}
          </p>
        </div>

        <div className="relative mt-5 flex-1">
          <Quote aria-hidden className="absolute -start-1 -top-1 size-6 text-primary/20" />
          <p className={excerpt ? 'line-clamp-5 ps-8 leading-loose text-gray-600' : 'ps-8 leading-loose text-gray-400 italic'}>{excerpt || t.aboutNav.messagePending}</p>
        </div>

        {excerpt && (
          <LocalizedLink to={to} className="mt-6 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-primary/5 px-5 text-sm font-semibold text-primary transition-all hover:gap-3 hover:bg-primary hover:text-white">
            {t.aboutNav.readFullMessage}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
          </LocalizedLink>
        )}
      </article>
    </Reveal>
  );
}
