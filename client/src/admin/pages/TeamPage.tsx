import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { FormSection, LocalizedField, ProblemList, SelectField, Toggle } from '../components/Fields';
import { ListEditor } from '../components/ListEditor';
import { ImageField } from '../components/MediaPicker';
import { Badge, Card, EmptyBlock, ErrorBlock, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { emptyLoc, type Loc, type TeamMemberDTO } from '../types';

type Group = TeamMemberDTO['group'];

const GROUPS: { key: Group; title: string; hint: string }[] = [
  { key: 'board', title: 'مجلس الإدارة', hint: 'رئيس مجلس الإدارة وأعضاء المجلس' },
  { key: 'executive', title: 'الإدارة التنفيذية', hint: 'المدير العام ومديرو الأقسام' },
];

const ROLES = [
  { value: 'member', label: 'عضو / مدير' },
  { value: 'chairman', label: 'رئيس مجلس الإدارة (رسالته في الصفحة الرئيسية)' },
  { value: 'general_manager', label: 'المدير العام (رسالته في الصفحة الرئيسية)' },
];

interface Form {
  group: Group;
  role: TeamMemberDTO['role'];
  name: Loc;
  title: Loc;
  department: Loc;
  bio: Loc[];
  message: Loc;
  photo: string;
  published: boolean;
  isPlaceholder: boolean;
}

const blank = (group: Group): Form => ({ group, role: 'member', name: emptyLoc(), title: emptyLoc(), department: emptyLoc(), bio: [], message: emptyLoc(), photo: '', published: true, isPlaceholder: false });

const toForm = (m: TeamMemberDTO): Form => ({
  group: m.group,
  role: m.role,
  name: m.name,
  title: m.title,
  department: m.department ?? emptyLoc(),
  bio: m.bio,
  message: m.message ?? emptyLoc(),
  photo: m.photo ?? '',
  published: m.published,
  isPlaceholder: m.isPlaceholder,
});

/** Board of directors and executive management: names, titles, experience, messages — and the photos. */
export default function TeamPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const query = useAsync(() => adminApi.team.list());
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const openNew = (group: Group) => {
    setProblems([]);
    setEditing({ id: null, form: blank(group) });
  };

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    if (!form.title.ar.trim() || !form.title.en.trim()) return toast.error('المنصب مطلوب بالعربية والإنجليزية');
    const body = { ...form, photo: form.photo || null, bio: form.bio.filter((p) => p.ar.trim() && p.en.trim()) };
    setSaving(true);
    setProblems([]);
    try {
      if (id) await adminApi.team.update(id, body);
      else await adminApi.team.create(body);
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

  const remove = async (m: TeamMemberDTO) => {
    if (!(await confirm({ title: 'حذف هذا الشخص؟', text: 'سيختفي من الموقع.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.team.remove(m.id);
      toast.success('تم الحذف');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const move = async (list: TeamMemberDTO[], index: number, by: -1 | 1) => {
    const next = list.slice();
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + by, 0, moved);
    try {
      // Every person of the group gets a fresh position, so order stays right even after deletions.
      await adminApi.team.reorder(next.map((m, position) => ({ id: m.id, sortOrder: position })));
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  if (query.error) return <Card><ErrorBlock onRetry={query.reload} /></Card>;

  return (
    <>
      <PageHeader title="الإدارة" description="أضف صورة لكل شخص، وعدّل الاسم والمنصب والخبرات. كلمة رئيس المجلس والمدير العام تظهر مقتطفاً في الصفحة الرئيسية وكاملة في صفحة خاصة." />

      {!query.data ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((g) => {
            const list = query.data!.filter((m) => m.group === g.key);
            return (
              <section key={g.key}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">{g.title}</h2>
                    <p className="text-sm text-gray-500">{g.hint}</p>
                  </div>
                  <Button variant="secondary" onClick={() => openNew(g.key)}><Plus aria-hidden className="size-4" />إضافة</Button>
                </div>
                <Card className="overflow-hidden">
                  {list.length === 0 ? (
                    <EmptyBlock title="لا يوجد أحد بعد" />
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {list.map((m, index) => (
                        <li key={m.id} className="flex items-center gap-4 p-4">
                          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                            {m.photo ? <img src={m.photo} alt="" className="size-full object-cover" /> : <UserRound aria-hidden className="size-7 text-gray-300" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{m.name.ar || <span className="font-normal text-gray-400">(بدون اسم بعد)</span>}</p>
                            <p className="truncate text-sm text-gray-500">{m.title.ar}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {!m.published && <Badge tone="gray">مخفي</Badge>}
                              {m.isPlaceholder && <Badge tone="blue">نص مؤقت</Badge>}
                              {!m.photo && <Badge tone="red">بدون صورة</Badge>}
                              {m.role !== 'member' && !(m.message?.ar && m.message.en) && <Badge tone="red">بدون كلمة</Badge>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button type="button" onClick={() => void move(list, index, -1)} disabled={index === 0} aria-label="نقل للأعلى" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowUp aria-hidden className="size-[18px]" /></button>
                            <button type="button" onClick={() => void move(list, index, 1)} disabled={index === list.length - 1} aria-label="نقل للأسفل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowDown aria-hidden className="size-[18px]" /></button>
                            <button type="button" onClick={() => { setProblems([]); setEditing({ id: m.id, form: toForm(m) }); }} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></button>
                            <button type="button" onClick={() => void remove(m)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'تعديل' : 'إضافة'}
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></>}
      >
        {editing && (
          <div className="space-y-6">
            <ProblemList problems={problems} />
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <ImageField label="الصورة" value={editing.form.photo} onChange={(photo) => setEditing({ ...editing, form: { ...editing.form, photo } })} help="صورة عمودية بوجه واضح (نسبة 4:5 مناسبة)." />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="المجموعة" value={editing.form.group} onChange={(group) => setEditing({ ...editing, form: { ...editing.form, group: group as Group } })} options={GROUPS.map((g) => ({ value: g.key, label: g.title }))} />
                  <SelectField label="الدور" value={editing.form.role} onChange={(role) => setEditing({ ...editing, form: { ...editing.form, role: role as Form['role'] } })} options={ROLES} />
                </div>
                <LocalizedField label="الاسم" value={editing.form.name} onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })} help="اتركه فارغاً إن لم يُحدد الاسم بعد." />
                <LocalizedField label="المنصب" required value={editing.form.title} onChange={(title) => setEditing({ ...editing, form: { ...editing.form, title } })} />
                <LocalizedField label="السطر تحت الاسم (اختياري)" value={editing.form.department} onChange={(department) => setEditing({ ...editing, form: { ...editing.form, department } })} help="مثل: الإدارة العامة" />
              </div>
            </div>

            <FormSection title="الخبرات والمؤهلات" description="فقرة لكل بند. تظهر بجانب الصورة.">
              <ListEditor items={editing.form.bio} onChange={(bio) => setEditing({ ...editing, form: { ...editing.form, bio } })} newItem={emptyLoc} addLabel="إضافة فقرة" renderItem={(p, update) => <LocalizedField label="الفقرة" multiline rows={4} value={p} onChange={update} />} />
            </FormSection>

            <LocalizedField label="الكلمة" multiline rows={8} value={editing.form.message} onChange={(message) => setEditing({ ...editing, form: { ...editing.form, message } })} help="لرئيس المجلس والمدير العام: يظهر مقتطف من أول فقرة في الصفحة الرئيسية، وتُفتح الكلمة كاملة في صفحة خاصة. افصل بين الفقرات بسطر فارغ." />

            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle checked={editing.form.published} onChange={(published) => setEditing({ ...editing, form: { ...editing.form, published } })} label="ظاهر في الموقع" />
              <Toggle checked={editing.form.isPlaceholder} onChange={(isPlaceholder) => setEditing({ ...editing, form: { ...editing.form, isPlaceholder } })} label="نص مؤقت" help="يعدّه قائمة «جاهزية الموقع» ما زال ناقصاً." />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
