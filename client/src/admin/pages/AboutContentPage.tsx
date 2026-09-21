import { useEffect, useState } from 'react';
import { aboutPage as builtIn } from '@/content/aboutPage';
import type { AboutPageContent } from '@/content/types';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { FormSection, LocalizedField } from '../components/Fields';
import { ListEditor } from '../components/ListEditor';
import { Card, ErrorBlock, PageHeader, Spinner, useToast } from '../components/ui';
import { emptyLoc } from '../types';
import { SaveBar } from './SitePages';

const KEY = 'about.page';

/** The text of «عن شركة لاميكو للاستثمار الصناعي والتوريدات»: introduction, vision, mission and the strategic goals. */
export default function AboutContentPage() {
  const toast = useToast();
  const query = useAsync(() => adminApi.settings.list());
  const [form, setForm] = useState<AboutPageContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    const stored = query.data.find((s) => s.key === KEY)?.value as AboutPageContent | undefined;
    setForm(stored?.intro ? stored : builtIn);
  }, [query.data]);

  if (query.error) return <Card><ErrorBlock onRetry={query.reload} /></Card>;
  if (!form) return <div className="flex justify-center py-24"><Spinner /></div>;

  const set = <K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) => setForm((f) => ({ ...f!, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.settings.save(KEY, form);
      toast.success('تم حفظ صفحة «عن الشركة»');
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="صفحة عن الشركة" description="النصوص التي تظهر في صفحة «عن شركة لاميكو للاستثمار الصناعي والتوريدات» وفي الصفحة الرئيسية. الصور والأسماء في صفحة «الإدارة»." />
      <div className="space-y-6 pb-28">
        <FormSection title="اسم الشركة والتعريف">
          <LocalizedField label="اسم الشركة الكامل" required value={form.companyName} onChange={(v) => set('companyName', v)} />
          <ListEditor items={form.intro} onChange={(v) => set('intro', v)} newItem={emptyLoc} addLabel="إضافة فقرة" renderItem={(p, update) => <LocalizedField label="الفقرة" multiline rows={4} value={p} onChange={update} />} />
        </FormSection>

        <FormSection title="الرؤية">
          <LocalizedField label="عنوان الرؤية" value={form.vision.title} onChange={(v) => set('vision', { ...form.vision, title: v })} />
          <LocalizedField label="نص الرؤية" multiline rows={3} value={form.vision.text} onChange={(v) => set('vision', { ...form.vision, text: v })} />
        </FormSection>

        <FormSection title="الرسالة">
          <LocalizedField label="عنوان الرسالة" value={form.mission.title} onChange={(v) => set('mission', { ...form.mission, title: v })} />
          <LocalizedField label="نص الرسالة" multiline rows={4} value={form.mission.text} onChange={(v) => set('mission', { ...form.mission, text: v })} />
        </FormSection>

        <FormSection title="الأهداف الاستراتيجية" description="تظهر مرقّمة بالترتيب.">
          <ListEditor
            items={form.goals}
            max={16}
            onChange={(v) => set('goals', v)}
            newItem={() => ({ title: emptyLoc(), text: emptyLoc() })}
            addLabel="إضافة هدف"
            renderItem={(goal, update) => (
              <div className="space-y-3">
                <LocalizedField label="العنوان" value={goal.title} onChange={(title) => update({ ...goal, title })} />
                <LocalizedField label="الوصف" multiline rows={3} value={goal.text} onChange={(text) => update({ ...goal, text })} />
              </div>
            )}
          />
        </FormSection>
      </div>
      <SaveBar onSave={() => void save()} saving={saving} />
    </>
  );
}
