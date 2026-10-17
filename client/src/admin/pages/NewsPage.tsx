import { useState } from 'react';
import { ArrowDown, ArrowUp, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { LocalizedField, ProblemList, TextField, Toggle } from '../components/Fields';
import { ImageField } from '../components/MediaPicker';
import { Badge, Card, EmptyBlock, ErrorBlock, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { formatDate } from '../labels';
import { emptyLoc, type Loc, type NewsItemDTO } from '../types';

interface Form {
  title: Loc;
  text: Loc;
  image: string;
  link: string;
  published: boolean;
}

const blank = (): Form => ({ title: emptyLoc(), text: emptyLoc(), image: '', link: '', published: true });

const toForm = (n: NewsItemDTO): Form => ({
  title: n.title,
  text: n.text,
  image: n.image ?? '',
  link: n.link ?? '',
  published: n.published,
});

/** Short homepage updates — a title, a short text, an optional photo and an optional link. */
export default function NewsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const query = useAsync(() => adminApi.news.list());
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setProblems([]);
    setEditing({ id: null, form: blank() });
  };

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    if (!form.title.ar.trim() || !form.title.en.trim()) return toast.error('العنوان مطلوب بالعربية والإنجليزية');
    if (!form.text.ar.trim() || !form.text.en.trim()) return toast.error('النص مطلوب بالعربية والإنجليزية');
    const body = { ...form, image: form.image || null, link: form.link || null };
    setSaving(true);
    setProblems([]);
    try {
      if (id) await adminApi.news.update(id, body);
      else await adminApi.news.create(body);
      toast.success('تم الحفظ');
      setEditing(null);
      query.reload();
    } catch (error) {
      const d = describeError(error);
      setProblems(d.fields);
      toast.error(d.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n: NewsItemDTO) => {
    if (!(await confirm({ title: 'حذف هذا الخبر؟', text: 'سيختفي من الصفحة الرئيسية.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.news.remove(n.id);
      toast.success('تم الحذف');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const move = async (list: NewsItemDTO[], index: number, by: -1 | 1) => {
    const next = list.slice();
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + by, 0, moved);
    try {
      await adminApi.news.reorder(next.map((n, position) => ({ id: n.id, sortOrder: position })));
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  if (query.error) return <Card><ErrorBlock onRetry={query.reload} /></Card>;

  const list = query.data ?? [];

  return (
    <>
      <PageHeader
        title="آخر الأخبار"
        description="تظهر في الصفحة الرئيسية — عنوان ونص قصير وصورة اختيارية لكل خبر."
        actions={<Button onClick={openNew}><Plus aria-hidden className="size-4" />إضافة خبر</Button>}
      />

      {!query.data ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <Card className="overflow-hidden">
          {list.length === 0 ? (
            <EmptyBlock title="لا يوجد أخبار بعد" />
          ) : (
            <ul className="divide-y divide-gray-50">
              {list.map((n, index) => (
                <li key={n.id} className="flex items-center gap-4 p-4">
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                    {n.image ? <img src={n.image} alt="" className="size-full object-cover" /> : <Newspaper aria-hidden className="size-6 text-gray-300" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{n.title.ar || <span className="font-normal text-gray-400">(بدون عنوان بعد)</span>}</p>
                    <p className="truncate text-sm text-gray-500">{n.text.ar}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-400">{formatDate(n.publishedAt)}</span>
                      {!n.published && <Badge tone="gray">مخفي</Badge>}
                      {!n.image && <Badge tone="red">بدون صورة</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button type="button" onClick={() => void move(list, index, -1)} disabled={index === 0} aria-label="نقل للأعلى" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowUp aria-hidden className="size-[18px]" /></button>
                    <button type="button" onClick={() => void move(list, index, 1)} disabled={index === list.length - 1} aria-label="نقل للأسفل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowDown aria-hidden className="size-[18px]" /></button>
                    <button type="button" onClick={() => { setProblems([]); setEditing({ id: n.id, form: toForm(n) }); }} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></button>
                    <button type="button" onClick={() => void remove(n)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'تعديل الخبر' : 'إضافة خبر'}
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></>}
      >
        {editing && (
          <div className="space-y-6">
            <ProblemList problems={problems} />
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <ImageField label="الصورة" value={editing.form.image} onChange={(image) => setEditing({ ...editing, form: { ...editing.form, image } })} help="صورة أفقية واضحة (اختيارية)." />
              <div className="space-y-4">
                <LocalizedField label="العنوان" required value={editing.form.title} onChange={(title) => setEditing({ ...editing, form: { ...editing.form, title } })} />
                <TextField label="رابط (اختياري)" type="url" value={editing.form.link} onChange={(link) => setEditing({ ...editing, form: { ...editing.form, link } })} placeholder="https://..." dir="ltr" help="إذا تُرك فارغاً، الخبر يظهر كنص بدون رابط." />
              </div>
            </div>

            <LocalizedField label="النص" required multiline rows={4} value={editing.form.text} onChange={(text) => setEditing({ ...editing, form: { ...editing.form, text } })} help="نص قصير وواضح — هذا ما يظهر تحت العنوان في الصفحة الرئيسية." />

            <Toggle checked={editing.form.published} onChange={(published) => setEditing({ ...editing, form: { ...editing.form, published } })} label="ظاهر في الموقع" />
          </div>
        )}
      </Modal>
    </>
  );
}
