import { useState, type FormEvent } from 'react';
import { Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { adminApi, describeError } from '../api';
import { useAuth } from '../auth';
import { TextField } from './Fields';
import { Badge, Card, useToast } from './ui';
import type { TwoFactorSetupDTO } from '../types';

/** Turn two-factor login on or off: scan a QR code with an authenticator app, confirm one code, keep the recovery codes. */
export function TwoFactorCard() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const enabled = user?.twoFactorEnabled === true;

  const [setup, setSetup] = useState<TwoFactorSetupDTO | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      setSetup(await adminApi.auth.twoFactor.setup());
      setCode('');
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await adminApi.auth.twoFactor.enable(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      await refresh();
      toast.success('تم تفعيل التحقق بخطوتين');
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.auth.twoFactor.disable(password, code.trim());
      setDisabling(false);
      setPassword('');
      setCode('');
      await refresh();
      toast.success('تم إيقاف التحقق بخطوتين');
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = () => {
    if (recoveryCodes) void navigator.clipboard?.writeText(recoveryCodes.join('\n')).then(() => toast.success('تم النسخ'));
  };

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">التحقق بخطوتين</h2>
        <Badge tone={enabled ? 'green' : 'gray'}>{enabled ? 'مفعّل' : 'غير مفعّل'}</Badge>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        حتى لو عرف أحد كلمة سرك، لن يستطيع الدخول بدون رمز يتغيّر كل 30 ثانية من تطبيق على هاتفك (Google Authenticator أو Microsoft Authenticator أو Authy).
      </p>
      {user?.twoFactorRequired && !enabled && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          إدارة الموقع تتطلب تفعيل التحقق بخطوتين قبل استخدام باقي الصفحات.
        </p>
      )}

      {recoveryCodes && (
        <div className="mb-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">احفظ رموز الاسترداد هذه الآن — لن تظهر مرة أخرى</p>
          <p className="mb-3 text-xs text-amber-800">كل رمز يعمل مرة واحدة إذا فقدت هاتفك. خزّنها في مكان آمن بعيد عن الجهاز.</p>
          <ul dir="ltr" className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={copyCodes}><Copy aria-hidden className="size-4" />نسخ</Button>
            <Button variant="ghost" onClick={() => setRecoveryCodes(null)}>حفظتها</Button>
          </div>
        </div>
      )}

      {!enabled && !setup && (
        <Button onClick={() => void start()} disabled={busy}>
          <ShieldCheck aria-hidden className="size-4" />
          {busy ? 'جارٍ التحضير...' : 'تفعيل التحقق بخطوتين'}
        </Button>
      )}

      {setup && (
        <form onSubmit={confirm} className="space-y-4">
          <ol className="list-decimal space-y-1 ps-5 text-sm text-gray-600">
            <li>افتح تطبيق المصادقة على هاتفك وأضف حساباً جديداً.</li>
            <li>امسح رمز QR، أو أدخل المفتاح يدوياً.</li>
            <li>اكتب الرمز المكوّن من 6 أرقام الذي يظهر في التطبيق ثم اضغط تأكيد.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-6">
            <img src={setup.qrDataUrl} alt="رمز QR لإعداد التحقق بخطوتين" width={192} height={192} className="rounded-xl border border-gray-100" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">المفتاح (للإدخال اليدوي)</p>
              <p dir="ltr" className="mt-1 font-mono text-sm break-all select-all">{setup.secret}</p>
            </div>
          </div>
          <div className="max-w-xs">
            <TextField label="الرمز من التطبيق" dir="ltr" autoComplete="one-time-code" value={code} onChange={setCode} placeholder="123456" required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || code.trim().length < 6}>{busy ? 'جارٍ التأكيد...' : 'تأكيد وتفعيل'}</Button>
            <Button type="button" variant="ghost" onClick={() => setSetup(null)}>إلغاء</Button>
          </div>
        </form>
      )}

      {enabled && !disabling && (
        <Button variant="secondary" onClick={() => setDisabling(true)}>
          <ShieldOff aria-hidden className="size-4" />
          إيقاف التحقق بخطوتين
        </Button>
      )}

      {enabled && disabling && (
        <form onSubmit={disable} className="max-w-sm space-y-4">
          <p className="text-sm text-gray-500">لإيقافه نحتاج كلمة السر ورمزاً حالياً من التطبيق.</p>
          <TextField label="كلمة السر" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={setPassword} required />
          <TextField label="الرمز من التطبيق (أو رمز استرداد)" dir="ltr" autoComplete="one-time-code" value={code} onChange={setCode} required />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={busy || !password || code.trim().length < 6}>إيقاف</Button>
            <Button type="button" variant="ghost" onClick={() => setDisabling(false)}>إلغاء</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
