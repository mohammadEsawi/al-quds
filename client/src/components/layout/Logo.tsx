import { useState } from 'react';
import { useSiteData } from '@/context/SiteData';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';

/** Logo from the company settings (replaceable from the dashboard). Falls back to text if the file is missing. */
export function Logo({ plate, className }: { plate?: boolean; className?: string }) {
  const { company } = useSiteData();
  const { t, pick } = useI18n();
  const [failed, setFailed] = useState(false);

  return (
    <LocalizedLink
      to="/"
      aria-label={pick(company.name)}
      className={cn(
        'flex shrink-0 items-center transition-all',
        plate && 'rounded-xl bg-white/95 px-3 py-1 shadow-card',
        className,
      )}
    >
      {failed ? (
        <span className="font-display text-lg font-bold text-primary">{t.brand.name}</span>
      ) : (
        <img
          src={company.logo}
          alt={t.brand.logoAlt}
          width={120}
          height={45}
          className="h-10 w-auto object-contain sm:h-11"
          onError={() => setFailed(true)}
        />
      )}
    </LocalizedLink>
  );
}
