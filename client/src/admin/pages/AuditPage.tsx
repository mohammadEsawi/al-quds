import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '../api';
import { DataTable, Pagination, type Column } from '../components/DataTable';
import { adminInput } from '../components/Fields';
import { Badge, PageHeader } from '../components/ui';
import { formatDate } from '../labels';
import { useDebounced } from '../hooks';
import type { AuditEntryDTO } from '../types';

const verbs: Record<string, string> = {
  post: 'إضافة',
  put: 'تعديل',
  patch: 'تعديل',
  delete: 'حذف',
  view: 'اطّلع على',
  auth: 'حساب',
  cli: 'أمر نظام',
};

/** "post products" → "إضافة · products" — keeps the technical resource name readable but flags the kind of action. */
function describe(action: string) {
  const [verb, ...rest] = action.split(' ');
  return { verb: verbs[verb ?? ''] ?? verb ?? '', what: rest.join(' ') };
}

const tone = (action: string): 'red' | 'green' | 'blue' | 'gray' =>
  /failed|delete/.test(action) ? 'red' : /^view/.test(action) ? 'blue' : /login|logout|password/.test(action) ? 'gray' : 'green';

/** Who did what in the dashboard (super admin only). No request bodies or personal content are stored. */
export default function AuditPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const query = useAsync(() => adminApi.audit.list({ page, ...(search && { q: search }) }), [page, search]);

  const columns: Column<AuditEntryDTO>[] = [
    { key: 'time', header: 'الوقت', cell: (e) => <span className="whitespace-nowrap text-gray-500">{formatDate(e.createdAt, true)}</span> },
    { key: 'who', header: 'المستخدم', cell: (e) => <span dir="ltr" className="text-start text-xs">{e.actorEmail ?? '—'}</span> },
    {
      key: 'what',
      header: 'الإجراء',
      cell: (e) => {
        const { verb, what } = describe(e.action);
        return (
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={tone(e.action)}>{verb}</Badge>
            <span dir="ltr" className="text-xs text-gray-600">{what}</span>
          </span>
        );
      },
    },
    { key: 'target', header: 'المعرّف', cell: (e) => <span dir="ltr" className="text-start font-mono text-xs text-gray-400">{e.targetId ?? '—'}</span> },
    { key: 'ip', header: 'عنوان IP', cell: (e) => <span dir="ltr" className="text-start text-xs text-gray-400">{e.ip ?? '—'}</span> },
  ];

  return (
    <>
      <PageHeader title="سجل النشاط" description="كل تعديل يتم من لوحة التحكم، وكل اطلاع على طلبات التوظيف والرسائل وملفات السير الذاتية، مع اسم من قام به." />
      <div className="relative mb-4 max-w-sm">
        <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث بالبريد أو نوع الإجراء"
          aria-label="بحث في السجل"
          className={`${adminInput} ps-9`}
        />
      </div>
      <DataTable columns={columns} rows={query.data?.items} rowKey={(e) => e.id} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا يوجد نشاط مسجّل بعد" />
      {query.data && <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={setPage} />}
    </>
  );
}
