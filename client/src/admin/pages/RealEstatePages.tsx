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
import { realEstateStatusLabels } from '../labels';
import { emptyLoc, type Loc, type RealEstateDTO, type RealEstateStatus } from '../types';

const filled = (l: Loc) => l.ar.trim() !== '' && l.en.trim() !== '';

export function RealEstateListPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const query = useAsync(() => adminApi.realEstate.list());

  const remove = async (p: RealEstateDTO) => {
    if (!(await confirm({ title: 'حذف المشروع؟', text: `سيتم حذف «${p.name.ar}» نهائياً.`, confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.realEstate.remove(p.id);
      toast.success('تم حذف المشروع');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const columns: Column<RealEstateDTO>[] = [
    {
      key: 'name',
      header: 'المشروع',
      cell: (p) => (
        <Link to={`/admin/real-estate/${p.id}`} className="flex items-center gap-3">
          <img src={p.featuredImage} alt="" className="size-12 rounded-lg object-cover" />
          <span><span className="block font-semibold">{p.name.ar}</span><span dir="ltr" className="block text-start text-xs text-gray-400">{p.name.en}</span></span>
        </Link>
      ),
    },
    { key: 'location', header: 'الموقع', cell: (p) => <span className="text-gray-600">{p.location.ar}</span> },
    { key: 'status', header: 'الحالة', cell: (p) => <div className="flex gap-2"><Badge tone="blue">{realEstateStatusLabels[p.status]}</Badge>{!p.published && <Badge>مخفي</Badge>}</div> },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-end',
      cell: (p) => (
        <div className="flex justify-end gap-0.5">
          <Link to={`/admin/real-estate/${p.id}`} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></Link>
          <button type="button" onClick={() => void remove(p)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="العقار" description="مشاريع لاميكو العقارية (مثل إسكان أكاديمي هاوس)." actions={<Link to="/admin/real-estate/new"><Button><Plus aria-hidden className="size-4" />إضافة مشروع</Button></Link>} />
      <DataTable columns={columns} rows={query.data} rowKey={(p) => p.id} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا توجد مشاريع" />
    </>
  );
}

interface Form {
  slug: string;
  name: Loc;
  tagline: Loc;
  description: Loc[];
  location: Loc;
  featuredImage: string;
  gallery: { src: string; caption: Loc }[];
  features: Loc[];
  contactPhone: string;
  whatsappNumber: string;
  status: RealEstateStatus;
  published: boolean;
  sortOrder: string;
}

const blank = (): Form => ({
  slug: '',
  name: emptyLoc(),
  tagline: emptyLoc(),
  description: [emptyLoc()],
  location: emptyLoc(),
  featuredImage: '',
  gallery: [],
  features: [],
  contactPhone: '',
  whatsappNumber: '',
  status: 'construction',
  published: true,
  sortOrder: '',
});

export function RealEstateEditPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<Form | null>(isNew ? blank() : null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const query = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.realEstate.get(id)), [id]);

  useEffect(() => {
    const p = query.data;
    if (p) setForm({ slug: p.slug, name: p.name, tagline: p.tagline ?? emptyLoc(), description: p.description, location: p.location, featuredImage: p.featuredImage, gallery: p.gallery, features: p.features, contactPhone: p.contactPhone, whatsappNumber: p.whatsappNumber, status: p.status, published: p.published, sortOrder: String(p.sortOrder) });
  }, [query.data]);

  if (query.error) return <ErrorBlock onRetry={query.reload} />;
  if (!form) return <div className="flex justify-center py-24"><Spinner /></div>;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!filled(form.name) || !filled(form.location) || !form.featuredImage.trim() || !form.contactPhone.trim() || !form.whatsappNumber.trim()) {
      toast.error('أكمل الحقول المطلوبة: الاسم، الموقع، الصورة الرئيسية، الهاتف، رقم واتساب');
      return;
    }
    const body = {
      ...(form.slug.trim() && { slug: form.slug.trim() }),
      name: form.name,
      tagline: form.tagline,
      description: form.description.filter(filled),
      location: form.location,
      featuredImage: form.featuredImage.trim(),
      gallery: form.gallery.filter((g) => g.src.trim()).map((g) => ({ src: g.src.trim(), caption: g.caption })),
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
      if (isNew) await adminApi.realEstate.create(body);
      else await adminApi.realEstate.update(id, body);
      toast.success('تم الحفظ');
      navigate('/admin/real-estate');
    } catch (error) {
      const d = describeError(error);
      setProblems(d.fields);
      toast.error(d.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'حذف المشروع؟', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.realEstate.remove(id);
      navigate('/admin/real-estate');
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'إضافة مشروع عقاري' : `تعديل: ${form.name.ar}`}
        actions={!isNew && form.slug ? <a href={`/ar/real-estate/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-white"><ExternalLink aria-hidden className="size-4" />عرض في الموقع</a> : undefined}
      />
      <div className="space-y-6 pb-28">
        <ProblemList problems={problems} />
        <FormSection title="المعلومات الأساسية">
          <LocalizedField label="اسم المشروع" required value={form.name} onChange={(v) => set('name', v)} />
          <LocalizedField label="شعار / سطر تعريفي" value={form.tagline} onChange={(v) => set('tagline', v)} />
          <LocalizedField label="الموقع" required value={form.location} onChange={(v) => set('location', v)} />
          <div>
            <p className="mb-2 text-sm font-medium">الوصف (فقرات)</p>
            <ListEditor items={form.description} onChange={(v) => set('description', v)} newItem={emptyLoc} addLabel="إضافة فقرة" renderItem={(p, update) => <LocalizedField label="الفقرة" multiline rows={3} value={p} onChange={update} />} />
          </div>
        </FormSection>
        <FormSection title="الصور">
          <ImageField label="الصورة الرئيسية" value={form.featuredImage} onChange={(v) => set('featuredImage', v)} />
          <div>
            <p className="mb-2 text-sm font-medium">معرض الصور</p>
            <ListEditor
              items={form.gallery}
              onChange={(v) => set('gallery', v)}
              newItem={() => ({ src: '', caption: emptyLoc() })}
              addLabel="إضافة صورة"
              emptyText="لا توجد صور في المعرض"
              renderItem={(g, update) => (
                <div className="space-y-3">
                  <ImageField label="الصورة" compact value={g.src} onChange={(src) => update({ ...g, src })} />
                  <LocalizedField label="التعليق" value={g.caption} onChange={(caption) => update({ ...g, caption })} />
                </div>
              )}
            />
          </div>
        </FormSection>
        <FormSection title="المميزات">
          <ListEditor items={form.features} onChange={(v) => set('features', v)} newItem={emptyLoc} addLabel="إضافة ميزة" renderItem={(f, update) => <LocalizedField label="الميزة" value={f} onChange={update} />} />
        </FormSection>
        <FormSection title="التواصل والنشر">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="هاتف التواصل" required dir="ltr" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} placeholder="+970597959536" />
            <TextField label="رقم واتساب (أرقام فقط مع رمز الدولة)" required dir="ltr" value={form.whatsappNumber} onChange={(v) => set('whatsappNumber', v)} placeholder="9720597959536" />
            <SelectField label="حالة المشروع" value={form.status} onChange={(v) => set('status', v as RealEstateStatus)} options={Object.entries(realEstateStatusLabels).map(([value, label]) => ({ value, label }))} />
            <TextField label="الترتيب" type="number" dir="ltr" value={form.sortOrder} onChange={(v) => set('sortOrder', v)} />
            <TextField label="الرابط المختصر (slug)" dir="ltr" value={form.slug} onChange={(v) => set('slug', v.toLowerCase())} help="يُنشأ تلقائياً إن تُرك فارغاً." />
          </div>
          <Toggle checked={form.published} onChange={(v) => set('published', v)} label="منشور في الموقع" />
        </FormSection>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur lg:ps-64">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button size="lg" onClick={() => void save()} disabled={saving}><Save aria-hidden className="size-4" />{isNew ? 'إضافة المشروع' : 'حفظ التعديلات'}</Button>
          <Button variant="ghost" size="lg" onClick={() => navigate('/admin/real-estate')}>إلغاء</Button>
          {!isNew && <button type="button" onClick={() => void remove()} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50"><Trash2 aria-hidden className="size-4" />حذف</button>}
        </div>
      </div>
    </>
  );
}
