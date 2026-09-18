import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import { ProductGrid } from '@/components/sections/ProductGrid';
import { useSiteData } from '@/context/SiteData';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';
import { whatsappLink } from '@/lib/whatsapp';
import { getFoodOverview } from '@/services/content.service';

export default function FoodPage() {
  const { t } = useI18n();
  const { company } = useSiteData();
  const overview = useAsync(getFoodOverview);
  useSeo({ title: t.nav.food, description: t.food.metaDescription, image: '/assets/food/all-products.webp' });

  return (
    <>
      <PageHero title={t.food.heroTitle} text={t.food.heroText} current={t.nav.food} trail={[{ label: t.nav.sectors, to: '/sectors' }]} />

      {/* Warm, natural tone for the food range */}
      <Section className="bg-[#faf7f2]">
        <SectionHeader overline={t.food.overline} title={t.food.title} text={t.food.text} />
        {overview.data && (
          <Reveal className="mx-auto mb-16 max-w-4xl">
            <img
              src={overview.data.image}
              alt={t.food.allProductsAlt}
              width={900}
              height={507}
              loading="lazy"
              className="w-full rounded-3xl shadow-lift"
            />
          </Reveal>
        )}
        <ProductGrid sector="food" />

        <Reveal className="mt-16 text-center">
          <p className="mb-6 text-xl font-light text-gray-600">{t.food.ctaText}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <ButtonLink to="/contact" size="lg" arrow>
              {t.common.contactUs}
            </ButtonLink>
            <ButtonAnchor
              href={whatsappLink(company.whatsapp.general.number, t.food.whatsappMessage)}
              variant="whatsapp"
              size="lg"
            >
              <WhatsAppIcon className="size-5" />
              {t.common.whatsapp}
            </ButtonAnchor>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
