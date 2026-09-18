import { Briefcase, Clock, MapPin } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { JobApplicationForm } from '@/components/sections/JobApplicationForm';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { getJobs } from '@/services/content.service';
import type { Job } from '@/content/types';

export function JobCard({ job }: { job: Job }) {
  const { t, pick, locale } = useI18n();
  const deadline = job.deadline
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-PS-u-nu-latn' : 'en-GB', { dateStyle: 'medium' }).format(
        new Date(job.deadline),
      )
    : null;

  return (
    <LocalizedLink
      to={`/careers/${job.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-overline text-accent">{pick(job.department)}</span>
        {job.isPlaceholder && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t.common.sample}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold">{pick(job.title)}</h3>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
        <li className="flex items-center gap-2">
          <MapPin aria-hidden className="size-4 text-gray-400" />
          {pick(job.location)}
        </li>
        <li className="flex items-center gap-2">
          <Briefcase aria-hidden className="size-4 text-gray-400" />
          {t.careers.types[job.employmentType]}
        </li>
        {deadline && (
          <li className="flex items-center gap-2">
            <Clock aria-hidden className="size-4 text-gray-400" />
            {t.careers.deadline}: {deadline}
          </li>
        )}
      </ul>
      <span className="mt-5 text-sm font-semibold text-primary">{t.careers.details}</span>
    </LocalizedLink>
  );
}

export default function CareersPage() {
  const { t } = useI18n();
  const query = useAsync(getJobs);
  useSeo({ title: t.nav.careers, description: t.careers.metaDescription });

  return (
    <>
      <PageHero title={t.careers.heroTitle} text={t.careers.heroText} current={t.nav.careers} />

      <Section id="jobs">
        <SectionHeader overline={t.careers.listOverline} title={t.careers.listTitle} />
        {query.loading && <CardGridSkeleton />}
        {query.error && <ErrorState onRetry={query.reload} />}
        {query.data && query.data.length === 0 && (
          <EmptyState title={t.careers.emptyTitle} text={t.careers.emptyText} />
        )}
        {query.data && query.data.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((job, index) => (
              <Reveal as="li" key={job.id} delay={(index % 3) * 0.08}>
                <JobCard job={job} />
              </Reveal>
            ))}
          </ul>
        )}
      </Section>

      <Section muted id="apply">
        <div className="mx-auto max-w-3xl">
          <SectionHeader title={t.careers.generalTitle} text={t.careers.generalText} />
          <Reveal className="rounded-3xl bg-white p-6 shadow-lift sm:p-10">
            <JobApplicationForm jobId="general" />
          </Reveal>
          <p className="mt-6 text-center">
            <ButtonLink to="/contact" variant="ghost">
              {t.common.contactUs}
            </ButtonLink>
          </p>
        </div>
      </Section>
    </>
  );
}
