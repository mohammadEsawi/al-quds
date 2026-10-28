import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { DataTable, type Column } from '../components/DataTable';
import { FormSection, LocalizedField, ProblemList, SelectField, TextField, Toggle } from '../components/Fields';
import { ListEditor } from '../components/ListEditor';
import { ImageField } from '../components/MediaPicker';
import { Badge, ErrorBlock, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { landStatusLabels } from '../labels';
import { emptyLoc, type Loc, type LandDTO, type LandStatus } from '../types';

const filled = (l: Loc) => l.ar.trim() !== '' && l.en.trim() !== '';

export function LandsListPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const query = useAsync(() => adminApi.lands.list());

  const remove = async (l: LandDTO) => {
    if (!(await confirm({ title: 'حذف الأرض؟', text: `سيتم حذف «${l.title.ar}» نهائياً.`, confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.lands.remove(l.id);
      toast.success('تم حذف الأرض');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const columns: Column<LandDTO>[] = [
    {
      key: 'title',
      header: 'الأرض',
      cell: (l) => (
        <Link to={`/admin/lands/${l.id}`} className="flex items-center gap-3">
          <img src={l.featuredImage} alt="" className="size-12 rounded-lg object-cover" />
          <span><span className="block font-semibold">{l.title.ar}</span><span dir="ltr" className="block text-start text-xs text-gray-400">{l.title.en}</span></span>
        </Link>
      ),
    },
    { key: 'location', header: 'الموقع', cell: (l) => <span className="text-gray-600">{l.location.ar}</span> },
    { key: 'status', header: 'الحالة', cell: (l) => <div className="flex gap-2"><Badge tone="blue">{landStatusLabels[l.status]}</Badge>{!l.published && <Badge>مخفي</Badge>}</div> },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-end',
      cell: (l) => (
        <div className="flex justify-end gap-0.5">
          <Link to={`/admin/lands/${l.id}`} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></Link>
          <button type="button" onClick={() => void remove(l)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="الأراضي" description="قطع أراضٍ للبيع — قسم منفصل عن مشاريع العقار، كل أرض لها جهة تواصل خاصة فيها." actions={<Link to="/admin/lands/new"><Button><Plus aria-hidden className="size-4" />إضافة أرض</Button></Link>} />
      <DataTable columns={columns} rows={query.data} rowKey={(l) => l.id} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا توجد أراضٍ بعد" />
    </>
  );
}

interface Form {
  slug: string;
  title: Loc;
  area: Loc;
  description: Loc[];
  location: Loc;
  featuredImage: string;
  gallery: { src: string; caption: Loc; kind: 'image' | 'video'; poster: string }[];
  features: Loc[];
  contactPhone: string;
  whatsappNumber: string;
  status: LandStatus;
  published: boolean;
  sortOrder: string;
}

const blank = (): Form => ({
  slug: '',
  title: emptyLoc(),
  area: emptyLoc(),
  description: [emptyLoc()],
  location: emptyLoc(),
  featuredImage: '',
  gallery: [],
  features: [],
  contactPhone: '',
  whatsappNumber: '',
  status: 'available',
  published: true,
  sortOrder: '',
});

export function LandEditPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<Form | null>(isNew ? blank() : null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const query = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.lands.get(id)), [id]);

  useEffect(() => {
    const l = query.data;
    if (l)
      setForm({
        slug: l.slug,
        title: l.title,
        area: l.area ?? emptyLoc(),
        description: l.description,
        location: l.location,
        featuredImage: l.featuredImage,
        gallery: l.gallery.map((g) => ({ src: g.src, caption: g.caption, kind: g.kind ?? 'image', poster: g.poster ?? '' })),
        features: l.features,
        contactPhone: l.contactPhone,
        whatsappNumber: l.whatsappNumber,
        status: l.status,
        published: l.published,
        sortOrder: String(l.sortOrder),
      });
  }, [query.data]);

  if (query.error) return <ErrorBlock onRetry={query.reload} />;
  if (!form) return <div className="flex justify-center py-24"><Spinner /></div>;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!filled(form.title) || !filled(form.location) || !form.featuredImage.trim() || !form.contactPhone.trim() || !form.whatsappNumber.trim()) {
      toast.error('أكمل الحقول المطلوبة: العنوان، الموقع، الصورة الرئيسية، الهاتف، رقم واتساب');
      return;
    }
    const body = {
      ...(form.slug.trim() && { slug: form.slug.trim() }),
      title: form.title,
      area: form.area,
      description: form.description.filter(filled),
      location: form.location,
      featuredImage: form.featuredImage.trim(),
      gallery: form.gallery
        .filter((g) => g.src.trim())
        .map((g) => ({ src: g.src.trim(), caption: g.caption, kind: g.kind, ...(g.kind === 'video' && g.poster.trim() && { poster: g.poster.trim() }) })),
      features: form.features.filter(filled),
      contactPhone: form.contactPhone.trim(),
      whatsappNumber: form.whatsappNumber.replace(/\D/g, ''),
      status: form.status,
      published: form.published,
      ...(form.sortOrder !== '' && { sortOrder: Number(form.sortOrder) }),
    };
    setSaving(true);
    setProblems([]);
    try {
      if (isNew) await adminApi.lands.create(body);
      else await adminApi.lands.update(id, body);
      toast.success('تم الحفظ');
      navigate('/admin/lands');
    } catch (error) {
      const d = describeError(error);
      setProblems(d.fields);
      toast.error(d.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'حذف الأرض؟', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.lands.remove(id);
      navigate('/admin/lands');
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'إضافة أرض' : `تعديل: ${form.title.ar}`}
        actions={!isNew && form.slug ? <a href={`/ar/lands/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-white"><ExternalLink aria-hidden className="size-4" />عرض في الموقع</a> : undefined}
      />
      <div className="space-y-6 pb-28">
        <ProblemList problems={problems} />
        <FormSection title="المعلومات الأساسية">
          <LocalizedField label="عنوان الأرض" required value={form.title} onChange={(v) => set('title', v)} help="مثال: أرض للبيع في ضواحي نابلس" />
          <LocalizedField label="المساحة" value={form.area} onChange={(v) => set('area', v)} help="مثال: 500 م² أو دونمان" />
          <LocalizedField label="الموقع" required value={form.location} onChange={(v) => set('location', v)} />
          <div>
            <p className="mb-2 text-sm font-medium">الوصف (فقرات)</p>
            <ListEditor items={form.description} onChange={(v) => set('description', v)} newItem={emptyLoc} addLabel="إضافة فقرة" renderItem={(p, update) => <LocalizedField label="الفقرة" multiline rows={3} value={p} onChange={update} />} />
          </div>
        </FormSection>
        <FormSection title="الصور والفيديوهات">
          <ImageField label="الصورة الرئيسية" value={form.featuredImage} onChange={(v) => set('featuredImage', v)} />
          <div>
            <p className="mb-2 text-sm font-medium">معرض الصور والفيديوهات</p>
            <ListEditor
              items={form.gallery}
              onChange={(v) => set('gallery', v)}
              newItem={(): Form['gallery'][number] => ({ src: '', caption: emptyLoc(), kind: 'image', poster: '' })}
              addLabel="إضافة صورة"
              emptyText="لا توجد صور في المعرض"
              renderItem={(g, update) => (
                <div className="space-y-3">
                  <SelectField
                    label="النوع"
                    value={g.kind}
                    onChange={(kind) => update({ ...g, kind: kind as 'image' | 'video' })}
                    options={[
                      { value: 'image', label: 'صورة' },
                      { value: 'video', label: 'فيديو' },
                    ]}
                  />
                  <ImageField label={g.kind === 'video' ? 'ملف الفيديو' : 'الصورة'} compact kind={g.kind} value={g.src} onChange={(src) => update({ ...g, src })} />
                  {g.kind === 'video' && (
                    <ImageField label="صورة الغلاف (تظهر بالمعرض قبل التشغيل)" compact value={g.poster} onChange={(poster) => update({ ...g, poster })} />
                  )}
                  <LocalizedField label="التعليق" value={g.caption} onChange={(caption) => update({ ...g, caption })} />
                </div>
              )}
            />
          </div>
        </FormSection>
        <FormSection title="المميزات">
          <ListEditor items={form.features} onChange={(v) => set('features', v)} newItem={emptyLoc} addLabel="إضافة ميزة" renderItem={(f, update) => <LocalizedField label="الميزة" value={f} onChange={update} />} />
        </FormSection>
        <FormSection title="التواصل والنشر" description="رقم خاص بهاي الأرض تحديداً — ينفع يكون مختلف عن أرقام الشركة العامة.">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="هاتف المسؤول المباشر" required dir="ltr" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} placeholder="+970597959536" />
            <TextField label="رقم واتساب المسؤول (أرقام فقط مع رمز الدولة)" required dir="ltr" value={form.whatsappNumber} onChange={(v) => set('whatsappNumber', v)} placeholder="9720597959536" />
            <SelectField label="حالة الأرض" value={form.status} onChange={(v) => set('status', v as LandStatus)} options={Object.entries(landStatusLabels).map(([value, label]) => ({ value, label }))} />
            <TextField label="الترتيب" type="number" dir="ltr" value={form.sortOrder} onChange={(v) => set('sortOrder', v)} />
            <TextField label="الرابط المختصر (slug)" dir="ltr" value={form.slug} onChange={(v) => set('slug', v.toLowerCase())} help="يُنشأ تلقائياً إن تُرك فارغاً. استخدمه كرابط مباشر بإعلانك عن هاي الأرض." />
          </div>
          <Toggle checked={form.published} onChange={(v) => set('published', v)} label="منشور في الموقع" />
        </FormSection>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur lg:ps-64">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button size="lg" onClick={() => void save()} disabled={saving}><Save aria-hidden className="size-4" />{isNew ? 'إضافة الأرض' : 'حفظ التعديلات'}</Button>
          <Button variant="ghost" size="lg" onClick={() => navigate('/admin/lands')}>إلغاء</Button>
          {!isNew && <button type="button" onClick={() => void remove()} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50"><Trash2 aria-hidden className="size-4" />حذف</button>}
        </div>
      </div>
    </>
  );
}
