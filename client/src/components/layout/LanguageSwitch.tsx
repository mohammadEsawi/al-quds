import { Languages } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

/** Switches between Arabic and English while staying on the same page. */
export function LanguageSwitch({ onDark, className }: { onDark?: boolean; className?: string }) {
  const { t, locale, switchPath } = useI18n();
  const target = locale === 'ar' ? 'en' : 'ar';

  return (
    <Link
      to={switchPath(target)}
      hrefLang={target}
      lang={target}
      aria-label={t.language.label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
        onDark
          ? 'border-white/30 text-white hover:bg-white/15'
          : 'border-gray-200 text-gray-700 hover:border-primary hover:text-primary',
        className,
      )}
    >
      <Languages aria-hidden className="size-4" />
      <span>{t.language.switchTo}</span>
    </Link>
  );
}
