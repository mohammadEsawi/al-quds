import { useEffect, useState } from 'react';
import { Pencil, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { DataTable, type Column } from '../components/DataTable';
import { FormSection, LocalizedField, ProblemList, SelectField, TextAreaField, TextField, Toggle } from '../components/Fields';
import { ListEditor } from '../components/ListEditor';
import { ImageField } from '../components/MediaPicker';
import { Badge, Card, ErrorBlock, Modal, PageHeader, Spinner, useToast } from '../components/ui';
import { channelLabels, formatDate } from '../labels';
import { emptyLoc, WHATSAPP_CHANNELS, type CompanyDTO, type HomeContentDTO, type Loc, type SettingDTO, type WhatsAppChannelDTO } from '../types';

const filled = (l: Loc) => l.ar.trim() !== '' && l.en.trim() !== '';
const iconOptions = [
  { value: 'shield', label: 'درع' },
  { value: 'check', label: 'علامة صح' },
  { value: 'moon', label: 'ورقة (استدامة)' },
  { value: 'users', label: 'أشخاص' },
  { value: 'bolt', label: 'برق (ابتكار)' },
  { value: 'globe', label: 'كرة أرضية' },
];
const statKeys = [
  { value: 'years', label: 'سنوات الخبرة' },
  { value: 'cities', label: 'المدن' },
  { value: 'bottles', label: 'العبوات سنوياً' },
  { value: 'team', label: 'أعضاء الفريق' },
];

function SaveBar({ onSave, saving, label = 'حفظ التعديلات' }: { onSave: () => void; saving: boolean; label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur lg:ps-64">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6">
        <Button size="lg" onClick={onSave} disabled={saving}>{saving ? <Spinner className="size-4 text-white" /> : <Save aria-hidden className="size-4" />}{label}</Button>
      </div>
    </div>
  );
}

// ───────────────────────── Company ─────────────────────────

interface CompanyForm extends Omit<CompanyDTO, 'social' | 'founded'> {
  founded: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  logoDark: string;
  logoMobile: string;
  favicon: string;
}

export function CompanyPage() {
  const toast = useToast();
  const query = useAsync(() => adminApi.company.get());
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [problems, setProblems] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = query.data;
    if (c) setForm({ ...c, founded: String(c.founded), facebook: c.social.facebook ?? '', instagram: c.social.instagram ?? '', linkedin: c.social.linkedin ?? '', logoDark: c.logoDark ?? '', logoMobile: c.logoMobile ?? '', favicon: c.favicon ?? '' });
  }, [query.data]);

  if (query.error) return <ErrorBlock onRetry={query.reload} />;
  if (!form) return <div className="flex justify-center py-24"><Spinner /></div>;
  const set = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    setProblems([]);
    try {
      await adminApi.company.update({
        name: form.name,
        legalName: form.legalName,
        founded: Number(form.founded),
        address: form.address,
        phone: form.phone.trim(),
        phoneDisplay: form.phoneDisplay.trim(),
        email: form.email.trim(),
        hours: form.hours,
        logo: form.logo.trim() || null,
        logoDark: form.logoDark.trim() || null,
        logoMobile: form.logoMobile.trim() || null,
        favicon: form.favicon.trim() || null,
        mapEmbedUrl: form.mapEmbedUrl.trim() || null,
        social: { facebook: form.facebook.trim() || null, instagram: form.instagram.trim() || null, linkedin: form.linkedin.trim() || null },
        about: form.about.filter(filled),
        mission: form.mission,
        vision: form.vision,
        values: form.values.filter((v) => filled(v.title) && filled(v.text)),
        milestones: form.milestones.filter((m) => m.year.trim() && filled(m.title) && filled(m.text)),
        standards: form.standards.filter((v) => filled(v.title) && filled(v.text)),
        stats: form.stats.map((s) => ({ ...s, value: Number(s.value) || 0 })),
        cities: form.cities.filter(filled),
      });
      toast.success('تم حفظ معلومات الشركة');
      query.reload();
    } catch (error) {
      const d = describeError(error);
      setProblems(d.fields);
      toast.error(d.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="معلومات الشركة" description="بيانات الشركة التي تظهر في الموقع: الشعار، الاتصال، من نحن، الأرقام والمدن." />
      <div className="space-y-6 pb-28">
        <ProblemList problems={problems} />

        <FormSection title="الهوية والشعارات">
          <LocalizedField label="اسم الشركة" required value={form.name} onChange={(v) => set('name', v)} />
          <LocalizedField label="الاسم القانوني" required value={form.legalName} onChange={(v) => set('legalName', v)} />
          <TextField label="سنة التأسيس" type="number" dir="ltr" value={form.founded} onChange={(v) => set('founded', v)} className="max-w-40" />
          <div className="grid gap-6 lg:grid-cols-2">
            <ImageField label="الشعار (للخلفيات الفاتحة)" value={form.logo} onChange={(v) => set('logo', v)} help="يظهر في الهيدر والفوتر." />
            <ImageField label="الشعار (للخلفيات الداكنة)" value={form.logoDark} onChange={(v) => set('logoDark', v)} />
            <ImageField label="شعار الجوال" value={form.logoMobile} onChange={(v) => set('logoMobile', v)} />
            <ImageField label="أيقونة الموقع (Favicon)" value={form.favicon} onChange={(v) => set('favicon', v)} />
          </div>
        </FormSection>

        <FormSection title="معلومات الاتصال">
          <div className="grid gap-5 md:grid-cols-3">
            <TextField label="الهاتف (للاتصال)" required dir="ltr" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+970597959536" />
            <TextField label="الهاتف (للعرض)" required dir="ltr" value={form.phoneDisplay} onChange={(v) => set('phoneDisplay', v)} placeholder="+970 5 9795 9536" />
            <TextField label="البريد الإلكتروني" required type="email" dir="ltr" value={form.email} onChange={(v) => set('email', v)} />
          </div>
          <LocalizedField label="العنوان" required value={form.address} onChange={(v) => set('address', v)} />
          <LocalizedField label="ساعات العمل" required value={form.hours} onChange={(v) => set('hours', v)} />
          <TextField label="رابط خريطة Google (Embed)" dir="ltr" value={form.mapEmbedUrl} onChange={(v) => set('mapEmbedUrl', v)} help="من Google Maps ← مشاركة ← تضمين خريطة، انسخ قيمة src." />
          <div className="grid gap-5 md:grid-cols-3">
            <TextField label="فيسبوك" dir="ltr" value={form.facebook} onChange={(v) => set('facebook', v)} placeholder="https://facebook.com/..." help="اتركه فارغاً لإخفاء الأيقونة." />
            <TextField label="إنستغرام" dir="ltr" value={form.instagram} onChange={(v) => set('instagram', v)} placeholder="https://instagram.com/..." />
            <TextField label="لينكدإن" dir="ltr" value={form.linkedin} onChange={(v) => set('linkedin', v)} placeholder="https://linkedin.com/company/..." />
          </div>
        </FormSection>

        <FormSection title="من نحن">
          <div>
            <p className="mb-2 text-sm font-medium">قصة الشركة (فقرات)</p>
            <ListEditor items={form.about} onChange={(v) => set('about', v)} newItem={emptyLoc} addLabel="إضافة فقرة" renderItem={(p, update) => <LocalizedField label="الفقرة" multiline rows={3} value={p} onChange={update} />} />
          </div>
          <LocalizedField label="الرسالة" required multiline rows={3} value={form.mission} onChange={(v) => set('mission', v)} />
          <LocalizedField label="الرؤية" required multiline rows={3} value={form.vision} onChange={(v) => set('vision', v)} />
        </FormSection>

        <FormSection title="القيم والمحطات والمعايير">
          <div>
            <p className="mb-2 text-sm font-medium">القيم الأساسية</p>
            <ListEditor items={form.values} onChange={(v) => set('values', v)} newItem={() => ({ icon: 'shield', title: emptyLoc(), text: emptyLoc() })} addLabel="إضافة قيمة" renderItem={(item, update) => (
              <div className="space-y-3"><SelectField label="الأيقونة" value={item.icon} onChange={(icon) => update({ ...item, icon })} options={iconOptions} className="max-w-52" /><LocalizedField label="العنوان" value={item.title} onChange={(title) => update({ ...item, title })} /><LocalizedField label="الوصف" value={item.text} onChange={(text) => update({ ...item, text })} /></div>
            )} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">المحطات البارزة</p>
            <ListEditor items={form.milestones} onChange={(v) => set('milestones', v)} newItem={() => ({ year: '', title: emptyLoc(), text: emptyLoc() })} addLabel="إضافة محطة" renderItem={(item, update) => (
              <div className="space-y-3"><TextField label="السنة" dir="ltr" value={item.year} onChange={(year) => update({ ...item, year })} className="max-w-32" /><LocalizedField label="العنوان" value={item.title} onChange={(title) => update({ ...item, title })} /><LocalizedField label="الوصف" value={item.text} onChange={(text) => update({ ...item, text })} /></div>
            )} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">معايير الجودة والشهادات</p>
            <p className="mb-2 text-xs text-gray-400">أضف فقط الشهادات المؤكدة والمعتمدة فعلاً.</p>
            <ListEditor items={form.standards} onChange={(v) => set('standards', v)} newItem={() => ({ icon: 'check', title: emptyLoc(), text: emptyLoc() })} addLabel="إضافة معيار" renderItem={(item, update) => (
              <div className="space-y-3"><SelectField label="الأيقونة" value={item.icon} onChange={(icon) => update({ ...item, icon })} options={iconOptions} className="max-w-52" /><LocalizedField label="العنوان" value={item.title} onChange={(title) => update({ ...item, title })} /><LocalizedField label="الوصف" value={item.text} onChange={(text) => update({ ...item, text })} /></div>
            )} />
          </div>
        </FormSection>

        <FormSection title="الأرقام والمدن" description="الأرقام تظهر في الصفحة الرئيسية. تأكد من دقتها قبل النشر.">
          <ListEditor items={form.stats} max={4} onChange={(v) => set('stats', v)} newItem={() => ({ key: 'years' as const, value: 0, suffix: '' })} addLabel="إضافة رقم" compact renderItem={(item, update) => (
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="النوع" value={item.key} onChange={(key) => update({ ...item, key: key as typeof item.key })} options={statKeys} />
              <TextField label="القيمة" type="number" dir="ltr" value={String(item.value)} onChange={(v) => update({ ...item, value: Number(v) })} />
              <TextField label="لاحقة (مثل + أو M+)" dir="ltr" value={item.suffix} maxLength={6} onChange={(suffix) => update({ ...item, suffix })} />
            </div>
          )} />
          <div>
            <p className="mb-2 text-sm font-medium">المدن التي نغطيها</p>
            <ListEditor items={form.cities} max={150} onChange={(v) => set('cities', v)} newItem={emptyLoc} addLabel="إضافة مدينة" compact renderItem={(c, update) => <LocalizedField label="المدينة" value={c} onChange={update} />} />
          </div>
        </FormSection>
      </div>
      <SaveBar onSave={() => void save()} saving={saving} />
    </>
  );
}

// ───────────────────────── WhatsApp ─────────────────────────

export function WhatsAppPage() {
  const toast = useToast();
  const query = useAsync(() => adminApi.whatsapp.list());
  const [rows, setRows] = useState<WhatsAppChannelDTO[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    // Show every channel, including ones that have no row yet.
    setRows(WHATSAPP_CHANNELS.map((channel) => query.data!.find((r) => r.channel === channel) ?? { channel, number: query.data!.find((r) => r.channel === 'GENERAL')?.number ?? '', message: emptyLoc(), isActive: false }));
  }, [query.data]);

  if (query.error) return <ErrorBlock onRetry={query.reload} />;
  if (!rows) return <div className="flex justify-center py-24"><Spinner /></div>;
  const update = (channel: string, patch: Partial<WhatsAppChannelDTO>) => setRows((list) => list?.map((r) => (r.channel === channel ? { ...r, ...patch } : r)) ?? null);

  const save = async () => {
    const active = rows.filter((r) => r.isActive || r.number.trim() || filled(r.message));
    const bad = active.find((r) => !/^\d{7,15}$/.test(r.number.trim()) || !filled(r.message));
    if (bad) return toast.error(`قناة «${channelLabels[bad.channel]}»: الرقم أرقام فقط مع رمز الدولة، والرسالة مطلوبة بالعربية والإنجليزية`);
    setSaving(true);
    try {
      await adminApi.whatsapp.save(active.map((r) => ({ ...r, number: r.number.trim() })));
      toast.success('تم حفظ إعدادات واتساب');
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="واتساب" description="لكل قطاع رقمه ورسالته الافتراضية. زر واتساب العائم يستعمل القناة «عام»، وكل صفحة قطاع تستعمل قناتها." />
      <div className="space-y-4 pb-28">
        {rows.map((r) => (
          <Card key={r.channel} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{channelLabels[r.channel]}</h2>
              <Toggle checked={r.isActive} onChange={(isActive) => update(r.channel, { isActive })} label="فعّالة" />
            </div>
            <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
              <TextField label="الرقم (مع رمز الدولة)" dir="ltr" value={r.number} onChange={(number) => update(r.channel, { number })} placeholder="9720597959536" />
              <LocalizedField label="الرسالة الافتراضية" value={r.message} onChange={(message) => update(r.channel, { message })} />
            </div>
          </Card>
        ))}
      </div>
      <SaveBar onSave={() => void save()} saving={saving} />
    </>
  );
}

// ───────────────────────── Homepage content ─────────────────────────

const HOME_FIELDS = [
  { key: 'overline', label: 'الشارة الصغيرة فوق العنوان (مثل: منذ عام 2005)' },
  { key: 'title', label: 'عنوان الهيرو الرئيسي' },
  { key: 'subtitle', label: 'العنوان الفرعي' },
  { key: 'ctaSectors', label: 'نص الزر الأول' },
  { key: 'ctaContact', label: 'نص الزر الثاني' },
] as const;

export function HomeContentPage() {
  const toast = useToast();
  const query = useAsync(() => adminApi.settings.list());
  const [hero, setHero] = useState<Record<string, Loc> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    const stored = (query.data.find((s) => s.key === 'home.content')?.value ?? {}) as HomeContentDTO;
    setHero(Object.fromEntries(HOME_FIELDS.map((f) => [f.key, stored.hero?.[f.key] ?? emptyLoc()])));
  }, [query.data]);

  if (query.error) return <ErrorBlock onRetry={query.reload} />;
  if (!hero) return <div className="flex justify-center py-24"><Spinner /></div>;

  const save = async () => {
    const value: HomeContentDTO = { hero: Object.fromEntries(HOME_FIELDS.filter((f) => filled(hero[f.key]!)).map((f) => [f.key, hero[f.key]!])) };
    setSaving(true);
    try {
      await adminApi.settings.save('home.content', value);
      toast.success('تم حفظ محتوى الصفحة الرئيسية');
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="الصفحة الرئيسية" description="غيّر نصوص مقدمة الموقع. الحقل الذي تتركه فارغاً (بإحدى اللغتين) يستعمل النص الافتراضي." />
      <div className="space-y-6 pb-28">
        <FormSection title="نصوص الهيرو">
          {HOME_FIELDS.map((f) => (
            <LocalizedField key={f.key} label={f.label} value={hero[f.key]!} onChange={(v) => setHero((h) => ({ ...h!, [f.key]: v }))} />
          ))}
        </FormSection>
      </div>
      <SaveBar onSave={() => void save()} saving={saving} />
    </>
  );
}

// ───────────────────────── Advanced settings ─────────────────────────

export function SettingsPage() {
  const toast = useToast();
  const query = useAsync(() => adminApi.settings.list());
  const [editing, setEditing] = useState<{ key: string; isNew: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing) return;
    const key = editing.key.trim();
    if (!/^[a-z0-9][a-z0-9.-]{0,59}$/.test(key)) return toast.error('اسم المفتاح: أحرف إنجليزية صغيرة وأرقام ونقاط وشرطات');
    let value: unknown;
    try {
      value = JSON.parse(editing.text);
    } catch {
      return toast.error('صيغة JSON غير صحيحة');
    }
    setSaving(true);
    try {
      await adminApi.settings.save(key, value);
      toast.success('تم الحفظ');
      setEditing(null);
      query.reload();
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SettingDTO>[] = [
    { key: 'key', header: 'المفتاح', cell: (s) => <span dir="ltr" className="font-mono text-xs">{s.key}</span> },
    { key: 'public', header: 'الظهور', cell: (s) => <Badge tone={s.isPublic ? 'green' : 'gray'}>{s.isPublic ? 'يقرأه الموقع' : 'خاص'}</Badge> },
    { key: 'updated', header: 'آخر تحديث', cell: (s) => <span className="text-gray-500">{formatDate(s.updatedAt, true)}</span> },
    { key: 'actions', header: '', className: 'w-20 text-end', cell: (s) => <button type="button" onClick={() => setEditing({ key: s.key, isNew: false, text: JSON.stringify(s.value, null, 2) })} aria-label="تعديل" className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"><Pencil aria-hidden className="size-[18px]" /></button> },
  ];

  return (
    <>
      <PageHeader title="إعدادات متقدمة" description="كتل محتوى بصيغة JSON (نبذة المياه، الصفحات القانونية...). للاستخدام المتقدم فقط." actions={<Button onClick={() => setEditing({ key: '', isNew: true, text: '{\n  \n}' })}><Plus aria-hidden className="size-4" />إضافة إعداد</Button>} />
      <DataTable columns={columns} rows={query.data} rowKey={(s) => s.key} loading={query.loading} error={query.error} onRetry={query.reload} emptyTitle="لا توجد إعدادات" />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.isNew ? 'إضافة إعداد' : `تعديل: ${editing?.key}`} size="lg" footer={<><Button variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={() => void save()} disabled={saving}>حفظ</Button></>}>
        {editing && (
          <div className="space-y-4">
            {editing.isNew && <TextField label="المفتاح" dir="ltr" value={editing.key} onChange={(key) => setEditing({ ...editing, key })} placeholder="home.content" />}
            <TextAreaField label="القيمة (JSON)" dir="ltr" rows={16} value={editing.text} onChange={(text) => setEditing({ ...editing, text })} />
          </div>
        )}
      </Modal>
    </>
  );
}
