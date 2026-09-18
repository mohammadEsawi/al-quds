import { PageHero } from '@/components/ui/PageHero';
import { Section } from '@/components/ui/Section';
import { SectorsGrid } from '@/components/sections/SectorsGrid';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

export default function SectorsPage() {
  const { t } = useI18n();
  useSeo({ title: t.sectors.pageTitle, description: t.sectors.metaDescription });

  return (
    <>
      <PageHero title={t.sectors.pageTitle} text={t.sectors.pageText} current={t.nav.sectors} />
      <Section>
        <SectorsGrid />
      </Section>
    </>
  );
}
