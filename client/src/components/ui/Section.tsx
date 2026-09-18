import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';

interface SectionProps {
  id?: string;
  muted?: boolean;
  dark?: boolean;
  className?: string;
  children: ReactNode;
}

export function Section({ id, muted, dark, className, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-16 sm:py-24',
        muted && 'bg-gray-50',
        dark && 'bg-linear-to-br from-gray-900 to-gray-800 text-white',
        className,
      )}
    >
      <div className="container-x">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  overline?: string;
  title: string;
  text?: string;
  align?: 'center' | 'start';
  light?: boolean;
  className?: string;
}

export function SectionHeader({ overline, title, text, align = 'center', light, className }: SectionHeaderProps) {
  return (
    <Reveal className={cn('mb-12 max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {overline && (
        <span className={cn('text-overline', light ? 'text-secondary-light' : 'text-primary')}>{overline}</span>
      )}
      <h2
        className={cn(
          'mt-2 font-display text-3xl leading-tight font-bold sm:text-4xl',
          light ? 'text-white' : 'text-gray-900',
        )}
      >
        {title}
      </h2>
      <span
        aria-hidden
        className={cn(
          'mt-4 block h-1 w-12 rounded-full',
          light ? 'bg-secondary-light' : 'bg-primary',
          align === 'center' && 'mx-auto',
        )}
      />
      {text && (
        <p className={cn('mt-4 text-lg leading-relaxed', light ? 'text-gray-300' : 'text-gray-600')}>{text}</p>
      )}
    </Reveal>
  );
}
