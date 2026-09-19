import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { DataTable, type Column } from '../components/DataTable';
import { LocalizedField, ProblemList, SelectField, TextField, Toggle } from '../components/Fields';
import { ImageField } from '../components/MediaPicker';
import { Badge, Card, ErrorBlock, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { sectorKeys, sectorLabels } from '../labels';
import { emptyLoc, type CategoryDTO, type Loc, type ProductSectorKey, type SectorDTO, type WaterLabelDTO } from '../types';

const filled = (l: Loc) => l.ar.trim() !== '' && l.en.trim() !== '';
const slugFrom = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Runs an API call inside a form modal: toasts, field problems and the saving flag in one place. */
function useSave(onDone: () => void) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setProblems([]);
    try {
      await action();
      toast.success(success);
      onDone();
    } catch (error) {
      const { message, fields } = describeError(error);
      setProblems(fields);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  return { saving, problems, run, setProblems };
}

// ───────────────────────── Water labels ─────────────────────────

interface LabelForm {
  name: Loc;
  image: string;
  active: boolean;
  sortOrder: string;
}

export function WaterLabelsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const query = useAsync(() => adminApi.labels.list());
  const [editing, setEditing] = useState<{ id: string | null; form: LabelForm } | null>(null);
  const { saving, problems, run, setProblems } = useSave(() => {
    setEditing(null);
    query.reload();
  });

  const openNew = () => {
    setProblems([]);
    setEditing({ id: null, form: { name: emptyLoc(), image: '', active: true, sortOrder: String(query.data?.length ?? 0) } });
  };
  const openEdit = (l: WaterLabelDTO) => {
    setProblems([]);
    setEditing({ id: l.id, form: { name: l.name, image: l.image ?? '', active: l.active, sortOrder: String(l.sortOrder) } });
  };

  const save = () => {
    if (!editing) return;
    const { form, id } = editing;
    if (!filled(form.name)) return toast.error('اسم الملصق مطلوب بالعربية والإنجليزية');
    const body = { name: form.name, image: form.image.trim() || null, active: form.active, sortOrder: Number(form.sortOrder) || 0 };
    void run(() => (id ? adminApi.labels.update(id, body) : adminApi.labels.create(body)), id ? 'تم حفظ الملصق' : 'تمت إضافة الملصق');
  };

  const remove = async (l: WaterLabelDTO) => {
    if (!(await confirm({ title: 'حذف الملصق؟', text: `سيُزال «${l.name.ar}» من كل المنتجات.`, confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.labels.remove(l.id);
      toast.success('تم حذف الملصق');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  return (
    <>
      <PageHeader title="ملصقات المياه" description="صور ملصقات عبوات مياه القدس. تظهر للزائر في اختيار الملصق بصفحة المياه." actions={<Button onClick={openNew}><Plus aria-hidden className="size-4" />إضافة ملصق</Button>} />

      {query.error ? (
        <Card><ErrorBlock onRetry={query.reload} /></Card>
      ) : !query.data ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : query.data.length === 0 ? (
        <Card className="px-6 py-14 text-center text-sm text-gray-500">لا توجد ملصقات بعد. ارفع صور الملصقات من زر «إضافة ملصق».</Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {query.data.map((l) => (
            <li key={l.id}>
              <Card className="overflow-hidden">
                <div className="flex aspect-[4/3] items-center justify-center bg-gray-50">
                  {l.image ? <img src={l.image} alt={l.name.ar} className="size-full object-contain p-3" /> : <span className="text-xs text-gray-400">لم تُرفع صورة بعد</span>}
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{l.name.ar}</p>
                      <p dir="ltr" className="text-start text-xs text-gray-400">{l.name.en}</p>
                    </div>
                    <Badge tone={l.active ? 'green' : 'gray'}>{l.active ? 'فعّال' : 'غير فعّال'}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => openEdit(l)}><Pencil aria-hidden className="size-3.5" />تعديل</Button>
                    <button type="button" onClick={() => void remove(l)} aria-label="حذف" className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-4" /></button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'تعديل الملصق' : 'إضافة ملصق'}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></>}
      >
        {editing && (
          <div className="space-y-5">
            <ProblemList problems={problems} />
            <LocalizedField label="اسم الملصق" required value={editing.form.name} onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })} />
            <ImageField label="صورة الملصق" value={editing.form.image} onChange={(image) => setEditing({ ...editing, form: { ...editing.form, image } })} />
            <TextField label="الترتيب" type="number" dir="ltr" value={editing.form.sortOrder} onChange={(sortOrder) => setEditing({ ...editing, form: { ...editing.form, sortOrder } })} className="max-w-32" />
            <Toggle checked={editing.form.active} onChange={(active) => setEditing({ ...editing, form: { ...editing.form, active } })} label="فعّال" help="غير الفعّال لا يظهر في الموقع." />
          </div>
        )}
      </Modal>
    </>
  );
}

// ───────────────────────── Categories ─────────────────────────

interface CategoryForm {
  slug: string;
  sector: ProductSectorKey | '';
  name: Loc;
  sortOrder: string;
}

export function CategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const query = useAsync(() => adminApi.categories.list());
  const [editing, setEditing] = useState<{ id: string | null; form: CategoryForm } | null>(null);
  const { saving, problems, run, setProblems } = useSave(() => {
    setEditing(null);
    query.reload();
  });

  const openNew = () => {
    setProblems([]);
    setEditing({ id: null, form: { slug: '', sector: '', name: emptyLoc(), sortOrder: '0' } });
  };
  const openEdit = (c: CategoryDTO) => {
    setProblems([]);
    setEditing({ id: c.id, form: { slug: c.slug, sector: c.sector ?? '', name: c.name, sortOrder: String(c.sortOrder) } });
  };

  const save = () => {
    if (!editing) return;
    const { form, id } = editing;
    if (!filled(form.name)) return toast.error('اسم التصنيف مطلوب بالعربية والإنجليزية');
    const slug = form.slug.trim() || slugFrom(form.name.en);
    if (!slug) return toast.error('الرابط المختصر مطلوب (أحرف إنجليزية)');
    const body = { slug, sector: form.sector || null, name: form.name, sortOrder: Number(form.sortOrder) || 0 };
    void run(() => (id ? adminApi.categories.update(id, body) : adminApi.categories.create(body)), id ? 'تم حفظ التصنيف' : 'تمت إضافة التصنيف');
  };

  const remove = async (c: CategoryDTO) => {
    if (!(await confirm({ title: 'حذف التصنيف؟', text: 'المنتجات المرتبطة به ستبقى بدون تصنيف.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.categories.remove(c.id);
      toast.success('تم حذف التصنيف');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const columns: Column<CategoryDTO>[] = [
    { key: 'name', header: 'الاسم', cell: (c) => <div><p className="font-semibold">{c.name.ar}</p><p dir="ltr" className="text-start text-xs text-gray-400">{c.name.en}</p></div> },
    { key: 'sector', header: 'القطاع', cell: (c) => (c.sector ? <Badge tone="blue">{sectorLabels[c.sector]}</Badge> : <span className="text-gray-400">كل القطاعات</span>) },
    { key: 'slug', header: 'الرابط', cell: (c) => <span dir="ltr" className="font-mono text-xs text-gray-500">{c.slug}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-end',
      cell: (c) => (
        <div className="flex justify-end gap-0.5">
          <button type="button" onClick={() => openEdit(c)} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></button>
          <button type="button" onClick={() => void remove(c)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="التصنيفات" description="تجميع المنتجات (مثال: بهارات وتوابل، أعشاب طبيعية)." actions={<Button onClick={openNew}><Plus aria-hidden className="size-4" />إضافة تصنيف</Button>} />
      <DataTable columns={columns} rows={query.data} rowKey={(c) => c.id} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا توجد تصنيفات" />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'تعديل التصنيف' : 'إضافة تصنيف'} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></>}>
        {editing && (
          <div className="space-y-5">
            <ProblemList problems={problems} />
            <LocalizedField label="اسم التصنيف" required value={editing.form.name} onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="القطاع" value={editing.form.sector} onChange={(v) => setEditing({ ...editing, form: { ...editing.form, sector: v as ProductSectorKey | '' } })} options={[{ value: '', label: 'كل القطاعات' }, ...sectorKeys.map((k) => ({ value: k, label: sectorLabels[k] }))]} />
              <TextField label="الرابط المختصر (slug)" dir="ltr" value={editing.form.slug} onChange={(slug) => setEditing({ ...editing, form: { ...editing.form, slug: slug.toLowerCase() } })} help="يُنشأ من الاسم الإنجليزي إن تُرك فارغاً." />
            </div>
            <TextField label="الترتيب" type="number" dir="ltr" value={editing.form.sortOrder} onChange={(sortOrder) => setEditing({ ...editing, form: { ...editing.form, sortOrder } })} className="max-w-32" />
          </div>
        )}
      </Modal>
    </>
  );
}

// ───────────────────────── Sectors ─────────────────────────

interface SectorForm {
  name: Loc;
  description: Loc;
  image: string;
  active: boolean;
  sortOrder: string;
}

export function SectorsPage() {
  const query = useAsync(() => adminApi.sectors.list());
  const [editing, setEditing] = useState<{ id: string; key: string; form: SectorForm } | null>(null);
  const { saving, problems, run, setProblems } = useSave(() => {
    setEditing(null);
    query.reload();
  });

  const save = () => {
    if (!editing) return;
    const { form, id } = editing;
    if (!filled(form.name) || !filled(form.description)) return;
    void run(() => adminApi.sectors.update(id, { name: form.name, description: form.description, image: form.image.trim() || null, active: form.active, sortOrder: Number(form.sortOrder) || 0 }), 'تم حفظ القطاع');
  };

  return (
    <>
      <PageHeader title="القطاعات" description="بطاقات القطاعات في الصفحة الرئيسية وصفحة «قطاعاتنا»." />
      {query.error ? (
        <Card><ErrorBlock onRetry={query.reload} /></Card>
      ) : !query.data ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.map((s: SectorDTO) => (
            <li key={s.id}>
              <Card className="flex h-full flex-col overflow-hidden">
                <div className="flex h-32 items-center justify-center bg-linear-to-br from-primary-dark to-primary">
                  {s.image ? <img src={s.image} alt="" className="size-full object-cover" /> : <span dir="ltr" className="font-display text-4xl font-bold text-white/40">{s.number}</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-semibold">{s.name.ar}</p>
                    <Badge tone={s.active ? 'green' : 'gray'}>{s.active ? 'ظاهر' : 'مخفي'}</Badge>
                  </div>
                  <p className="flex-1 text-sm text-gray-500">{s.description.ar}</p>
                  <Button variant="secondary" className="mt-3 self-start !px-3 !py-1.5 !text-xs" onClick={() => { setProblems([]); setEditing({ id: s.id, key: s.key, form: { name: s.name, description: s.description, image: s.image ?? '', active: s.active, sortOrder: String(s.sortOrder) } }); }}>
                    <Pencil aria-hidden className="size-3.5" />تعديل
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="تعديل القطاع" footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></>}>
        {editing && (
          <div className="space-y-5">
            <ProblemList problems={problems} />
            <LocalizedField label="اسم القطاع" required value={editing.form.name} onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })} />
            <LocalizedField label="وصف القطاع" required multiline rows={3} value={editing.form.description} onChange={(description) => setEditing({ ...editing, form: { ...editing.form, description } })} />
            <ImageField label="صورة البطاقة" value={editing.form.image} onChange={(image) => setEditing({ ...editing, form: { ...editing.form, image } })} help="اتركها فارغة لعرض تدرّج لوني بدل الصورة." />
            <TextField label="الترتيب" type="number" dir="ltr" value={editing.form.sortOrder} onChange={(sortOrder) => setEditing({ ...editing, form: { ...editing.form, sortOrder } })} className="max-w-32" />
            <Toggle checked={editing.form.active} onChange={(active) => setEditing({ ...editing, form: { ...editing.form, active } })} label="إظهار القطاع في الموقع" />
          </div>
        )}
      </Modal>
    </>
  );
}
