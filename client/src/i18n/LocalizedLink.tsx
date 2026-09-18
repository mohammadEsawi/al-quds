import { forwardRef } from 'react';
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router';
import { useI18n } from './I18nProvider';

/** A router link that keeps the current language prefix. Pass paths without it: `to="/about"`. */
export const LocalizedLink = forwardRef<HTMLAnchorElement, LinkProps & { to: string }>(
  function LocalizedLink({ to, ...props }, ref) {
    const { localePath } = useI18n();
    return <Link ref={ref} to={localePath(to)} {...props} />;
  },
);

export const LocalizedNavLink = forwardRef<HTMLAnchorElement, NavLinkProps & { to: string }>(
  function LocalizedNavLink({ to, ...props }, ref) {
    const { localePath } = useI18n();
    return <NavLink ref={ref} to={localePath(to)} {...props} />;
  },
);
