import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'w-full rounded-lg border-[1.5px] border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/10';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + error text with the right ARIA wiring (children must set aria-describedby via `${id}-msg`). */
export function Field({ id, label, required, error, help, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium text-gray-900">
        {label}
        {required && (
          <span aria-hidden className="ms-1 text-error">
            *
          </span>
        )}
      </label>
      {children}
      {(error || help) && (
        <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={cn('text-xs', error ? 'text-error' : 'text-gray-400')}>
          {error ?? help}
        </p>
      )}
    </div>
  );
}
