import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Search, Trash2, Upload, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { cn } from '@/lib/cn';
import { adminApi, describeError } from '../api';
import { useDebounced } from '../hooks';
import { formatBytes } from '../labels';
import type { MediaDTO } from '../types';
import { adminInput } from './Fields';
import { Modal, Spinner, useToast } from './ui';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaDTO) => void;
  kind?: 'image' | 'video';
}

/** Browse the media library, upload new files, and pick one. */
export function MediaPickerModal({ open, onClose, onSelect, kind = 'image' }: MediaPickerModalProps) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const search = useDebounced(q);
  const input = useRef<HTMLInputElement>(null);

  const query = useAsync(() => (open ? adminApi.media.list({ kind, q: search, page, pageSize: 24 }) : Promise.resolve(null)), [open, kind, search, page]);
  useEffect(() => setPage(1), [search]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const uploaded: MediaDTO[] = [];
    for (const file of Array.from(files)) {
      try {
        uploaded.push(await adminApi.media.upload(file));
      } catch (error) {
        toast.error(`${file.name}: ${describeError(error).message}`);
      }
    }
    setUploading(false);
    if (input.current) input.current.value = '';
    if (uploaded.length === 1) {
      onSelect(uploaded[0]!);
      onClose();
    } else if (uploaded.length > 1) {
      toast.success(`تم رفع ${uploaded.length} ملفات`);
      query.reload();
    }
  };

  const data = query.data;
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <Modal open={open} onClose={onClose} title={kind === 'video' ? 'اختيار فيديو' : 'اختيار صورة من المكتبة'} size="xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم..." className={cn(adminInput, 'ps-9')} />
        </div>
        <input ref={input} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
        <Button type="button" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Spinner className="size-4 text-white" /> : <Upload aria-hidden className="size-4" />}
          رفع ملفات
        </Button>
      </div>

      {query.loading && !data && <div className="flex justify-center py-16"><Spinner /></div>}
      {data && data.items.length === 0 && <p className="py-14 text-center text-sm text-gray-500">لا توجد ملفات بعد. ارفع أول ملف من الزر أعلاه.</p>}
      {data && data.items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {data.items.map((media) => (
            <li key={media.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(media);
                  onClose();
                }}
                className="group block w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50 text-start transition hover:border-primary hover:shadow-card"
              >
                <span className="flex aspect-square items-center justify-center overflow-hidden bg-gray-100">
                  {media.kind === 'image' ? <img src={media.url} alt={media.alt.ar || media.originalName} loading="lazy" className="size-full object-cover" /> : <Video aria-hidden className="size-8 text-gray-400" />}
                </span>
                <span className="block truncate px-2 pt-1.5 text-xs font-medium text-gray-700" title={media.originalName}>{media.originalName}</span>
                <span className="block px-2 pb-1.5 text-[11px] text-gray-400" dir="ltr">{formatBytes(media.size)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
          <span dir="ltr">{page} / {pages}</span>
          <Button type="button" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </Modal>
  );
}

interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  help?: string;
  kind?: 'image' | 'video';
  compact?: boolean;
}

/** A URL/path with a preview, plus buttons to pick from the library or upload straight away. */
export function ImageField({ label, value, onChange, help, kind = 'image', compact }: ImageFieldProps) {
  const toast = useToast();
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const uploadDirect = async (files: FileList | null) => {
    const first = files?.[0];
    if (!first) return;
    setUploading(true);
    try {
      const media = await adminApi.media.upload(first);
      onChange(media.url);
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {!compact && <span className="text-sm font-medium text-gray-800">{label}</span>}
      <div className="flex items-start gap-3">
        <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50', compact ? 'size-14' : 'size-24')}>
          {value ? (
            kind === 'image' ? <img src={value} alt="" className="size-full object-cover" /> : <Video aria-hidden className="size-6 text-primary" />
          ) : (
            <ImagePlus aria-hidden className="size-6 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/media/... أو /assets/..." aria-label={label} className={adminInput} />
          <div className="flex flex-wrap gap-2">
            <input ref={file} type="file" accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/gif'} className="hidden" onChange={(e) => void uploadDirect(e.target.files)} />
            <Button type="button" size="md" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => file.current?.click()} disabled={uploading}>
              {uploading ? <Spinner className="size-3.5" /> : <Upload aria-hidden className="size-3.5" />}
              رفع
            </Button>
            <Button type="button" size="md" variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setPicker(true)}>
              من المكتبة
            </Button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-error hover:bg-red-50">
                <Trash2 aria-hidden className="size-3.5" />
                إزالة
              </button>
            )}
          </div>
          {help && <p className="text-xs text-gray-400">{help}</p>}
        </div>
      </div>
      <MediaPickerModal open={picker} onClose={() => setPicker(false)} onSelect={(m) => onChange(m.url)} kind={kind} />
    </div>
  );
}
