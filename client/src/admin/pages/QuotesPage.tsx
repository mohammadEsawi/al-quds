import { useEffect, useState } from 'react';
import { Mail, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { Pagination } from '../components/DataTable';
import { adminInput } from '../components/Fields';
import { Badge, Card, EmptyBlock, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { useDebounced } from '../hooks';
import { formatDate, quoteStatusLabels } from '../labels';
import type { QuoteDTO, QuoteStatusKey } from '../types';

const statusTone: Record<QuoteStatusKey, 'red' | 'blue' | 'purple' | 'green' | 'gray'> = {
  new: 'red',
  contacted: 'blue',
  quoted: 'purple',
  won: 'green',
  lost: 'gray',
};

/** "Request a quote" submissions from companies: who wants what quantity, and where each one stands. */
export default function QuotesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useAsync(() => adminApi.quotes.list({ page, ...(status && { status }), ...(search && { q: search }) }), [page, status, search]);
  const [current, setCurrent] = useState<QuoteDTO | null>(null);
  const [notes, setNotes] = useState('');

  const open = (quote: QuoteDTO) => {
    setCurrent(quote);
    setNotes(quote.notes ?? '');
    if (!quote.isRead) {
      void adminApi.quotes.update(quote.id, { isRead: true }).then(() => query.reload()).catch(() => undefined);
    }
  };

  // Arriving from a notification: /admin/quotes?open=<id>
  const wanted = params.get('open');
  useEffect(() => {
    const match = query.data?.items.find((item) => item.id === wanted);
    if (match && current?.id !== match.id) open(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, query.data]);

  const save = async (patch: { status?: QuoteStatusKey; notes?: string | null }) => {
    if (!current) return;
    try {
      const updated = await adminApi.quotes.update(current.id, patch);
      setCurrent(updated);
      toast.success('تم الحفظ');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const remove = async () => {
    if (!current) return;
    if (!(await confirm({ title: 'حذف الطلب؟', text: 'لن تتمكن من استرجاعه.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.quotes.remove(current.id);
      setCurrent(null);
      setParams({}, { replace: true });
      toast.success('تم حذف الطلب');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  return (
    <>
      <PageHeader title="طلبات عروض الأسعار" description="طلبات الشركات من صفحات المنتجات (خصوصاً البريفورم والأغطية). تابع كل طلب حتى إغلاقه." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="بحث بالشركة أو المنتج..." aria-label="بحث" className={cn(adminInput, 'w-64 ps-9')} />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="الحالة" className={cn(adminInput, 'w-48')}>
          <option value="">كل الحالات</option>
          {(Object.keys(quoteStatusLabels) as QuoteStatusKey[]).map((key) => (
            <option key={key} value={key}>{quoteStatusLabels[key]}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="overflow-hidden">
          {!query.data ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : query.data.items.length === 0 ? (
            <EmptyBlock title="لا توجد طلبات" text="ستظهر هنا طلبات عروض الأسعار التي يرسلها الزوار." />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-gray-50 overflow-y-auto">
              {query.data.items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => open(item)} className={cn('block w-full px-4 py-3 text-start hover:bg-gray-50', current?.id === item.id && 'bg-blue-50/60')}>
                    <span className="flex items-center gap-2">
                      {!item.isRead && <span className="size-2 shrink-0 rounded-full bg-quds" />}
                      <span className={cn('truncate text-sm', !item.isRead ? 'font-bold' : 'font-medium')}>{item.company}</span>
                      <span className="ms-auto shrink-0 text-[11px] text-gray-400">{formatDate(item.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-primary">{item.productName}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">{item.quantity}</span>
                      <span className="ms-auto"><Badge tone={statusTone[item.status]}>{quoteStatusLabels[item.status]}</Badge></span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.data && <div className="border-t border-gray-50 px-3 pb-3"><Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={setPage} /></div>}
        </Card>

        <Card className="p-6">
          {!current ? (
            <EmptyBlock title="اختر طلباً لعرضه" />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{current.company}</h2>
                  <p className="mt-1 text-sm text-gray-500">{current.name} — {formatDate(current.createdAt, true)}</p>
                </div>
                <Badge tone={statusTone[current.status]}>{quoteStatusLabels[current.status]}</Badge>
              </div>

              <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-gray-400">المنتج</dt><dd className="font-semibold">{current.productName}</dd></div>
                <div><dt className="text-xs text-gray-400">الكمية المطلوبة</dt><dd className="font-semibold">{current.quantity}</dd></div>
                <div><dt className="text-xs text-gray-400">البريد</dt><dd><a dir="ltr" href={`mailto:${current.email}`} className="text-primary hover:underline">{current.email}</a></dd></div>
                <div><dt className="text-xs text-gray-400">الهاتف</dt><dd dir="ltr" className="text-start">{current.phone}</dd></div>
                {current.city && <div><dt className="text-xs text-gray-400">مدينة التسليم</dt><dd>{current.city}</dd></div>}
              </dl>
              {current.message && <p className="rounded-xl bg-gray-50 p-4 leading-loose whitespace-pre-wrap">{current.message}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="quote-status" className="text-sm font-medium">الحالة</label>
                <select id="quote-status" value={current.status} onChange={(e) => void save({ status: e.target.value as QuoteStatusKey })} className={cn(adminInput, 'w-52')}>
                  {(Object.keys(quoteStatusLabels) as QuoteStatusKey[]).map((key) => (
                    <option key={key} value={key}>{quoteStatusLabels[key]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quote-notes" className="mb-1.5 block text-sm font-medium">ملاحظات داخلية</label>
                <textarea id="quote-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(adminInput, 'resize-y')} placeholder="السعر المقدَّم، موعد المتابعة..." />
                <Button className="mt-2" variant="secondary" onClick={() => void save({ notes: notes.trim() || null })}>حفظ الملاحظات</Button>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <a href={`mailto:${current.email}?subject=${encodeURIComponent(`عرض سعر — ${current.productName}`)}`} className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"><Mail aria-hidden className="size-4" />رد بالبريد</a>
                {current.whatsappUrl && <a href={current.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"><WhatsAppIcon className="size-4" />واتساب</a>}
                <button type="button" onClick={() => void remove()} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50"><Trash2 aria-hidden className="size-4" />حذف</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
