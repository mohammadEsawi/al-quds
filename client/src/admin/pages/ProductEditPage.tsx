import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { FormSection, LocalizedField, ProblemList, SelectField, TextField, Toggle } from '../components/Fields';
import { ListEditor } from '../components/ListEditor';
import { ImageField } from '../components/MediaPicker';
import { ErrorBlock, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { sectorKeys, sectorLabels, statusLabels } from '../labels';
import { emptyLoc, type ContentStatus, type Loc, type ProductDTO, type ProductSectorKey } from '../types';

interface Form {
  sector: ProductSectorKey;
  slug: string;
  name: Loc;
  category: Loc;
  categoryId: string;
  shortDescription: Loc;
  description: Loc;
  image: string;
  secondaryImage: string;
  videoUrl: string;
  gallery: string[];
  size: Loc;
  tag: Loc;
  sku: string;
  specs: { label: Loc; value: Loc }[];
  features: Loc[];
  labelIds: string[];
  featured: boolean;
  status: ContentStatus;
  isPlaceholder: boolean;
  sortOrder: string;
}

/** Sensible starting text so adding a water size takes seconds. */
const WATER_CATEGORY: Loc = { ar: 'مياه شرب معبأة', en: 'Bottled drinking water' };

const blank = (sector: ProductSectorKey): Form => ({
  sector,
  slug: '',
  name: emptyLoc(),
  category: sector === 'water' ? { ...WATER_CATEGORY } : emptyLoc(),
  categoryId: '',
  shortDescription: emptyLoc(),
  description: emptyLoc(),
  image: '',
  secondaryImage: '',
  videoUrl: '',
  gallery: [],
  size: emptyLoc(),
  tag: emptyLoc(),
  sku: '',
  specs: [],
  features: [],
  labelIds: [],
  featured: false,
  status: 'published',
  isPlaceholder: false,
  sortOrder: '',
});

const fromProduct = (p: ProductDTO): Form => ({
  sector: p.sector,
  slug: p.slug,
  name: p.name,
  category: p.category,
  categoryId: p.categoryId ?? '',
  shortDescription: p.shortDescription,
  description: p.description,
  image: p.image ?? '',
  secondaryImage: p.secondaryImage ?? '',
  videoUrl: p.videoUrl ?? '',
  gallery: p.gallery,
  size: p.size ?? emptyLoc(),
  tag: p.tag ?? emptyLoc(),
  sku: p.sku ?? '',
  specs: p.specs,
  features: p.features,
  labelIds: p.labelIds,
  featured: p.featured,
  status: p.status,
  isPlaceholder: p.isPlaceholder,
  sortOrder: String(p.sortOrder),
});

const filled = (l: Loc) => l.ar.trim() !== '' && l.en.trim() !== '';

/** Drops half-filled rows and empty values so the API only receives complete data. */
function toPayload(f: Form) {
  return {
    sector: f.sector,
    ...(f.slug.trim() && { slug: f.slug.trim() }),
    name: f.name,
    category: f.category,
    categoryId: f.categoryId || null,
    shortDescription: f.shortDescription,
    description: f.description,
    image: f.image.trim() || null,
    secondaryImage: f.secondaryImage.trim() || null,
    videoUrl: f.videoUrl.trim() || null,
    gallery: f.gallery.map((g) => g.trim()).filter(Boolean),
    size: f.size,
    tag: f.tag,
    sku: f.sku.trim() || null,
    specs: f.specs.filter((s) => filled(s.label) && filled(s.value)),
    features: f.features.filter(filled),
    labelIds: f.sector === 'water' ? f.labelIds : [],
    featured: f.featured,
    status: f.status,
    isPlaceholder: f.isPlaceholder,
    ...(f.sortOrder !== '' && Number.isFinite(Number(f.sortOrder)) && { sortOrder: Number(f.sortOrder) }),
  };
}

export default function ProductEditPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const initialSector = (sectorKeys.includes(params.get('sector') as ProductSectorKey) ? params.get('sector') : 'water') as ProductSectorKey;
  const [form, setForm] = useState<Form | null>(isNew ? blank(initialSector) : null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const product = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.products.get(id)), [id]);
  const categories = useAsync(() => adminApi.categories.list());
  const labels = useAsync(() => adminApi.labels.list());

  useEffect(() => {
    if (product.data) setForm(fromProduct(product.data));
  }, [product.data]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const sectorCategories = useMemo(() => (categories.data ?? []).filter((c) => !c.sector || c.sector === form?.sector), [categories.data, form?.sector]);

  if (product.error) return <ErrorBlock onRetry={product.reload} />;
  if (!form) return <div className="flex justify-center py-24"><Spinner /></div>;

  const isWater = form.sector === 'water';
  const validate = () => {
    const next: Record<string, string> = {};
    if (!filled(form.name)) next.name = 'الاسم مطلوب بالعربية والإنجليزية';
    if (!filled(form.shortDescription)) next.shortDescription = 'الوصف المختصر مطلوب بالعربية والإنجليزية';
    if (!filled(form.description)) next.description = 'الوصف الكامل مطلوب بالعربية والإنجليزية';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    setProblems([]);
    if (!validate()) {
      toast.error('أكمل الحقول المطلوبة');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (isNew) await adminApi.products.create(payload);
      else await adminApi.products.update(id, payload);
      toast.success(isNew ? 'تمت إضافة المنتج' : 'تم حفظ التعديلات');
      navigate(`/admin/products?sector=${form.sector}`);
    } catch (error) {
      const { message, fields } = describeError(error);
      setProblems(fields);
      toast.error(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'حذف المنتج؟', text: `سيتم حذف «${form.name.ar}» نهائياً.`, confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.products.remove(id);
      toast.success('تم حذف المنتج');
      navigate(`/admin/products?sector=${form.sector}`);
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? (isWater ? 'إضافة منتج مياه' : 'إضافة منتج') : `تعديل: ${form.name.ar || 'منتج'}`}
        description={isWater ? 'مثال: مياه القدس 2 لتر — أضف الاسم والحجم والصور وسيظهر في صفحة المياه.' : undefined}
        actions={
          !isNew && form.slug ? (
            <a href={`/ar/products/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-white">
              <ExternalLink aria-hidden className="size-4" />
              عرض في الموقع
            </a>
          ) : undefined
        }
      />

      <div className="space-y-6 pb-28">
        <ProblemList problems={problems} />

        <FormSection title="الأساسيات">
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField label="القطاع" value={form.sector} onChange={(v) => set('sector', v as ProductSectorKey)} options={sectorKeys.map((k) => ({ value: k, label: sectorLabels[k] }))} />
            <SelectField
              label="التصنيف"
              value={form.categoryId}
              onChange={(v) => {
                set('categoryId', v);
                const chosen = sectorCategories.find((c) => c.id === v);
                if (chosen && !filled(form.category)) set('category', chosen.name);
              }}
              options={[{ value: '', label: '— بدون تصنيف —' }, ...sectorCategories.map((c) => ({ value: c.id, label: c.name.ar }))]}
              help="يمكن إدارة التصنيفات من قسم «التصنيفات»."
            />
          </div>
          <LocalizedField label="اسم المنتج" required value={form.name} onChange={(v) => set('name', v)} error={errors.name} help={isWater ? 'مثال: مياه القدس 2 لتر / Al-Quds Water 2 L' : undefined} />
          <div className="grid gap-5 md:grid-cols-2">
            <LocalizedField label={isWater ? 'الحجم' : 'الحجم / النوع'} value={form.size} onChange={(v) => set('size', v)} help={isWater ? 'مثال: 2 لتر / 2 L' : undefined} />
            <LocalizedField label="شارة (اختياري)" value={form.tag} onChange={(v) => set('tag', v)} help="مثال: الأكثر مبيعاً / Best seller" />
          </div>
          <LocalizedField label="نص التصنيف الظاهر على البطاقة" value={form.category} onChange={(v) => set('category', v)} />
        </FormSection>

        <FormSection title="الوصف">
          <LocalizedField label="وصف مختصر" required multiline rows={2} value={form.shortDescription} onChange={(v) => set('shortDescription', v)} error={errors.shortDescription} />
          <LocalizedField label="الوصف الكامل" required multiline rows={5} value={form.description} onChange={(v) => set('description', v)} error={errors.description} />
        </FormSection>

        <FormSection title="الصور والفيديو" description="ارفع صوراً جديدة أو اختر من المكتبة. الصورة الرئيسية تظهر على بطاقة المنتج.">
          <div className="grid gap-6 lg:grid-cols-2">
            <ImageField label="الصورة الرئيسية" value={form.image} onChange={(v) => set('image', v)} />
            <ImageField label={isWater ? 'صورة الباك / التغليف' : 'صورة إضافية'} value={form.secondaryImage} onChange={(v) => set('secondaryImage', v)} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-800">معرض الصور</p>
            <ListEditor
              items={form.gallery}
              onChange={(v) => set('gallery', v)}
              newItem={() => ''}
              addLabel="إضافة صورة للمعرض"
              emptyText="لا توجد صور إضافية"
              compact
              renderItem={(url, update) => <ImageField label="صورة" compact value={url} onChange={update} />}
            />
          </div>
          <ImageField label="فيديو (اختياري)" kind="video" value={form.videoUrl} onChange={(v) => set('videoUrl', v)} />
        </FormSection>

        <FormSection title="المواصفات والمميزات" description="تظهر في صفحة المنتج. الصفوف غير المكتملة تُتجاهل.">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-800">المواصفات التقنية</p>
            <ListEditor
              items={form.specs}
              onChange={(v) => set('specs', v)}
              newItem={() => ({ label: emptyLoc(), value: emptyLoc() })}
              addLabel="إضافة مواصفة"
              emptyText="مثال: الوزن، المادة، الأبعاد... (لا تظهر إن تركتها فارغة)"
              renderItem={(spec, update) => (
                <div className="space-y-3">
                  <LocalizedField label="اسم المواصفة" value={spec.label} onChange={(label) => update({ ...spec, label })} />
                  <LocalizedField label="القيمة" value={spec.value} onChange={(value) => update({ ...spec, value })} />
                </div>
              )}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-800">المميزات</p>
            <ListEditor items={form.features} onChange={(v) => set('features', v)} newItem={emptyLoc} addLabel="إضافة ميزة" emptyText="لا توجد مميزات" renderItem={(f, update) => <LocalizedField label="الميزة" value={f} onChange={update} />} />
          </div>
          <TextField label="رمز المنتج (SKU)" dir="ltr" value={form.sku} onChange={(v) => set('sku', v)} className="max-w-xs" />
        </FormSection>

        {isWater && (
          <FormSection title="ملصقات هذا المنتج" description="الملصقات الفعّالة المتاحة للحجم. تُدار الملصقات من صفحة «ملصقات المياه».">
            {labels.data && labels.data.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {labels.data.map((label) => {
                  const checked = form.labelIds.includes(label.id);
                  return (
                    <li key={label.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                        <input type="checkbox" checked={checked} onChange={() => set('labelIds', checked ? form.labelIds.filter((x) => x !== label.id) : [...form.labelIds, label.id])} className="size-4 accent-primary" />
                        {label.image && <img src={label.image} alt="" className="size-10 rounded object-cover" />}
                        <span className="text-sm font-medium">{label.name.ar}{!label.active && <span className="ms-2 text-xs text-gray-400">(غير فعّال)</span>}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">لا توجد ملصقات بعد. <Link to="/admin/water-labels" className="font-semibold text-primary hover:underline">أضف ملصقاً</Link></p>
            )}
          </FormSection>
        )}

        <FormSection title="النشر">
          <div className="grid gap-5 md:grid-cols-3">
            <SelectField label="الحالة" value={form.status} onChange={(v) => set('status', v as ContentStatus)} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} help="المسودة والمخفي لا يظهران في الموقع." />
            <TextField label="ترتيب الظهور" type="number" dir="ltr" value={form.sortOrder} onChange={(v) => set('sortOrder', v)} help="الأصغر يظهر أولاً. اتركه فارغاً ليُضاف في النهاية." />
            <TextField label="الرابط المختصر (slug)" dir="ltr" value={form.slug} onChange={(v) => set('slug', v.toLowerCase())} help="يُنشأ تلقائياً من الاسم الإنجليزي إن تُرك فارغاً." />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Toggle checked={form.featured} onChange={(v) => set('featured', v)} label="منتج مميّز" help="يظهر في الصفحة الرئيسية." />
            <Toggle checked={form.isPlaceholder} onChange={(v) => set('isPlaceholder', v)} label="نموذج تجريبي" help="يُعرض بعلامة «نموذج» حتى تكتمل البيانات الحقيقية." />
          </div>
        </FormSection>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur lg:ps-64">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button type="button" size="lg" onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="size-4 text-white" /> : <Save aria-hidden className="size-4" />}
            {isNew ? 'إضافة المنتج' : 'حفظ التعديلات'}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>إلغاء</Button>
          {!isNew && (
            <button type="button" onClick={() => void remove()} className="ms-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-red-50">
              <Trash2 aria-hidden className="size-4" />
              حذف
            </button>
          )}
        </div>
      </div>
    </>
  );
}
