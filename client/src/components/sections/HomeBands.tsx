import { MapPin } from 'lucide-react';
import { Counter } from '@/components/ui/Counter';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { useSiteData } from '@/context/SiteData';
import { useI18n } from '@/i18n/I18nProvider';

/** Statistics on the brand-blue band. The numbers come from the company settings. */
export function StatsBand() {
  const { t } = useI18n();
  const { company } = useSiteData();
  const labels = {
    years: t.home.statsYears,
    cities: t.home.statsCities,
    bottles: t.home.statsBottles,
    team: t.home.statsTeam,
  } as const;

  return (
    <section className="relative bg-primary py-16 text-white sm:py-20">
      <div aria-hidden className="absolute inset-0 bg-linear-to-br from-black/10 to-transparent" />
      <div className="container-x relative">
        <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
          {company.stats.map((stat, index) => (
            <Reveal
              key={stat.key}
              delay={index * 0.08}
              className="px-4 text-center lg:[&:not(:last-child)]:border-e lg:[&:not(:last-child)]:border-white/10"
            >
              <dd className="font-display text-4xl font-bold sm:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </dd>
              <dt className="mt-2 text-sm font-medium text-white/70">{labels[stat.key]}</dt>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Dark band listing every covered city. */
export function CitiesBand() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();

  return (
    <section className="bg-linear-to-br from-gray-900 to-gray-800 py-16 text-white sm:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <Reveal direction="right" className="text-center lg:text-start">
          <span className="text-overline text-secondary-light">{t.home.citiesOverline}</span>
          <h2 className="mt-2 font-display text-3xl leading-tight font-bold sm:text-5xl">{t.home.citiesTitle}</h2>
          <span aria-hidden className="mx-auto mt-4 block h-1 w-12 rounded-full bg-secondary lg:mx-0" />
          <p className="mt-5 text-lg leading-relaxed text-gray-400">{t.home.citiesText}</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            {company.cities.map((city) => (
              <li
                key={city.en}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-gray-300 transition hover:border-white/25 hover:bg-white/15 hover:text-white"
              >
                <MapPin aria-hidden className="size-3.5 text-secondary-light" />
                {pick(city)}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal direction="left" className="text-center">
          <div className="text-7xl">🇵🇸</div>
          <div className="mt-3 font-display text-6xl font-bold text-secondary-light">
            <Counter value={company.cities.length} />
          </div>
          <div className="mt-2 text-lg text-gray-400">{t.home.citiesCount}</div>
          <div className="mt-1 text-sm text-gray-500">{t.home.citiesRegion}</div>
        </Reveal>
      </div>
    </section>
  );
}

interface CtaBannerProps {
  overline?: string;
  title: string;
  text: string;
  primary: { to: string; label: string };
  secondary?: { to: string; label: string };
}

/** Closing call to action. */
export function CtaBanner({ overline, title, text, primary, secondary }: CtaBannerProps) {
  return (
    <section className="py-16 text-center sm:py-24">
      <div className="container-x">
        <Reveal direction="scale" className="mx-auto max-w-2xl">
          {overline && <span className="text-overline text-primary">{overline}</span>}
          <h2 className="mt-2 font-display text-3xl leading-tight font-bold sm:text-5xl">{title}</h2>
          <p className="mt-5 mb-8 text-lg leading-relaxed font-light text-gray-600 sm:text-xl">{text}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink to={primary.to} size="lg" arrow>
              {primary.label}
            </ButtonLink>
            {secondary && (
              <ButtonLink to={secondary.to} size="lg" variant="ghost">
                {secondary.label}
              </ButtonLink>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
