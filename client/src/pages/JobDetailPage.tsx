import { Briefcase, Building2, CalendarClock, MapPin } from 'lucide-react';
import { useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { JobApplicationForm } from '@/components/sections/JobApplicationForm';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import type { LocalizedText } from '@/i18n/types';
import { getJob } from '@/services/content.service';

function ListBlock({ title, items }: { title: string; items: LocalizedText[] }) {
  const { pick } = useI18n();
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-3 font-display text-xl font-semibold">{title}</h3>
      <ul className="list-disc space-y-2 ps-6 text-gray-600 marker:text-primary">
        {items.map((item, index) => (
          <li key={index}>{pick(item)}</li>
        ))}
      </ul>
    </div>
  );
}

export default function JobDetailPage() {
  const { slug = '' } = useParams();
  const { t, pick, locale } = useI18n();
  const query = useAsync(() => getJob(slug), [slug]);
  const job = query.data;

  useSeo({
    title: job ? pick(job.title) : t.careers.notFoundTitle,
    description: job ? pick(job.description) : undefined,
    noindex: !job && !query.loading,
  });

  if (query.loading) {
    return (
      <Section className="pt-40">
        <Skeleton className="mx-auto h-96 max-w-4xl" />
      </Section>
    );
  }
  if (query.error) {
    return (
      <Section className="pt-40">
        <ErrorState onRetry={query.reload} />
      </Section>
    );
  }
  if (!job) {
    return (
      <Section className="pt-40">
        <EmptyState
          heading="h1"
          title={t.careers.notFoundTitle}
          text={t.careers.notFoundText}
          action={<ButtonLink to="/careers">{t.careers.backToJobs}</ButtonLink>}
        />
      </Section>
    );
  }

  const title = pick(job.title);
  const deadline = job.deadline
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-PS-u-nu-latn' : 'en-GB', { dateStyle: 'long' }).format(
        new Date(job.deadline),
      )
    : null;

  const meta = [
    { icon: Building2, label: t.careers.department, value: pick(job.department) },
    { icon: MapPin, label: t.careers.location, value: pick(job.location) },
    { icon: Briefcase, label: t.careers.employmentType, value: t.careers.types[job.employmentType] },
    deadline && { icon: CalendarClock, label: t.careers.deadline, value: deadline },
  ].filter(Boolean) as { icon: typeof Building2; label: string; value: string }[];

  return (
    <>
      <PageHero title={title} current={title} trail={[{ label: t.nav.careers, to: '/careers' }]}>
        <Button
          size="lg"
          variant="white"
          className="mt-8"
          onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {t.careers.apply}
        </Button>
      </PageHero>

      <Section>
        <div className="mx-auto max-w-4xl">
          {job.isPlaceholder && (
            <p className="mb-8 rounded-xl bg-primary/8 px-5 py-3 text-center text-sm font-semibold text-primary">
              {t.common.sample}
            </p>
          )}

          <Reveal>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-gray-50 p-4">
                  <dt className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                    <Icon aria-hidden className="size-4" />
                    {label}
                  </dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal className="mt-12 space-y-10">
            <div>
              <h3 className="mb-3 font-display text-xl font-semibold">{t.careers.description}</h3>
              <p className="leading-relaxed text-gray-600">{pick(job.description)}</p>
            </div>
            <ListBlock title={t.careers.responsibilities} items={job.responsibilities} />
            <ListBlock title={t.careers.requirements} items={job.requirements} />
            <ListBlock title={t.careers.benefits} items={job.benefits} />
          </Reveal>
        </div>
      </Section>

      <Section muted id="apply">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold">{t.careers.applyTitle}</h2>
            <p className="mt-3 text-gray-600">{t.careers.applyText}</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-lift sm:p-10">
            <JobApplicationForm jobId={job.id} position={title} />
          </div>
        </div>
      </Section>
    </>
  );
}
