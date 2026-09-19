import { useId, type ReactNode } from 'react';
import { inputClass } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';
import type { Loc } from '../types';

export const adminInput = cn(inputClass, 'py-2.5 text-sm');

interface BaseFieldProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  className?: string;
}

function FieldShell({ id, label, required, help, error, className, children }: BaseFieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-gray-800">
        {label}
        {required && <span aria-hidden className="ms-1 text-error">*</span>}
      </label>
      {children}
      {(error || help) && <p className={cn('text-xs', error ? 'text-error' : 'text-gray-400')}>{error ?? help}</p>}
    </div>
  );
}

interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  disabled?: boolean;
}

export function TextField({ value, onChange, type = 'text', dir, placeholder, maxLength, autoComplete, disabled, ...shell }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} {...shell}>
      <input
        id={id}
        type={type}
        dir={dir}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={!!shell.error}
        onChange={(e) => onChange(e.target.value)}
        className={adminInput}
      />
    </FieldShell>
  );
}

export function TextAreaField({ value, onChange, rows = 4, dir, placeholder, ...shell }: Omit<TextFieldProps, 'type'> & { rows?: number }) {
  const id = useId();
  return (
    <FieldShell id={id} {...shell}>
      <textarea id={id} rows={rows} dir={dir} value={value} placeholder={placeholder} aria-invalid={!!shell.error} onChange={(e) => onChange(e.target.value)} className={cn(adminInput, 'resize-y')} />
    </FieldShell>
  );
}

/** Arabic and English side by side — every piece of website content exists in both languages. */
export function LocalizedField({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  required,
  help,
  error,
  className,
}: BaseFieldProps & { value: Loc; onChange: (value: Loc) => void; multiline?: boolean; rows?: number }) {
  const arId = useId();
  const enId = useId();
  const Control = multiline ? 'textarea' : 'input';
  const shared = { className: cn(adminInput, multiline && 'resize-y'), rows: multiline ? rows : undefined, 'aria-invalid': !!error };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-gray-800">
        {label}
        {required && <span aria-hidden className="ms-1 text-error">*</span>}
      </span>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative">
          <label htmlFor={arId} className="sr-only">{`${label} (العربية)`}</label>
          <Control id={arId} dir="rtl" lang="ar" value={value.ar} placeholder="بالعربية" onChange={(e) => onChange({ ...value, ar: e.target.value })} {...shared} className={cn(shared.className, 'pl-11')} />
          <span aria-hidden className="pointer-events-none absolute left-3 top-2.5 rounded bg-gray-100 px-1.5 text-[10px] font-bold text-gray-400">AR</span>
        </div>
        <div className="relative">
          <label htmlFor={enId} className="sr-only">{`${label} (English)`}</label>
          <Control id={enId} dir="ltr" lang="en" value={value.en} placeholder="In English" onChange={(e) => onChange({ ...value, en: e.target.value })} {...shared} className={cn(shared.className, 'pr-11')} />
          <span aria-hidden className="pointer-events-none absolute right-3 top-2.5 rounded bg-gray-100 px-1.5 text-[10px] font-bold text-gray-400">EN</span>
        </div>
      </div>
      {(error || help) && <p className={cn('text-xs', error ? 'text-error' : 'text-gray-400')}>{error ?? help}</p>}
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  ...shell
}: BaseFieldProps & { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <FieldShell id={id} {...shell}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={adminInput}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (value: boolean) => void; label: string; help?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg p-2 text-start hover:bg-gray-50"
    >
      <span className={cn('relative mt-0.5 inline-block h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-gray-300')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'start-[22px]' : 'start-0.5')} />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {help && <span className="block text-xs text-gray-400">{help}</span>}
      </span>
    </button>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-1 mb-4 text-sm text-gray-500">{description}</p>}
      <div className={cn('space-y-5', !description && 'mt-4')}>{children}</div>
    </section>
  );
}

/** Field-level problems returned by the API, listed at the top of a form. */
export function ProblemList({ problems }: { problems: { path: string; message: string }[] }) {
  if (!problems.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
      <p className="mb-1 font-semibold">راجع الحقول التالية:</p>
      <ul className="list-disc space-y-0.5 ps-5">
        {problems.map((p, i) => (
          <li key={i}>
            <span dir="ltr" className="font-mono text-xs">{p.path || 'form'}</span> — {p.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
