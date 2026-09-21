import { useEffect, useState } from 'react';
import { CheckCircle2, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi, describeError } from '../api';
import { TextAreaField, TextField, Toggle } from '../components/Fields';
import { Badge, Card, ErrorBlock, PageHeader, Spinner, useToast } from '../components/ui';
import type { NotificationSettingsDTO } from '../types';

type Config = NotificationSettingsDTO['config'];

const EVENTS: { key: keyof Config['email']['events']; label: string }[] = [
  { key: 'application', label: 'طلب توظيف جديد' },
  { key: 'contact', label: 'رسالة تواصل جديدة' },
  { key: 'quote', label: 'طلب عرض سعر جديد' },
];

function Events({ value, onChange }: { value: Config['email']['events']; onChange: (v: Config['email']['events']) => void }) {
  return (
    <div className="mt-2 grid gap-1 sm:grid-cols-3">
      {EVENTS.map((e) => (
        <Toggle key={e.key} checked={value[e.key]} onChange={(checked) => onChange({ ...value, [e.key]: checked })} label={e.label} />
      ))}
    </div>
  );
}

/** Where to be alerted when a visitor sends something: an email and/or a WhatsApp message. */
export default function NotificationSettingsPage() {
  const toast = useToast();
  const query = useAsync(() => adminApi.notificationSettings.get());
  const [config, setConfig] = useState<Config | null>(null);
  const [recipients, setRecipients] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Record<'email' | 'whatsapp', { ok: boolean; message: string }> | null>(null);

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config);
      setRecipients(query.data.config.email.recipients.join('\n'));
    }
  }, [query.data]);

  if (query.error) return <Card><ErrorBlock onRetry={query.reload} /></Card>;
  if (!query.data || !config) return <div className="flex justify-center py-24"><Spinner /></div>;
  const { channels } = query.data;

  const parsedRecipients = () => recipients.split(/[\s,;]+/).map((r) => r.trim().toLowerCase()).filter(Boolean);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await adminApi.notificationSettings.save({ ...config, email: { ...config.email, recipients: parsedRecipients() } });
      setConfig(saved.config);
      toast.success('تم حفظ الإعدادات');
    } catch (error) {
      const d = describeError(error);
      toast.error(d.fields.length ? `${d.message} (${d.fields.map((f) => f.path).join('، ')})` : d.message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await save();
      setTestResult(await adminApi.notificationSettings.test());
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setTesting(false);
    }
  };

  const status = (ok: boolean) => <Badge tone={ok ? 'green' : 'gray'}>{ok ? 'الخدمة جاهزة' : 'غير مُعدّة في .env'}</Badge>;

  return (
    <>
      <PageHeader title="الإشعارات" description="لا تنتظر أن تفتح اللوحة: احصل على تنبيه فور وصول طلب توظيف أو رسالة أو طلب عرض سعر." />
      <div className="grid max-w-3xl gap-6">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">البريد الإلكتروني</h2>
            {status(channels.email)}
          </div>
          {!channels.email && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              أضف SMTP_HOST و SMTP_USER و SMTP_PASS و MAIL_FROM في ملف <span dir="ltr">server/.env</span> ثم أعد تشغيل الخادم.
            </p>
          )}
          <Toggle checked={config.email.enabled} onChange={(enabled) => setConfig({ ...config, email: { ...config.email, enabled } })} label="إرسال إشعارات بالبريد" />
          <div className="mt-4">
            <TextAreaField label="المستلمون" help="بريد في كل سطر (حتى 10). عند الرد على البريد يصل الرد للزائر مباشرة." dir="ltr" rows={3} value={recipients} onChange={setRecipients} placeholder="sales@example.com" />
          </div>
          <p className="mt-4 text-sm font-medium">أرسل عند:</p>
          <Events value={config.email.events} onChange={(events) => setConfig({ ...config, email: { ...config.email, events } })} />
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">واتساب</h2>
            {status(channels.whatsapp)}
          </div>
          {!channels.whatsapp && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              يحتاج WhatsApp Cloud API من Meta: أضف WHATSAPP_TOKEN و WHATSAPP_PHONE_ID (وقالب رسالة معتمد WHATSAPP_TEMPLATE للإرسال في أي وقت) في <span dir="ltr">server/.env</span>.
            </p>
          )}
          <Toggle checked={config.whatsapp.enabled} onChange={(enabled) => setConfig({ ...config, whatsapp: { ...config.whatsapp, enabled } })} label="إرسال تنبيه واتساب" />
          <div className="mt-4 max-w-sm">
            <TextField label="رقم المستلم" help="أرقام فقط مع رمز الدولة، مثل 970597959536" dir="ltr" value={config.whatsapp.number} onChange={(number) => setConfig({ ...config, whatsapp: { ...config.whatsapp, number: number.replace(/\D/g, '') } })} />
          </div>
          <p className="mt-4 text-sm font-medium">أرسل عند:</p>
          <Events value={config.whatsapp.events} onChange={(events) => setConfig({ ...config, whatsapp: { ...config.whatsapp, events } })} />
          <p className="mt-3 text-xs text-gray-400">التنبيه القصير يحتوي على الاسم والعنوان فقط؛ التفاصيل والملفات تبقى داخل لوحة التحكم.</p>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={saving || testing}>{saving && !testing ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
          <Button variant="secondary" onClick={() => void test()} disabled={saving || testing}>
            <Send aria-hidden className="size-4" />
            {testing ? 'جارٍ الإرسال...' : 'حفظ وإرسال رسالة تجريبية'}
          </Button>
        </div>

        {testResult && (
          <Card className="p-5">
            <ul className="space-y-2 text-sm">
              {(['email', 'whatsapp'] as const).map((key) => (
                <li key={key} className="flex items-center gap-2">
                  {testResult[key].ok ? <CheckCircle2 aria-hidden className="size-5 text-success" /> : <XCircle aria-hidden className="size-5 text-gray-400" />}
                  <span className="font-semibold">{key === 'email' ? 'البريد' : 'واتساب'}:</span>
                  <span className="text-gray-600">{testResult[key].message}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
