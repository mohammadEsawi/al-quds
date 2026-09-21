import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router';
import { useAsync } from '@/hooks/useAsync';
import { cn } from '@/lib/cn';
import { adminApi } from '../api';
import { readinessGroups, readinessLabels } from '../labels';
import type { ReadinessItemDTO } from '../types';
import { Card, ErrorBlock, Spinner } from './ui';

const icon = {
  ok: <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />,
  todo: <Circle aria-hidden className="size-5 shrink-0 text-gray-300" />,
  warn: <AlertTriangle aria-hidden className="size-5 shrink-0 text-amber-500" />,
};

function Row({ item }: { item: ReadinessItemDTO }) {
  const label = readinessLabels[item.id];
  if (!label) return null;
  const body = (
    <span className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
      {icon[item.status]}
      <span className="min-w-0">
        <span className={cn('block text-sm font-medium', item.status === 'ok' && 'text-gray-500')}>
          {label.title}
          {item.count !== undefined && item.count > 0 && item.status !== 'ok' && label.count && (
            <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{item.count} {label.count}</span>
          )}
        </span>
        {item.status !== 'ok' && <span className="block text-xs text-gray-500">{label.hint}</span>}
      </span>
    </span>
  );
  return <li>{item.link && item.status !== 'ok' ? <Link to={item.link}>{body}</Link> : body}</li>;
}

/** "What is still missing before the site is complete and safe?" — read live from the real state of the site. */
export function ReadinessCard() {
  const query = useAsync(() => adminApi.readiness());
  const items = query.data;
  const done = items?.filter((i) => i.status === 'ok').length ?? 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">جاهزية الموقع</h2>
          <p className="text-sm text-gray-500">ما الذي بقي قبل أن يكتمل الموقع ويصبح آمناً للنشر.</p>
        </div>
        {items && <span dir="ltr" className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">{done} / {items.length}</span>}
      </div>
      {query.error ? (
        <ErrorBlock onRetry={query.reload} />
      ) : !items ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {Object.entries(readinessGroups).map(([group, title]) => (
            <section key={group}>
              <h3 className="text-overline mb-1 text-gray-400">{title}</h3>
              <ul>
                {items.filter((i) => i.group === group).map((item) => <Row key={item.id} item={item} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
