import type { HTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Card, EmptyBlock, ErrorBlock, Spinner } from './ui';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: ReactNode;
  rowProps?: (row: T, index: number) => HTMLAttributes<HTMLTableRowElement>;
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, emptyTitle = 'لا توجد بيانات', emptyText, emptyAction, rowProps }: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden">
      {error ? (
        <ErrorBlock onRetry={onRetry} />
      ) : !rows && loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : rows && rows.length === 0 ? (
        <EmptyBlock title={emptyTitle} text={emptyText} action={emptyAction} />
      ) : (
        <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
          <table className="w-full text-start text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold tracking-wide text-gray-500">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={cn('px-4 py-3 text-start font-semibold', c.className)}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows?.map((row, index) => (
                <tr key={rowKey(row)} className="transition-colors hover:bg-gray-50/60" {...rowProps?.(row, index)}>
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                      {c.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} من {total}
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="md" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</Button>
        <span dir="ltr" className="px-2 font-medium">{page} / {pages}</span>
        <Button type="button" variant="ghost" size="md" disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</Button>
      </div>
    </div>
  );
}
