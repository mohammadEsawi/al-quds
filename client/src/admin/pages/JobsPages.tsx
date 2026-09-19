import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { DataTable, Pagination, type Column } from '../components/DataTable';
import { FormSection, LocalizedField, ProblemList, SelectField, TextField, Toggle, adminInput } from '../components/Fields';
import { ListEditor } from '../components/ListEditor';
import { Badge, ErrorBlock, PageHeader, Spinner, useConfirm, useToast } from '../components/ui';
import { employmentLabels, formatDate, jobStatusLabels } from '../labels';
import { emptyLoc, type EmploymentTypeKey, type JobDTO, type JobStatusKey, type Loc } from '../types';

const filled = (l: Loc) => l.ar.trim() !== '' && l.en.trim() !== '';
const tone = { open: 'green', draft: 'amber', closed: 'gray' } as const;

export function JobsListPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const query = useAsync(() => adminApi.jobs.list({ status, page, pageSize: 20 }), [status, page]);

  const remove = async (j: JobDTO) => {
    if (!(await confirm({ title: 'حذف الوظيفة؟', text: 'طلبات التقديم عليها ستبقى محفوظة كطلبات عامة.', confirmLabel: 'حذف', danger: true }))) return;
    try {
      await adminApi.jobs.remove(j.id);
      toast.success('تم حذف الوظيفة');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const columns: Column<JobDTO>[] = [
    { key: 'title', header: 'الوظيفة', cell: (j) => <Link to={`/admin/jobs/${j.id}`} className="block"><span className="block font-semibold">{j.title.ar}</span><span dir="ltr" className="block text-start text-xs text-gray-400">{j.title.en}</span></Link> },
    { key: 'department', header: 'القسم', cell: (j) => <span className="text-gray-600">{j.department.ar}</span> },
    { key: 'type', header: 'نوع الدوام', cell: (j) => employmentLabels[j.employmentType] },
    { key: 'deadline', header: 'آخر موعد', cell: (j) => (j.deadline ? formatDate(j.deadline) : '—') },
    { key: 'status', header: 'الحالة', cell: (j) => <div className="flex gap-2"><Badge tone={tone[j.status]}>{jobStatusLabels[j.status]}</Badge>{j.isPlaceholder && <Badge tone="purple">نموذج</Badge>}</div> },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-end',
      cell: (j) => (
        <div className="flex justify-end gap-0.5">
          <Link to={`/admin/jobs/${j.id}`} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></Link>
          <button type="button" onClick={() => void remove(j)} aria-label="حذف" className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-error"><Trash2 aria-hidden className="size-[18px]" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="الوظائف" description="الإعلانات الوظيفية المنشورة في صفحة «الوظائف». الوظائف ذات علامة «نموذج» تجريبية — احذفها وانشر وظائفك الحقيقية." actions={<Link to="/admin/jobs/new"><Button><Plus aria-hidden className="size-4" />نشر وظيفة</Button></Link>} />
      <div className="mb-4">
        <select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {}, { replace: true })} aria-label="الحالة" className={`${adminInput} w-40`}>
          <option value="">كل الحالات</option>
          {Object.entries(jobStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={query.data?.items} rowKey={(j) => j.id} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا توجد وظائف" />
      {query.data && <Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => setParams({ ...(status && { status }), page: String(n) }, { replace: true })} />}
    </>
  );
}

interface Form {
  slug: string;
  title: Loc;
  department: Loc;
  location: Loc;
  employmentType: EmploymentTypeKey;
  description: Loc;
  responsibilities: Loc[];
  requirements: Loc[];
  benefits: Loc[];
  deadline: string;
  status: JobStatusKey;
  isPlaceholder: boolean;
}

const blank = (): Form => ({
  slug: '',
  title: emptyLoc(),
  department: emptyLoc(),
  location: { ar: 'نابلس، فلسطين', en: 'Nablus, Palestine' },
  employmentType: 'fullTime',
  description: emptyLoc(),
  responsibilities: [],
  requirements: [],
  benefits: [],
  deadline: '',
  status: 'open',
  isPlaceholder: false,
});

export function JobEditPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(isNew ? blank() : null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const query = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.jobs.get(id)), [id]);

  useEffect(() => {
    const j = query.data;
    if (j) setForm({ slug: j.slug, title: j.title, department: j.department, location: j.location, employmentType: j.employmentType, description: j.description, responsibilities: j.responsibilities, requirements: j.requirements, benefits: j.benefits, deadline: j.deadline ?? '', status: j.status, isPlaceholder: j.isPlaceholder });
  }, [query.data]);

  if (query.error) return <ErrorBlock onRetry={query.reload} />;
  if (!form) return <div className="flex justify-center py-24"><Spinner /></div>;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!filled(form.title) || !filled(form.department) || !filled(form.location) || !filled(form.description)) {
      toast.error('أكمل الحقول المطلوبة (بالعربية والإنجليزية): العنوان، القسم، الموقع، الوصف');
      return;
    }
    const body = {
      ...(form.slug.trim() && { slug: form.slug.trim() }),
      title: form.title,
      department: form.department,
      location: form.location,
      employmentType: form.employmentType,
      description: form.description,
      responsibilities: form.responsibilities.filter(filled),
      requirements: form.requirements.filter(filled),
      benefits: form.benefits.filter(filled),
      deadline: form.deadline || null,
      status: form.status,
      isPlaceholder: form.isPlaceholder,
    };
    setSaving(true);
    setProblems([]);
    try {
      if (isNew) await adminApi.jobs.create(body);
      else await adminApi.jobs.update(id, body);
      toast.success(isNew ? 'تم نشر الوظيفة' : 'تم الحفظ');
      navigate('/admin/jobs');
    } catch (error) {
      const d = describeError(error);
      setProblems(d.fields);
      toast.error(d.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'نشر وظيفة جديدة' : `تعديل: ${form.title.ar}`}
        actions={!isNew && form.slug ? <a href={`/ar/careers/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-white"><ExternalLink aria-hidden className="size-4" />عرض في الموقع</a> : undefined}
      />
      <div className="space-y-6 pb-28">
        <ProblemList problems={problems} />
        <FormSection title="تفاصيل الوظيفة">
          <LocalizedField label="المسمى الوظيفي" required value={form.title} onChange={(v) => set('title', v)} />
          <div className="grid gap-5 md:grid-cols-2">
            <LocalizedField label="القسم" required value={form.department} onChange={(v) => set('department', v)} className="md:col-span-2" />
            <LocalizedField label="مكان العمل" required value={form.location} onChange={(v) => set('location', v)} className="md:col-span-2" />
          </div>
          <LocalizedField label="وصف الوظيفة" required multiline rows={4} value={form.description} onChange={(v) => set('description', v)} />
        </FormSection>
        <FormSection title="المسؤوليات والمتطلبات والمزايا">
          {([['responsibilities', 'المسؤوليات'], ['requirements', 'المتطلبات'], ['benefits', 'المزايا']] as const).map(([key, label]) => (
            <div key={key}>
              <p className="mb-2 text-sm font-medium">{label}</p>
              <ListEditor items={form[key]} onChange={(v) => set(key, v)} newItem={emptyLoc} addLabel={`إضافة بند`} renderItem={(item, update) => <LocalizedField label={label} value={item} onChange={update} />} />
            </div>
          ))}
        </FormSection>
        <FormSection title="النشر">
          <div className="grid gap-5 md:grid-cols-3">
            <SelectField label="نوع الدوام" value={form.employmentType} onChange={(v) => set('employmentType', v as EmploymentTypeKey)} options={Object.entries(employmentLabels).map(([value, label]) => ({ value, label }))} />
            <TextField label="آخر موعد للتقديم" type="date" dir="ltr" value={form.deadline} onChange={(v) => set('deadline', v)} help="بعد هذا التاريخ تختفي الوظيفة من الموقع." />
            <SelectField label="الحالة" value={form.status} onChange={(v) => set('status', v as JobStatusKey)} options={Object.entries(jobStatusLabels).map(([value, label]) => ({ value, label }))} />
          </div>
          <TextField label="الرابط المختصر (slug)" dir="ltr" value={form.slug} onChange={(v) => set('slug', v.toLowerCase())} help="يُنشأ تلقائياً إن تُرك فارغاً." className="max-w-sm" />
          <Toggle checked={form.isPlaceholder} onChange={(v) => set('isPlaceholder', v)} label="نموذج تجريبي" help="يظهر بعلامة «نموذج» في الموقع." />
        </FormSection>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur lg:ps-64">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button size="lg" onClick={() => void save()} disabled={saving}><Save aria-hidden className="size-4" />{isNew ? 'نشر الوظيفة' : 'حفظ التعديلات'}</Button>
          <Button variant="ghost" size="lg" onClick={() => navigate('/admin/jobs')}>إلغاء</Button>
        </div>
      </div>
    </>
  );
}
