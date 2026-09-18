import { MapPin } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getRealEstateProjects } from '@/services/content.service';

export default function RealEstatePage() {
  const { t, pick } = useI18n();
  const query = useAsync(getRealEstateProjects);
  useSeo({ title: t.nav.realEstate, description: t.realEstate.metaDescription, image: '/assets/real-estate/academy-house.webp' });

  return (
    <>
      <PageHero
        title={t.realEstate.heroTitle}
        text={t.realEstate.heroText}
        current={t.nav.realEstate}
        trail={[{ label: t.nav.sectors, to: '/sectors' }]}
      />

      <Section>
        <SectionHeader overline={t.realEstate.overline} title={t.realEstate.listTitle} text={t.realEstate.listText} />
        {query.loading && <CardGridSkeleton count={2} />}
        {query.error && <ErrorState onRetry={query.reload} />}
        {query.data && query.data.length === 0 && <EmptyState />}

        <div className="space-y-16">
          {query.data?.map((project, index) => (
            <Reveal key={project.id}>
              <article className="grid items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card lg:grid-cols-2">
                <img
                  src={project.featuredImage}
                  alt={pick(project.name)}
                  loading="lazy"
                  className={`h-full max-h-[560px] w-full object-cover ${index % 2 ? 'lg:order-2' : ''}`}
                />
                <div className="p-8 sm:p-12">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {t.realEstate.status[project.status]}
                  </span>
                  <h3 className="mt-4 font-display text-3xl font-bold">{pick(project.name)}</h3>
                  {project.tagline && <p className="mt-1 font-display text-xl text-gray-500">{pick(project.tagline)}</p>}
                  <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin aria-hidden className="size-4 text-primary" />
                    {pick(project.location)}
                  </p>
                  <p className="mt-5 leading-relaxed text-gray-600">{pick(project.description[0]!)}</p>
                  <ButtonLink to={`/real-estate/${project.slug}`} arrow className="mt-8">
                    {t.common.viewProject}
                  </ButtonLink>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
