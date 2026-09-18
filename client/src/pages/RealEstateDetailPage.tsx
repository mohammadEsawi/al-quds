import { CheckCircle2, MapPin, Phone } from 'lucide-react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { Gallery } from '@/components/ui/Gallery';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { InquiryCta } from '@/components/sections/InquiryCta';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getRealEstateProject } from '@/services/content.service';

export default function RealEstateDetailPage() {
  const { slug = '' } = useParams();
  const { t, pick, format } = useI18n();
  const query = useAsync(() => getRealEstateProject(slug), [slug]);
  const project = query.data;

  useSeo({
    title: project ? pick(project.name) : t.realEstate.notFoundTitle,
    description: project ? pick(project.description[0]!) : undefined,
    image: project?.featuredImage,
    noindex: !project && !query.loading,
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
  if (!project) {
    return (
      <Section className="pt-40">
        <EmptyState
          heading="h1"
          title={t.realEstate.notFoundTitle}
          text={t.realEstate.notFoundText}
          action={<ButtonLink to="/real-estate">{t.realEstate.backToProjects}</ButtonLink>}
        />
      </Section>
    );
  }

  const name = pick(project.name);

  return (
    <>
      <PageHero
        title={name}
        text={project.tagline ? pick(project.tagline) : undefined}
        current={name}
        trail={[{ label: t.nav.realEstate, to: '/real-estate' }]}
      >
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-5 py-3 text-sm font-medium text-gray-200">
          <MapPin aria-hidden className="size-[18px]" />
          {pick(project.location)}
        </p>
      </PageHero>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <img
              src={project.featuredImage}
              alt={name}
              className="mx-auto max-h-[640px] w-full max-w-md rounded-3xl object-cover shadow-deep"
            />
          </Reveal>
          <Reveal direction="left">
            <span className="text-overline text-primary">{t.realEstate.aboutProject}</span>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{name}</h2>
            <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-gray-600">
              {project.description.map((paragraph) => (
                <p key={paragraph.en}>{pick(paragraph)}</p>
              ))}
            </div>

            {project.features.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-4 font-display text-lg font-semibold">{t.realEstate.featuresTitle}</h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {project.features.map((feature) => (
                    <li key={feature.en} className="flex items-center gap-3">
                      <CheckCircle2 aria-hidden className="size-5 shrink-0 text-primary" />
                      {pick(feature)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={`tel:${project.contactPhone}`}
              dir="ltr"
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-3 font-semibold text-gray-900 hover:bg-gray-100"
            >
              <Phone aria-hidden className="size-5 text-primary" />
              {project.contactPhone}
            </a>
          </Reveal>
        </div>
      </Section>

      {project.gallery.length > 0 && (
        <Section muted id="gallery">
          <SectionHeader overline={t.realEstate.galleryOverline} title={t.realEstate.gallery} />
          <Gallery images={project.gallery} />
        </Section>
      )}

      <Section>
        <InquiryCta
          title={t.realEstate.inquiryTitle}
          text={t.realEstate.inquiryText}
          whatsappNumber={project.whatsappNumber}
          whatsappMessage={format(t.realEstate.inquiryMessage, { name })}
        />
      </Section>
    </>
  );
}
