import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { getRealEstateProjects } from '@/services/content.service';

/** Homepage teaser for the featured (first) real-estate project. */
export function RealEstateTeaser() {
  const { t, pick } = useI18n();
  const { data, loading } = useAsync(getRealEstateProjects);
  const project = data?.[0];

  return (
    <Section muted id="real-estate">
      {loading || !project ? (
        <Skeleton className="mx-auto h-96 max-w-4xl" />
      ) : (
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <img
              src={project.featuredImage}
              alt={pick(project.name)}
              width={560}
              height={800}
              loading="lazy"
              className="mx-auto max-h-[620px] w-full max-w-md rounded-3xl object-cover shadow-lift"
            />
          </Reveal>
          <Reveal direction="left" className="text-center lg:text-start">
            <span className="text-overline text-primary">{t.home.realEstateOverline}</span>
            <h2 className="mt-2 font-display text-3xl leading-tight font-bold sm:text-5xl">{pick(project.name)}</h2>
            {project.tagline && <p className="mt-1 font-display text-2xl text-gray-500">{pick(project.tagline)}</p>}
            <span aria-hidden className="mx-auto mt-4 block h-1 w-12 rounded-full bg-primary lg:mx-0" />
            <p className="mt-6 text-xl leading-relaxed font-light text-gray-600">{pick(project.description[0]!)}</p>
            <div className="my-8 grid grid-cols-3 gap-3">
              {project.gallery.slice(0, 3).map((image) => (
                <img
                  key={image.src}
                  src={image.src}
                  alt={pick(image.caption)}
                  loading="lazy"
                  className="aspect-3/4 w-full rounded-xl object-cover"
                />
              ))}
            </div>
            <ButtonLink to={`/real-estate/${project.slug}`} arrow>
              {t.common.viewProject}
            </ButtonLink>
          </Reveal>
        </div>
      )}
    </Section>
  );
}
