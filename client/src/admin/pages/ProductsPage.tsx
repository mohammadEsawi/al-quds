import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { cn } from '@/lib/cn';
import { adminApi, describeError } from '../api';
import { DataTable, Pagination, type Column } from '../components/DataTable';
import { adminInput } from '../components/Fields';
import { Badge, PageHeader, useConfirm, useToast } from '../components/ui';
import { useDebounced } from '../hooks';
import { sectorKeys, sectorLabels, statusLabels } from '../labels';
import type { ContentStatus, ProductDTO, ProductSectorKey } from '../types';

const statusTone = { published: 'green', draft: 'amber', hidden: 'gray' } as const;

export default function ProductsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const sector = (params.get('sector') as ProductSectorKey | null) ?? undefined;
  const status = (params.get('status') as ContentStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const search = useDebounced(q);

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => set({ q: search || undefined }), [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag-and-drop ordering only makes sense on the complete list of one sector.
  const canReorder = !!sector && !search && !status;
  const query = useAsync(
    () => adminApi.products.list({ sector, status, q: search, page, pageSize: canReorder ? 100 : 20 }),
    [sector, status, search, page],
  );

  const [rows, setRows] = useState<ProductDTO[] | undefined>();
  useEffect(() => setRows(query.data?.items), [query.data]);
  const dragId = useRef<string | null>(null);

  const patch = async (product: ProductDTO, body: Partial<{ status: ContentStatus; featured: boolean }>) => {
    try {
      const updated = await adminApi.products.update(product.id, body);
      setRows((list) => list?.map((p) => (p.id === product.id ? updated : p)));
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const remove = async (product: ProductDTO) => {
    if (!(await confirm({ title: 'حذف المنتج؟', text: `سيتم حذف «${product.name.ar}» نهائياً من الموقع.`, confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.products.remove(product.id);
      toast.success('تم حذف المنتج');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const move = async (fromId: string, toId: string) => {
    if (!rows || fromId === toId) return;
    const from = rows.findIndex((p) => p.id === fromId);
    const to = rows.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) return;
    const next = rows.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setRows(next);
    try {
      await adminApi.products.reorder(next.map((p, index) => ({ id: p.id, sortOrder: index })));
      toast.success('تم حفظ الترتيب');
    } catch (error) {
      toast.error(describeError(error).message);
      query.reload();
    }
  };

  const columns: Column<ProductDTO>[] = [
    ...(canReorder
      ? [
          {
            key: 'order',
            header: '',
            className: 'w-24',
            cell: (p: ProductDTO, i: number) => (
              <div className="flex items-center gap-0.5 text-gray-300">
                <GripVertical aria-hidden className="size-4 cursor-grab" />
                <button type="button" aria-label="نقل للأعلى" disabled={i === 0} onClick={() => rows && void move(p.id, rows[i - 1]!.id)} className="rounded p-1 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"><ArrowUp aria-hidden className="size-3.5" /></button>
                <button type="button" aria-label="نقل للأسفل" disabled={!rows || i === rows.length - 1} onClick={() => rows && void move(p.id, rows[i + 1]!.id)} className="rounded p-1 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"><ArrowDown aria-hidden className="size-3.5" /></button>
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'product',
      header: 'المنتج',
      cell: (p) => (
        <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {p.image ? <img src={p.image} alt="" loading="lazy" className="size-full object-cover" /> : <span className="text-[10px] text-gray-400">بدون صورة</span>}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-gray-900">{p.name.ar}</span>
            <span dir="ltr" className="block truncate text-start text-xs text-gray-400">{p.name.en}</span>
          </span>
        </Link>
      ),
    },
    { key: 'sector', header: 'القطاع', cell: (p) => <Badge tone="blue">{sectorLabels[p.sector]}</Badge> },
    { key: 'size', header: 'الحجم / النوع', cell: (p) => <span className="text-gray-600">{p.size?.ar || '—'}</span> },
    {
      key: 'status',
      header: 'الحالة',
      cell: (p) => (
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[p.status]}>{statusLabels[p.status]}</Badge>
          {p.isPlaceholder && <Badge tone="purple">نموذج</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-44 text-end',
      cell: (p) => (
        <div className="flex items-center justify-end gap-0.5">
          <button type="button" onClick={() => void patch(p, { featured: !p.featured })} aria-label={p.featured ? 'إزالة التمييز' : 'تمييز المنتج'} aria-pressed={p.featured} className={cn('rounded-md p-2 hover:bg-gray-100', p.featured ? 'text-amber-500' : 'text-gray-300')}>
            <Star aria-hidden className={cn('size-[18px]', p.featured && 'fill-current')} />
          </button>
          <button type="button" onClick={() => void patch(p, { status: p.status === 'published' ? 'hidden' : 'published' })} aria-label={p.status === 'published' ? 'إخفاء' : 'نشر'} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            {p.status === 'published' ? <Eye aria-hidden className="size-[18px]" /> : <EyeOff aria-hidden className="size-[18px]" />}
          </button>
          <Link to={`/admin/products/${p.id}`} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></Link>
          <button type="button" onClick={() => void remove(p)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
        </div>
      ),
    },
  ];

  const newHref = `/admin/products/new${sector ? `?sector=${sector}` : ''}`;
  const title = sector ? `منتجات: ${sectorLabels[sector]}` : 'كل المنتجات';

  return (
    <>
      <PageHeader
        title={title}
        description={sector === 'water' ? 'أحجام مياه القدس وعبواتها. أضف حجماً جديداً وسيظهر في الموقع فوراً.' : 'أضف المنتجات وعدّلها وحدد ترتيب ظهورها في الموقع.'}
        actions={
          <Link to={newHref}>
            <Button><Plus aria-hidden className="size-4" />{sector === 'water' ? 'إضافة منتج مياه' : 'إضافة منتج'}</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[undefined, ...sectorKeys].map((key) => (
          <button
            key={key ?? 'all'}
            type="button"
            onClick={() => set({ sector: key })}
            aria-pressed={sector === key}
            className={cn('rounded-full border-[1.5px] px-4 py-1.5 text-sm font-medium transition', sector === key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary')}
          >
            {key ? sectorLabels[key] : 'الكل'}
          </button>
        ))}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <select value={status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })} aria-label="تصفية حسب الحالة" className={cn(adminInput, 'w-36')}>
            <option value="">كل الحالات</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." aria-label="بحث في المنتجات" className={cn(adminInput, 'w-52 ps-9')} />
          </div>
        </div>
      </div>

      {canReorder && rows && rows.length > 1 && <p className="mb-3 text-xs text-gray-500">اسحب الصفوف (أو استعمل الأسهم) لتغيير ترتيب ظهور المنتجات في الموقع.</p>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
        emptyTitle="لا توجد منتجات"
        emptyText="ابدأ بإضافة أول منتج في هذا القطاع."
        emptyAction={<Link to={newHref}><Button>إضافة منتج</Button></Link>}
        rowProps={(p) =>
          canReorder
            ? {
                draggable: true,
                onDragStart: (e) => {
                  dragId.current = p.id;
                  e.dataTransfer.effectAllowed = 'move';
                },
                onDragOver: (e) => e.preventDefault(),
                onDrop: () => dragId.current && void move(dragId.current, p.id),
              }
            : {}
        }
      />
      {query.data && !canReorder && <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => set({ page: String(n) })} />}
    </>
  );
}
