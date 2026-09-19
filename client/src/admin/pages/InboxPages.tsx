import { useEffect, useState } from 'react';
import { Download, ExternalLink, Mail, MailOpen, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';
import { useAsync } from '@/hooks/useAsync';
import { cn } from '@/lib/cn';
import { adminApi, describeError } from '../api';
import { DataTable, Pagination, type Column } from '../components/DataTable';
import { TextAreaField, adminInput } from '../components/Fields';
import { Badge, Card, EmptyBlock, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { useDebounced } from '../hooks';
import { applicationStatusLabels, formatBytes, formatDate } from '../labels';
import type { ApplicationDTO, ApplicationStatusKey, MessageDTO } from '../types';

const statusTone: Record<ApplicationStatusKey, 'blue' | 'gray' | 'green' | 'amber' | 'red' | 'purple'> = {
  new: 'blue',
  reviewed: 'gray',
  shortlisted: 'purple',
  interview: 'amber',
  rejected: 'red',
  accepted: 'green',
};

// ───────────────────────── Applications ─────────────────────────

export function ApplicationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const openId = params.get('open');
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [current, setCurrent] = useState<ApplicationDTO | null>(null);
  const [notes, setNotes] = useState('');

  const query = useAsync(() => adminApi.applications.list({ status, q: search, page, pageSize: 20 }), [status, search, page]);

  const open = async (app: ApplicationDTO) => {
    let shown = app;
    // Opening a new application counts as reviewing it (this also clears its notification).
    if (app.status === 'new') {
      shown = await adminApi.applications.update(app.id, { status: 'reviewed' }).catch(() => app);
      query.reload();
    }
    setCurrent(shown);
    setNotes(shown.notes ?? '');
  };

  // Deep link from the notification bell: /admin/applications?open=<id>
  useEffect(() => {
    if (!openId) return;
    adminApi.applications.get(openId).then(open).catch(() => toast.error('تعذّر فتح الطلب'));
    const next = new URLSearchParams(params);
    next.delete('open');
    setParams(next, { replace: true });
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (body: { status?: ApplicationStatusKey; notes?: string | null }, message: string) => {
    if (!current) return;
    try {
      const updated = await adminApi.applications.update(current.id, body);
      setCurrent(updated);
      toast.success(message);
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const remove = async () => {
    if (!current) return;
    if (!(await confirm({ title: 'حذف الطلب؟', text: 'سيتم حذف الطلب والسيرة الذاتية نهائياً.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.applications.remove(current.id);
      toast.success('تم حذف الطلب');
      setCurrent(null);
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const columns: Column<ApplicationDTO>[] = [
    { key: 'name', header: 'المتقدم', cell: (a) => <button type="button" onClick={() => void open(a)} className="text-start"><span className="block font-semibold">{a.fullName}</span><span dir="ltr" className="block text-start text-xs text-gray-400">{a.email}</span></button> },
    { key: 'position', header: 'الوظيفة', cell: (a) => <div><p>{a.position}</p>{!a.job && <span className="text-xs text-gray-400">تقديم عام</span>}</div> },
    { key: 'city', header: 'المدينة', cell: (a) => a.city },
    { key: 'status', header: 'الحالة', cell: (a) => <Badge tone={statusTone[a.status]}>{applicationStatusLabels[a.status]}</Badge> },
    { key: 'date', header: 'التاريخ', cell: (a) => <span className="text-gray-500">{formatDate(a.createdAt)}</span> },
    { key: 'actions', header: '', className: 'w-20 text-end', cell: (a) => <Button variant="ghost" className="!px-3 !py-1 !text-xs" onClick={() => void open(a)}>فتح</Button> },
  ];

  return (
    <>
      <PageHeader title="طلبات التوظيف" description="الطلبات القادمة من نموذج التقديم في الموقع. السير الذاتية خاصة ولا يراها إلا المدراء." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {}, { replace: true })} aria-label="الحالة" className={cn(adminInput, 'w-44')}>
          <option value="">كل الحالات</option>
          {Object.entries(applicationStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو البريد..." aria-label="بحث" className={cn(adminInput, 'w-64 ps-9')} />
        </div>
      </div>
      <DataTable columns={columns} rows={query.data?.items} rowKey={(a) => a.id} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا توجد طلبات" emptyText="ستظهر هنا الطلبات فور وصولها." />
      {query.data && <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => setParams({ ...(status && { status }), page: String(n) }, { replace: true })} />}

      <Modal
        open={!!current}
        onClose={() => setCurrent(null)}
        title={current?.fullName ?? ''}
        size="lg"
        footer={
          current && (
            <>
              <button type="button" onClick={() => void remove()} className="me-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50"><Trash2 aria-hidden className="size-4" />حذف</button>
              <a href={adminApi.applications.cvUrl(current.id)} download className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"><Download aria-hidden className="size-4" />تنزيل السيرة الذاتية</a>
              {current.whatsappUrl && <a href={current.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"><WhatsAppIcon className="size-4" />واتساب</a>}
            </>
          )
        }
      >
        {current && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="app-status" className="text-sm font-medium">الحالة</label>
              <select id="app-status" value={current.status} onChange={(e) => void update({ status: e.target.value as ApplicationStatusKey }, 'تم تحديث الحالة')} className={cn(adminInput, 'w-44')}>
                {Object.entries(applicationStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <span className="text-xs text-gray-400">وصل في {formatDate(current.createdAt, true)}</span>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['الوظيفة المطلوبة', current.position],
                ['المدينة', current.city],
                ['الهاتف', <span dir="ltr" key="p">{current.phone}</span>],
                ['البريد الإلكتروني', <a key="e" dir="ltr" href={`mailto:${current.email}`} className="text-primary hover:underline">{current.email}</a>],
                ['المؤهل العلمي', current.education],
                ['الملف', `${current.cv.name} (${formatBytes(current.cv.size)})`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-gray-50 p-3"><dt className="text-xs text-gray-400">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>
              ))}
            </dl>
            <div><p className="mb-1 text-sm font-medium">الخبرات</p><p className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed whitespace-pre-wrap">{current.experience}</p></div>
            {current.message && <div><p className="mb-1 text-sm font-medium">رسالة المتقدم</p><p className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed whitespace-pre-wrap">{current.message}</p></div>}
            {(current.linkedin || current.portfolio) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {current.linkedin && <a href={current.linkedin} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-primary hover:underline"><ExternalLink aria-hidden className="size-4" />لينكدإن</a>}
                {current.portfolio && <a href={current.portfolio} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-primary hover:underline"><ExternalLink aria-hidden className="size-4" />الأعمال</a>}
              </div>
            )}
            <div className="space-y-3">
              <TextAreaField label="ملاحظات داخلية (لا تظهر للمتقدم)" rows={3} value={notes} onChange={setNotes} />
              <Button variant="secondary" onClick={() => void update({ notes: notes.trim() || null }, 'تم حفظ الملاحظات')}>حفظ الملاحظات</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ───────────────────────── Messages ─────────────────────────

export function MessagesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const openId = params.get('open');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const [current, setCurrent] = useState<MessageDTO | null>(null);

  const query = useAsync(() => adminApi.messages.list({ unread: unreadOnly || undefined, q: search, page, pageSize: 20 }), [unreadOnly, search, page]);

  const select = async (m: MessageDTO) => {
    let shown = m;
    if (!m.isRead) {
      shown = await adminApi.messages.setRead(m.id, true).catch(() => m);
      query.reload();
    }
    setCurrent(shown);
  };

  useEffect(() => {
    if (!openId) return;
    adminApi.messages.get(openId).then(select).catch(() => toast.error('تعذّر فتح الرسالة'));
    const next = new URLSearchParams(params);
    next.delete('open');
    setParams(next, { replace: true });
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRead = async () => {
    if (!current) return;
    try {
      const updated = await adminApi.messages.setRead(current.id, !current.isRead);
      setCurrent(updated);
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const remove = async () => {
    if (!current) return;
    if (!(await confirm({ title: 'حذف الرسالة؟', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.messages.remove(current.id);
      setCurrent(null);
      toast.success('تم حذف الرسالة');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  return (
    <>
      <PageHeader title="الرسائل" description="رسائل نموذج «تواصل معنا». يمكنك الرد بالبريد أو فتح المحادثة على واتساب مباشرة." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="بحث في الرسائل..." aria-label="بحث" className={cn(adminInput, 'w-64 ps-9')} />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} className="size-4 accent-primary" />غير المقروءة فقط</label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="overflow-hidden">
          {!query.data ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : query.data.items.length === 0 ? (
            <EmptyBlock title="لا توجد رسائل" />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-gray-50 overflow-y-auto">
              {query.data.items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => void select(m)} className={cn('block w-full px-4 py-3 text-start hover:bg-gray-50', current?.id === m.id && 'bg-blue-50/60')}>
                    <span className="flex items-center gap-2">
                      {!m.isRead && <span className="size-2 shrink-0 rounded-full bg-quds" />}
                      <span className={cn('truncate text-sm', !m.isRead ? 'font-bold' : 'font-medium')}>{m.name}</span>
                      <span className="ms-auto shrink-0 text-[11px] text-gray-400">{formatDate(m.createdAt)}</span>
                    </span>
                    {m.subject && <span className="mt-0.5 block truncate text-xs font-semibold text-primary">{m.subject}</span>}
                    <span className="mt-0.5 block truncate text-xs text-gray-500">{m.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.data && <div className="border-t border-gray-50 px-3 pb-3"><Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={setPage} /></div>}
        </Card>

        <Card className="p-6">
          {!current ? (
            <EmptyBlock title="اختر رسالة لعرضها" />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{current.subject || 'بدون موضوع'}</h2>
                  <p className="mt-1 text-sm text-gray-500">من <span className="font-semibold text-gray-800">{current.name}</span> — {formatDate(current.createdAt, true)}</p>
                </div>
                <Badge tone={current.isRead ? 'gray' : 'red'}>{current.isRead ? 'مقروءة' : 'غير مقروءة'}</Badge>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div><dt className="text-xs text-gray-400">البريد</dt><dd><a dir="ltr" href={`mailto:${current.email}`} className="text-primary hover:underline">{current.email}</a></dd></div>
                {current.phone && <div><dt className="text-xs text-gray-400">الهاتف</dt><dd dir="ltr" className="text-start">{current.phone}</dd></div>}
              </dl>
              <p className="rounded-xl bg-gray-50 p-4 leading-loose whitespace-pre-wrap">{current.message}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`mailto:${current.email}?subject=${encodeURIComponent(`رد: ${current.subject ?? 'رسالتك إلى لاميكو'}`)}`} className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"><Mail aria-hidden className="size-4" />رد بالبريد</a>
                {current.whatsappUrl && <a href={current.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white"><WhatsAppIcon className="size-4" />فتح المحادثة على واتساب</a>}
                <Button variant="ghost" onClick={() => void toggleRead()}><MailOpen aria-hidden className="size-4" />{current.isRead ? 'تعليم كغير مقروءة' : 'تعليم كمقروءة'}</Button>
                <button type="button" onClick={() => void remove()} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50"><Trash2 aria-hidden className="size-4" />حذف</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
