import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LocalizedLink } from '@/i18n/LocalizedLink';

type Variant = 'primary' | 'secondary' | 'white' | 'glass' | 'whatsapp' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'group inline-flex items-center justify-center gap-2 rounded-full border-2 font-semibold whitespace-nowrap select-none transition-all duration-150 active:scale-[0.97] focus-visible:outline-offset-4 disabled:opacity-60 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary border-primary text-white shadow-primary hover:bg-primary-dark hover:border-primary-dark hover:-translate-y-0.5',
  secondary:
    'bg-transparent border-primary text-primary hover:bg-primary hover:text-white hover:-translate-y-0.5',
  white: 'bg-white border-white text-primary shadow-card hover:-translate-y-0.5 hover:shadow-lift',
  glass:
    'bg-white/15 border-white/30 text-white backdrop-blur hover:bg-white/25 hover:-translate-y-0.5',
  whatsapp:
    'bg-whatsapp border-whatsapp text-white hover:brightness-95 hover:-translate-y-0.5',
  ghost: 'bg-transparent border-transparent text-gray-900 hover:bg-gray-50',
};

const sizes: Record<Size, string> = {
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  full?: boolean;
  className?: string;
  children: ReactNode;
}

function content(children: ReactNode, arrow?: boolean) {
  return (
    <>
      {children}
      {arrow && (
        <ArrowRight
          aria-hidden
          className="size-[1.1em] transition-transform duration-150 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
        />
      )}
    </>
  );
}

function classes({ variant = 'primary', size = 'md', full, className }: CommonProps) {
  return cn(base, variants[variant], sizes[size], full && 'w-full', className);
}

/** A real `<button>`. */
export function Button({
  variant,
  size,
  arrow,
  full,
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes({ variant, size, full, className, children })} {...props}>
      {content(children, arrow)}
    </button>
  );
}

/** Internal route link (keeps the current language). */
export function ButtonLink({
  to,
  variant,
  size,
  arrow,
  full,
  className,
  children,
  ...props
}: CommonProps & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <LocalizedLink to={to} className={classes({ variant, size, full, className, children })} {...props}>
      {content(children, arrow)}
    </LocalizedLink>
  );
}

/** External link (WhatsApp, tel:, mailto:). */
export function ButtonAnchor({
  href,
  variant,
  size,
  arrow,
  full,
  className,
  children,
  ...props
}: CommonProps & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={classes({ variant, size, full, className, children })}
      {...props}
    >
      {content(children, arrow)}
    </a>
  );
}
