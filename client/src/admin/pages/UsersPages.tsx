import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { useAuth } from '../auth';
import { DataTable, type Column } from '../components/DataTable';
import { ProblemList, SelectField, TextField, Toggle } from '../components/Fields';
import { Badge, Card, Modal, PageHeader, useConfirm, useToast } from '../components/ui';
import { formatDate, roleLabels } from '../labels';
import type { AdminUser, Role } from '../types';

interface UserForm {
  email: string;
  name: string;
  role: Role;
  password: string;
  isActive: boolean;
}

export function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const query = useAsync(() => adminApi.users.list());
  const [editing, setEditing] = useState<{ id: string | null; form: UserForm } | null>(null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    if (form.name.trim().length < 2) return toast.error('الاسم مطلوب');
    if (!id && (!form.email.trim() || form.password.length < 12)) return toast.error('البريد مطلوب وكلمة السر 12 حرفاً على الأقل');
    if (id && form.password && form.password.length < 12) return toast.error('كلمة السر 12 حرفاً على الأقل');
    setSaving(true);
    setProblems([]);
    try {
      if (id) await adminApi.users.update(id, { name: form.name.trim(), role: form.role, isActive: form.isActive, ...(form.password && { password: form.password }) });
      else await adminApi.users.create({ email: form.email.trim(), name: form.name.trim(), role: form.role, password: form.password });
      toast.success(id ? 'تم حفظ المستخدم' : 'تمت إضافة المستخدم');
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

  const remove = async (u: AdminUser) => {
    if (!(await confirm({ title: 'حذف المستخدم؟', text: `لن يتمكن ${u.name} من الدخول بعد الآن.`, confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.users.remove(u.id);
      toast.success('تم حذف المستخدم');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const columns: Column<AdminUser>[] = [
    { key: 'name', header: 'المستخدم', cell: (u) => <div><p className="font-semibold">{u.name}{u.id === me?.id && <span className="ms-2 text-xs text-gray-400">(أنت)</span>}</p><p dir="ltr" className="text-start text-xs text-gray-400">{u.email}</p></div> },
    { key: 'role', header: 'الصلاحية', cell: (u) => <Badge tone={u.role === 'SUPER_ADMIN' ? 'purple' : u.role === 'ADMIN' ? 'blue' : 'gray'}>{roleLabels[u.role]}</Badge> },
    { key: 'status', header: 'الحالة', cell: (u) => <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'فعّال' : 'معطّل'}</Badge> },
    { key: 'login', header: 'آخر دخول', cell: (u) => <span className="text-gray-500">{formatDate(u.lastLoginAt, true)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-end',
      cell: (u) => (
        <div className="flex justify-end gap-0.5">
          <button type="button" onClick={() => { setProblems([]); setEditing({ id: u.id, form: { email: u.email, name: u.name, role: u.role, password: '', isActive: u.isActive ?? true } }); }} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></button>
          {u.id !== me?.id && <button type="button" onClick={() => void remove(u)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="المستخدمون" description="من يستطيع الدخول للوحة التحكم. المحرر يدير المحتوى فقط، والمدير يرى الطلبات والرسائل والإعدادات، والمدير العام يدير المستخدمين." actions={<Button onClick={() => { setProblems([]); setEditing({ id: null, form: { email: '', name: '', role: 'EDITOR', password: '', isActive: true } }); }}><Plus aria-hidden className="size-4" />إضافة مستخدم</Button>} />
      <DataTable columns={columns} rows={query.data} rowKey={(u) => u.id} loading={query.loading} error={query.error} onRetry={query.reload} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'تعديل المستخدم' : 'إضافة مستخدم'} size="sm" footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button></>}>
        {editing && (
          <div className="space-y-4">
            <ProblemList problems={problems} />
            <TextField label="الاسم" required value={editing.form.name} onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })} />
            <TextField label="البريد الإلكتروني" required type="email" dir="ltr" disabled={!!editing.id} value={editing.form.email} onChange={(email) => setEditing({ ...editing, form: { ...editing.form, email } })} />
            <SelectField label="الصلاحية" value={editing.form.role} onChange={(role) => setEditing({ ...editing, form: { ...editing.form, role: role as Role } })} options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))} />
            <TextField label={editing.id ? 'كلمة سر جديدة (اتركها فارغة بدون تغيير)' : 'كلمة السر'} required={!editing.id} type="password" dir="ltr" autoComplete="new-password" value={editing.form.password} onChange={(password) => setEditing({ ...editing, form: { ...editing.form, password } })} help="12 حرفاً على الأقل." />
            {editing.id && <Toggle checked={editing.form.isActive} onChange={(isActive) => setEditing({ ...editing, form: { ...editing.form, isActive } })} label="الحساب فعّال" help="المعطّل يفقد الدخول فوراً." />}
          </div>
        )}
      </Modal>
    </>
  );
}

export function AccountPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 12) return toast.error('كلمة السر الجديدة 12 حرفاً على الأقل');
    if (next !== confirmValue) return toast.error('تأكيد كلمة السر غير مطابق');
    setSaving(true);
    try {
      await adminApi.auth.changePassword(current, next);
      toast.success('تم تغيير كلمة السر');
      setCurrent('');
      setNext('');
      setConfirmValue('');
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="حسابي" />
      <div className="grid max-w-3xl gap-6">
        <Card className="p-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-gray-400">الاسم</dt><dd className="mt-0.5 font-semibold">{user?.name}</dd></div>
            <div><dt className="text-xs text-gray-400">البريد</dt><dd dir="ltr" className="mt-0.5 text-start font-semibold">{user?.email}</dd></div>
            <div><dt className="text-xs text-gray-400">الصلاحية</dt><dd className="mt-0.5">{user && <Badge tone="blue">{roleLabels[user.role]}</Badge>}</dd></div>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-bold">تغيير كلمة السر</h2>
          <form onSubmit={submit} className="max-w-sm space-y-4">
            <TextField label="كلمة السر الحالية" type="password" dir="ltr" autoComplete="current-password" value={current} onChange={setCurrent} required />
            <TextField label="كلمة السر الجديدة" type="password" dir="ltr" autoComplete="new-password" value={next} onChange={setNext} required help="12 حرفاً على الأقل." />
            <TextField label="تأكيد كلمة السر الجديدة" type="password" dir="ltr" autoComplete="new-password" value={confirmValue} onChange={setConfirmValue} required />
            <Button type="submit" disabled={saving || !current || !next}>{saving ? 'جارٍ الحفظ...' : 'تغيير كلمة السر'}</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
