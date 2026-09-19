import { useRef, useState, type DragEvent } from 'react';
import { Copy, RefreshCw, Search, Trash2, Upload, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { cn } from '@/lib/cn';
import { adminApi, describeError } from '../api';
import { Pagination } from '../components/DataTable';
import { LocalizedField, adminInput } from '../components/Fields';
import { Badge, Card, ErrorBlock, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { useDebounced } from '../hooks';
import { formatBytes, formatDate } from '../labels';
import type { Loc, MediaDTO } from '../types';

export default function MediaPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'image' | 'video'>('');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState<MediaDTO | null>(null);
  const [alt, setAlt] = useState<Loc>({ ar: '', en: '' });
  const search = useDebounced(q);
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const query = useAsync(() => adminApi.media.list({ kind: kind || undefined, q: search, page, pageSize: 24 }), [kind, search, page]);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(list.length);
    let done = 0;
    for (const file of list) {
      try {
        await adminApi.media.upload(file);
        done += 1;
      } catch (error) {
        toast.error(`${file.name}: ${describeError(error).message}`);
      }
      setUploading((n) => n - 1);
    }
    if (done) {
      toast.success(`تم رفع ${done} ${done === 1 ? 'ملف' : 'ملفات'}`);
      setPage(1);
      query.reload();
    }
    if (input.current) input.current.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void upload(e.dataTransfer.files);
  };

  const open = (m: MediaDTO) => {
    setSelected(m);
    setAlt(m.alt);
  };

  const saveAlt = async () => {
    if (!selected) return;
    try {
      const updated = await adminApi.media.update(selected.id, { alt });
      setSelected(updated);
      toast.success('تم حفظ النص البديل');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const replace = async (file?: File) => {
    if (!selected || !file) return;
    try {
      const updated = await adminApi.media.replace(selected.id, file);
      setSelected(updated);
      toast.success('تم استبدال الملف (الرابط ثابت)');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
    if (replaceInput.current) replaceInput.current.value = '';
  };

  const remove = async () => {
    if (!selected) return;
    if (!(await confirm({ title: 'حذف الملف؟', text: 'إذا كان مستخدماً في منتج أو صفحة ستظهر مكانه صورة مفقودة.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.media.remove(selected.id);
      toast.success('تم حذف الملف');
      setSelected(null);
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const copy = async (url: string) => {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    toast.info('تم نسخ الرابط');
  };

  return (
    <>
      <PageHeader
        title="مكتبة الوسائط"
        description="صور الموقع وفيديوهاته: المنتجات، الملصقات، الشاحنة، العقار، وغيرها."
        actions={
          <>
            <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="hidden" onChange={(e) => e.target.files && void upload(e.target.files)} />
            <Button onClick={() => input.current?.click()} disabled={uploading > 0}>
              {uploading > 0 ? <Spinner className="size-4 text-white" /> : <Upload aria-hidden className="size-4" />}
              {uploading > 0 ? `جارٍ الرفع (${uploading})` : 'رفع ملفات'}
            </Button>
          </>
        }
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn('mb-5 rounded-xl border-2 border-dashed px-6 py-6 text-center text-sm transition', drag ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200 text-gray-400')}
      >
        اسحب الصور أو الفيديوهات وأفلتها هنا للرفع (JPG، PNG، WebP، GIF، MP4، WebM)
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="بحث بالاسم..." aria-label="بحث" className={cn(adminInput, 'w-56 ps-9')} />
        </div>
        <select value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setPage(1); }} aria-label="النوع" className={cn(adminInput, 'w-36')}>
          <option value="">كل الأنواع</option>
          <option value="image">صور</option>
          <option value="video">فيديو</option>
        </select>
      </div>

      {query.error ? (
        <Card><ErrorBlock onRetry={query.reload} /></Card>
      ) : !query.data ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : query.data.items.length === 0 ? (
        <Card className="px-6 py-14 text-center text-sm text-gray-500">لا توجد ملفات. ارفع أول صورة.</Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {query.data.items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => open(m)} className="group block w-full overflow-hidden rounded-xl border border-gray-100 bg-white text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="flex aspect-square items-center justify-center overflow-hidden bg-gray-100">
                  {m.kind === 'image' ? <img src={m.url} alt={m.alt.ar || m.originalName} loading="lazy" className="size-full object-cover" /> : <Video aria-hidden className="size-10 text-gray-400" />}
                </span>
                <span className="block truncate px-3 pt-2 text-xs font-semibold" title={m.originalName}>{m.originalName}</span>
                <span className="flex items-center justify-between px-3 pt-0.5 pb-2 text-[11px] text-gray-400"><span dir="ltr">{formatBytes(m.size)}</span><span>{formatDate(m.createdAt)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.data && <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={setPage} />}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.originalName ?? ''}
        size="lg"
        footer={
          <>
            <input ref={replaceInput} type="file" accept={selected?.mimeType} className="hidden" onChange={(e) => void replace(e.target.files?.[0])} />
            <button type="button" onClick={() => void remove()} className="me-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50"><Trash2 aria-hidden className="size-4" />حذف</button>
            <Button variant="secondary" onClick={() => replaceInput.current?.click()}><RefreshCw aria-hidden className="size-4" />استبدال الملف</Button>
            <Button onClick={() => void saveAlt()}>حفظ النص البديل</Button>
          </>
        }
      >
        {selected && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2">
              {selected.kind === 'image' ? <img src={selected.url} alt="" className="max-h-80 rounded-lg object-contain" /> : <video src={selected.url} controls className="max-h-80 rounded-lg" />}
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2"><Badge tone="blue">{selected.kind === 'image' ? 'صورة' : 'فيديو'}</Badge><Badge>{formatBytes(selected.size)}</Badge><Badge>{selected.mimeType}</Badge></div>
              <div>
                <p className="mb-1 font-medium">الرابط</p>
                <div className="flex gap-2">
                  <input readOnly dir="ltr" value={selected.url} className={adminInput} onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="secondary" onClick={() => void copy(selected.url)} aria-label="نسخ الرابط"><Copy aria-hidden className="size-4" /></Button>
                </div>
              </div>
              <p className="text-xs text-gray-400">رُفع في {formatDate(selected.createdAt, true)}</p>
              <LocalizedField label="النص البديل (لقارئات الشاشة)" value={alt} onChange={setAlt} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
