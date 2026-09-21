import { Briefcase, Building2, Landmark, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedNavLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';

export function useAboutTabs(): { to: string; label: string; icon: LucideIcon; text: string }[] {
  const { t } = useI18n();
  return [
    { to: '/about', label: t.aboutNav.company, icon: Building2, text: t.aboutNav.companyText },
    { to: '/about/board', label: t.aboutNav.board, icon: Landmark, text: t.aboutNav.boardText },
    { to: '/about/executive', label: t.aboutNav.executive, icon: Briefcase, text: t.aboutNav.executiveText },
  ];
}

/**
 * The three "About the company" pages as small tabs. On each page it sits under the header;
 * the current page is highlighted. Every tab is a real link to its own page.
 */
export function AboutTabs({ className }: { className?: string }) {
  const { t } = useI18n();
  const tabs = useAboutTabs();

  return (
    <nav aria-label={t.aboutNav.tabsLabel} className={cn('flex justify-center', className)}>
      <ul className="flex max-w-full flex-wrap justify-center gap-1.5 rounded-3xl bg-gray-50 p-1.5 ring-1 ring-gray-100 sm:gap-2 sm:rounded-full">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <LocalizedNavLink
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5',
                  isActive ? 'bg-primary text-white shadow-primary' : 'text-gray-600 hover:bg-white hover:text-primary',
                )
              }
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {label}
            </LocalizedNavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
