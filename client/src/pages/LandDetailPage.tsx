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
import { getLand } from '@/services/content.service';

export default function LandDetailPage() {
  const { slug = '' } = useParams();
  const { t, pick, format } = useI18n();
  const query = useAsync(() => getLand(slug), [slug]);
  const land = query.data;

  useSeo({
    title: land ? pick(land.title) : t.lands.notFoundTitle,
    description: land?.description[0] ? pick(land.description[0]) : undefined,
    image: land?.featuredImage,
    noindex: !land && !query.loading,
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
  if (!land) {
    return (
      <Section className="pt-40">
        <EmptyState
          heading="h1"
          title={t.lands.notFoundTitle}
          text={t.lands.notFoundText}
          action={<ButtonLink to="/lands">{t.lands.backToLands}</ButtonLink>}
        />
      </Section>
    );
  }

  const name = pick(land.title);
  const videos = land.gallery.filter((g) => g.kind === 'video');
  const photos = land.gallery.filter((g) => g.kind !== 'video');

  return (
    <>
      <PageHero title={name} text={land.area ? pick(land.area) : undefined} current={name} trail={[{ label: t.nav.lands, to: '/lands' }]}>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-5 py-3 text-sm font-medium text-gray-200">
          <MapPin aria-hidden className="size-[18px]" />
          {pick(land.location)}
        </p>
      </PageHero>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <img src={land.featuredImage} alt={name} className="mx-auto max-h-[640px] w-full max-w-md rounded-3xl object-cover shadow-deep" />
          </Reveal>
          <Reveal direction="left">
            <span className="text-overline text-primary">{t.lands.aboutLand}</span>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{name}</h2>
            <span aria-hidden className="mt-4 block h-1 w-12 rounded-full bg-primary" />
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-gray-600">
              {land.description.map((paragraph) => (
                <p key={paragraph.en}>{pick(paragraph)}</p>
              ))}
            </div>

            {land.features.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-4 font-display text-lg font-semibold">{t.lands.featuresTitle}</h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {land.features.map((feature) => (
                    <li key={feature.en} className="flex items-center gap-3">
                      <CheckCircle2 aria-hidden className="size-5 shrink-0 text-primary" />
                      {pick(feature)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={`tel:${land.contactPhone}`}
              dir="ltr"
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-3 font-semibold text-gray-900 hover:bg-gray-100"
            >
              <Phone aria-hidden className="size-5 text-primary" />
              {land.contactPhone}
            </a>
          </Reveal>
        </div>
      </Section>

      {videos.length > 0 && (
        <Section id="videos">
          <SectionHeader overline={t.lands.videosOverline} title={t.lands.videosTitle} />
          <Gallery images={videos} tileAspect="9/16" columns={`mx-auto max-w-3xl grid-cols-1 ${videos.length > 1 ? 'sm:grid-cols-2' : ''} ${videos.length > 2 ? 'lg:grid-cols-3' : ''}`} />
        </Section>
      )}

      {photos.length > 0 && (
        <Section muted id="gallery">
          <SectionHeader overline={t.lands.galleryOverline} title={t.lands.gallery} />
          <Gallery images={photos} />
        </Section>
      )}

      <Section>
        <InquiryCta
          title={t.lands.inquiryTitle}
          text={t.lands.inquiryText}
          whatsappNumber={land.whatsappNumber}
          whatsappMessage={format(t.lands.inquiryMessage, { name })}
        />
      </Section>
    </>
  );
}
