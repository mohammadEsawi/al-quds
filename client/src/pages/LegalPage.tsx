import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/States';
import { useSiteData } from '@/context/SiteData';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { getLegalDocument } from '@/services/content.service';

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  const query = useAsync(() => getLegalDocument(kind), [kind]);
  const title = kind === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle;
  useSeo({ title, description: title });

  const doc = query.data;

  return (
    <>
      <PageHero
        title={title}
        text={doc ? `${t.legal.lastUpdated}: ${pick(doc.updated)}` : undefined}
        current={title}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          {!doc && <Skeleton className="h-96" />}
          {doc?.sections.map((section) => (
            <Reveal key={section.heading.en} className="mb-12">
              <h2 className="mb-4 font-display text-2xl font-semibold">{pick(section.heading)}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p.en} className="mb-3 leading-loose text-gray-600">
                  {pick(p)}
                </p>
              ))}
              {section.items && (
                <ul className="list-disc space-y-1 ps-6 leading-loose text-gray-600 marker:text-primary">
                  {section.items.map((item) => (
                    <li key={item.en}>{pick(item)}</li>
                  ))}
                </ul>
              )}
            </Reveal>
          ))}

          <Reveal>
            <h2 className="mb-4 font-display text-2xl font-semibold">{t.legal.contactTitle}</h2>
            <p className="leading-loose text-gray-600">
              {t.contact.email}:{' '}
              <a href={`mailto:${company.email}`} dir="ltr" className="font-medium text-accent hover:underline">
                {company.email}
              </a>
              <br />
              {t.contact.phone}:{' '}
              <a href={`tel:${company.phone}`} dir="ltr" className="font-medium text-accent hover:underline">
                {company.phoneDisplay}
              </a>
            </p>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
