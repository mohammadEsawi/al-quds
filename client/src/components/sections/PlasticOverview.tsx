import { ArrowRight, Cog, Ship, Users, type LucideIcon } from 'lucide-react';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { getProducts } from '@/services/content.service';
import { sectorIcons } from '@/components/ui/icons';

const owned: { key: 'import' | 'machines' | 'workers'; icon: LucideIcon }[] = [
  { key: 'import', icon: Ship },
  { key: 'machines', icon: Cog },
  { key: 'workers', icon: Users },
];

/**
 * Plastic page body: what the company makes (preform + cap cards that lead to their pages) and the
 * in-house manufacturing story (own imports, own machines, own workers).
 */
export function PlasticOverview() {
  const { t, pick } = useI18n();
  const copy = t.sectorPage.plastic;
  const preforms = useAsync(() => getProducts({ sector: 'preforms' }), []);
  // Sizes come from the product data, so a size added in the dashboard shows up here automatically.
  const sizes = (preforms.data ?? []).filter((p) => p.size).map((p) => ({ id: p.id, label: pick(p.size!) }));

  const cards = [
    { to: '/preforms', icon: sectorIcons.flask, title: copy.cards.preforms.title, text: copy.cards.preforms.text, chips: sizes, chipsLabel: copy.cards.preforms.sizesLabel, badge: undefined },
    { to: '/caps', icon: sectorIcons['circle-dot'], title: copy.cards.caps.title, text: copy.cards.caps.text, chips: [], chipsLabel: '', badge: copy.cards.caps.badge },
  ];

  return (
    <>
      <Section muted id="products">
        <SectionHeader overline={copy.productsOverline} title={copy.productsTitle} />
        <ul className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {cards.map(({ to, icon: Icon, title, text, chips, chipsLabel, badge }, index) => (
            <Reveal as="li" key={to} delay={index * 0.1}>
              <LocalizedLink
                to={to}
                className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-lift"
              >
                {badge && (
                  <span className="absolute end-6 top-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">{badge}</span>
                )}
                <span className="flex size-16 items-center justify-center rounded-xl bg-gray-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon aria-hidden className="size-8" strokeWidth={1.5} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-semibold text-gray-900">{title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-gray-600">{text}</p>
                {chips.length > 0 && (
                  <div className="mt-5">
                    <span className="text-overline text-accent">{chipsLabel}</span>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {chips.map((chip) => (
                        <li key={chip.id} className="rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
                          {chip.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all group-hover:gap-3">
                  {t.common.learnMore}
                  <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
                </span>
              </LocalizedLink>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section id="in-house">
        <SectionHeader overline={copy.ownedOverline} title={copy.ownedTitle} />
        <ul className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {owned.map(({ key, icon }, index) => (
            <Reveal as="li" key={key} delay={index * 0.08}>
              <FeatureCard icon={icon} title={copy.owned[key].title} text={copy.owned[key].text} />
            </Reveal>
          ))}
        </ul>
      </Section>
    </>
  );
}
