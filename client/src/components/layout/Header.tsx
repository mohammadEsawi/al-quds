import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useLocation } from 'react-router';
import { useAboutTabs } from '@/components/about/AboutTabs';
import { ButtonLink } from '@/components/ui/Button';
import { sectorIcons } from '@/components/ui/icons';
import { useSiteData } from '@/context/SiteData';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink, LocalizedNavLink } from '@/i18n/LocalizedLink';
import { cn } from '@/lib/cn';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

type NavLinkClass = (state: { isActive: boolean }) => string;

/**
 * A desktop menu that opens on hover or keyboard focus and closes as soon as a choice is made:
 * on click, on navigation, on Escape, when the pointer leaves and when focus moves away.
 * (Pure CSS hover/focus-within kept it open after a click, because the link stays focused and hovered.)
 */
function NavDropdown({ to, label, linkClass, width, children }: { to: string; label: string; linkClass: NavLinkClass; width: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  const close = () => {
    setOpen(false);
    if (rootRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  };

  // Navigating anywhere (including by the browser's back button) closes it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(close, [pathname]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => e.key === 'Escape' && close()}
      onClick={(e) => (e.target as HTMLElement).closest('a') && close()}
    >
      <LocalizedNavLink to={to} className={linkClass} aria-haspopup="true" aria-expanded={open}>
        <span className="inline-flex items-center gap-1">
          {label}
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </span>
      </LocalizedNavLink>
      <div
        className={cn(
          'absolute start-0 top-full pt-2 transition-[opacity,visibility] duration-200',
          width,
          open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
      >
        <ul className="rounded-2xl border border-gray-100 bg-white p-2 shadow-deep">{children}</ul>
      </div>
    </div>
  );
}

function DropdownItem({ to, label, icon: Icon }: { to: string; label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }) {
  return (
    <li>
      <LocalizedLink to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-primary">
          <Icon aria-hidden className="size-4" />
        </span>
        {label}
      </LocalizedLink>
    </li>
  );
}

export function Header() {
  const { t, pick, locale } = useI18n();
  const { sectors } = useSiteData();
  const aboutItems = useAboutTabs();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // The homepage has a light hero; every other page opens with a dark page header.
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const solid = scrolled || open;
  const onDark = !isHome && !solid;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu after navigating and lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const links = [
    { to: '/', label: t.nav.home, end: true },
    { to: '/about', label: t.nav.about },
    { to: '/products', label: t.nav.products },
    { to: '/real-estate', label: t.nav.realEstate },
    { to: '/careers', label: t.nav.careers },
    { to: '/contact', label: t.nav.contact },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      onDark ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-gray-900',
      isActive && (onDark ? 'font-semibold text-white' : 'font-semibold text-primary'),
    );

  return (
    <>
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        solid ? 'bg-white/92 py-2 shadow-card backdrop-blur-xl' : 'py-4',
      )}
    >
      <div className="container-x flex items-center justify-between gap-4">
        <Logo plate={onDark} />

        <nav aria-label={t.nav.main} className="hidden items-center gap-1 lg:flex">
          <LocalizedNavLink to="/" end className={linkClass}>
            {t.nav.home}
          </LocalizedNavLink>

          {/* About the company: opens the three pages */}
          <NavDropdown to="/about" label={t.nav.about} linkClass={linkClass} width="w-80">
            {aboutItems.map(({ to, label, icon }) => (
              <DropdownItem key={to} to={to} label={label} icon={icon} />
            ))}
          </NavDropdown>

          {/* Sectors dropdown */}
          <NavDropdown to="/sectors" label={t.nav.sectors} linkClass={linkClass} width="w-72">
            {sectors.map((sector) => (
              <DropdownItem key={sector.key} to={sector.path} label={pick(sector.name)} icon={sectorIcons[sector.icon]} />
            ))}
          </NavDropdown>

          {links.slice(2, 5).map((l) => (
            <LocalizedNavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </LocalizedNavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitch onDark={onDark} />
          <ButtonLink to="/contact" arrow className="!py-2 max-lg:hidden">
            {t.nav.contact}
          </ButtonLink>
          <button
            type="button"
            className={cn(
              'flex size-11 items-center justify-center rounded-xl lg:hidden',
              onDark ? 'text-white' : 'text-gray-900',
            )}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
    </header>

    {/* Rendered outside <header>: the header's backdrop-filter would otherwise become the containing
        block of this `fixed` drawer and shrink it to the height of the header bar. */}
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label={t.nav.main}
            className="fixed inset-0 z-[45] overflow-y-auto bg-white px-6 pt-24 pb-10 lg:hidden"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ul className="mx-auto max-w-md space-y-1">
              {links.map((l, i) => (
                <motion.li
                  key={l.to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i + 0.1 }}
                >
                  <LocalizedNavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-xl px-4 py-3 font-display text-2xl font-semibold',
                        isActive ? 'bg-gray-50 text-primary' : 'text-gray-900',
                      )
                    }
                  >
                    {l.label}
                  </LocalizedNavLink>
                  {l.to === '/about' && (
                    <ul className="mb-1 ms-4 border-s-2 border-gray-100 ps-3">
                      {aboutItems.map(({ to, label }) => (
                        <li key={to}>
                          <LocalizedNavLink
                            to={to}
                            end
                            className={({ isActive }) => cn('block rounded-lg px-3 py-2.5 text-base font-medium', isActive ? 'text-primary' : 'text-gray-600')}
                          >
                            {label}
                          </LocalizedNavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              ))}
            </ul>

            <div className="mx-auto mt-8 max-w-md">
              <p className="text-overline mb-3 text-gray-400">{t.nav.sectors}</p>
              <ul className="grid grid-cols-2 gap-2">
                {sectors.map((sector) => (
                  <li key={sector.key}>
                    <LocalizedLink
                      to={sector.path}
                      className="block rounded-xl border border-gray-100 px-3 py-2.5 text-sm font-medium text-gray-700"
                    >
                      {pick(sector.name)}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
              <ButtonLink to="/contact" arrow size="lg" full className="mt-8">
                {t.nav.contact}
              </ButtonLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
