import { ArrowRight } from 'lucide-react';
import { AboutTabs, useAboutTabs } from '@/components/about/AboutTabs';
import { LeaderMessage } from '@/components/about/LeaderMessage';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { getAboutPage, getTeam } from '@/services/content.service';

/**
 * Homepage "About the company": the three small tabs (About · Board · Executive management),
 * each opening its own page, then the chairman's and the general manager's messages.
 */
export function AboutHome() {
  const { t, pick } = useI18n();
  const tabs = useAboutTabs();
  const about = useAsync(() => getAboutPage(), []);
  const team = useAsync(() => getTeam(), []);
  const chairman = team.data?.board.find((m) => m.role === 'chairman');
  const generalManager = team.data?.executive.find((m) => m.role === 'general_manager');

  return (
    <Section id="about">
      <SectionHeader overline={t.aboutNav.homeOverline} title={about.data ? pick(about.data.companyName) : t.aboutNav.company} text={t.aboutNav.homeText} />

      {/* Phones and tablets: three compact cards. Desktop: the same three as tabs. */}
      <ul className="mx-auto mb-14 grid max-w-4xl gap-3 sm:grid-cols-3 lg:hidden">
        {tabs.map(({ to, label, icon: Icon, text }, index) => (
          <Reveal as="li" key={to} delay={index * 0.06}>
            <LocalizedLink to={to} className="group flex h-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lift">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{label}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500">{text}</span>
              </span>
              <ArrowRight aria-hidden className="ms-auto size-4 shrink-0 text-gray-300 rtl:rotate-180" />
            </LocalizedLink>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mb-14 max-lg:hidden">
        <AboutTabs />
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-2">
        <LeaderMessage heading={t.aboutNav.chairmanMessage} member={chairman} to="/about/chairman-message" />
        <LeaderMessage heading={t.aboutNav.gmMessage} member={generalManager} to="/about/gm-message" delay={0.1} />
      </div>
    </Section>
  );
}
