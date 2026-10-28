import { MapPin } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getLands } from '@/services/content.service';

/** Lands for sale — its own section, separate from the RealEstatePage's building projects. */
export default function LandsPage() {
  const { t, pick } = useI18n();
  const query = useAsync(getLands);
  useSeo({ title: t.nav.lands, description: t.lands.metaDescription });

  return (
    <>
      <PageHero
        title={t.lands.heroTitle}
        text={t.lands.heroText}
        current={t.nav.lands}
        trail={[{ label: t.nav.realEstate, to: '/real-estate' }]}
      />

      <Section>
        <SectionHeader overline={t.lands.overline} title={t.lands.listTitle} text={t.lands.listText} />
        {query.loading && <CardGridSkeleton count={2} />}
        {query.error && <ErrorState onRetry={query.reload} />}
        {query.data && query.data.length === 0 && <EmptyState />}

        <div className="space-y-16">
          {query.data?.map((land, index) => (
            <Reveal key={land.id}>
              <article className="grid items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card lg:grid-cols-2">
                <div className={`flex h-full max-h-[720px] items-center justify-center bg-gray-50 p-4 ${index % 2 ? 'lg:order-2' : ''}`}>
                  <img
                    src={land.featuredImage}
                    alt={pick(land.title)}
                    loading="lazy"
                    className="max-h-[680px] w-full object-contain"
                  />
                </div>
                <div className="p-8 sm:p-12">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {t.lands.status[land.status]}
                  </span>
                  <h3 className="mt-4 font-display text-3xl font-bold">{pick(land.title)}</h3>
                  {land.area && <p className="mt-1 font-display text-xl text-gray-500">{pick(land.area)}</p>}
                  <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin aria-hidden className="size-4 text-primary" />
                    {pick(land.location)}
                  </p>
                  {land.description[0] && <p className="mt-5 leading-relaxed text-gray-600">{pick(land.description[0])}</p>}
                  <ButtonLink to={`/lands/${land.slug}`} arrow className="mt-8">
                    {t.lands.viewLand}
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
