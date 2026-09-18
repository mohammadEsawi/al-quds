import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from './Button';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-3 p-6">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StateProps {
  title?: string;
  text?: string;
  action?: ReactNode;
  /** Use `h1` when the state fills a whole page (e.g. "not found"). */
  heading?: 'h1' | 'h2' | 'h3';
}

export function EmptyState({ title, text, action, heading: Heading = 'h3' }: StateProps) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
      <Inbox aria-hidden className="mx-auto mb-4 size-10 text-gray-300" />
      <Heading className="font-display text-xl font-semibold">{title ?? t.common.emptyTitle}</Heading>
      <p className="mt-2 text-gray-600">{text ?? t.common.emptyText}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Friendly error box. Never renders raw backend messages. */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
      <AlertTriangle aria-hidden className="mx-auto mb-4 size-10 text-error" />
      <h3 className="font-display text-xl font-semibold">{t.common.errorTitle}</h3>
      <p className="mt-2 text-gray-600">{t.common.errorText}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}
