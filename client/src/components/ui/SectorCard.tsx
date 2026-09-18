import { ArrowRight } from 'lucide-react';
import type { Sector } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';
import { sectorIcons } from './icons';

/** Large visual card for a business sector. Sectors without an uploaded image get a branded gradient. */
export function SectorCard({ sector, className }: { sector: Sector; className?: string }) {
  const { t, pick } = useI18n();
  const Icon = sectorIcons[sector.icon];

  return (
    <LocalizedLink
      to={sector.path}
      className={cn(
        'group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 text-white shadow-card transition-shadow duration-300 hover:shadow-lift',
        className,
      )}
    >
      {sector.image ? (
        <img
          src={sector.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-linear-to-br from-primary-dark via-primary to-secondary-dark transition-transform duration-700 group-hover:scale-110"
        >
          <Icon className="absolute -end-6 -top-6 size-56 text-white/10" strokeWidth={1} />
        </div>
      )}

      {/* overlay darkens on hover */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-gray-900/90 via-gray-900/35 to-transparent transition-colors duration-300 group-hover:from-primary-dark/95 group-hover:via-primary-dark/50"
      />
      {/* light sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -start-1/2 -z-10 w-1/2 -skew-x-12 bg-white/15 opacity-0 blur-md transition-all duration-700 group-hover:translate-x-[300%] group-hover:opacity-100 rtl:group-hover:-translate-x-[300%]"
      />

      <span dir="ltr" className="absolute start-6 top-5 font-display text-sm font-bold tracking-widest text-white/70">
        {sector.number}
      </span>
      <span className="absolute end-5 top-5 flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
        <Icon aria-hidden className="size-5" />
      </span>

      <div className="translate-y-6 p-6 transition-transform duration-300 group-hover:translate-y-0">
        <h3 className="font-display text-2xl font-bold">{pick(sector.name)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{pick(sector.description)}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {t.sectors.explore}
          <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
        </span>
      </div>
    </LocalizedLink>
  );
}
