import { useEffect, useState, type FormEvent } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { describeError } from '../api';
import { useAuth } from '../auth';
import { TextField } from '../components/Fields';

export default function LoginPage() {
  const { user, login, loginWithCode, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /** Set once the password was right and an authenticator code is still needed. */
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'تسجيل الدخول | لاميكو';
  }, []);

  const target = (location.state as { from?: string } | null)?.from ?? '/admin';
  if (!loading && user) return <Navigate to={target} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mfaToken) {
        await loginWithCode(mfaToken, code.trim());
        navigate(target, { replace: true });
      } else {
        const next = await login(email.trim(), password);
        if (next) setMfaToken(next.mfaToken);
        else navigate(target, { replace: true });
      }
    } catch (err) {
      const message = describeError(err).message;
      setError(message);
      // The 5-minute pass expired: go back to the password step.
      if ((err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code === 'MFA_EXPIRED') {
        setMfaToken(null);
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-900 to-gray-800 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-deep">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white">
            {mfaToken ? <ShieldCheck aria-hidden className="size-6" /> : <Lock aria-hidden className="size-6" />}
          </span>
          <h1 className="font-display text-2xl font-bold">{mfaToken ? 'التحقق بخطوتين' : 'لوحة تحكم لاميكو'}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mfaToken ? 'أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة، أو أحد رموز الاسترداد.' : 'سجّل الدخول لإدارة المحتوى'}
          </p>
        </div>

        {mfaToken ? (
          <TextField label="رمز التحقق" dir="ltr" autoComplete="one-time-code" value={code} onChange={setCode} placeholder="123456" required />
        ) : (
          <>
            <TextField label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="username" value={email} onChange={setEmail} required />
            <TextField label="كلمة السر" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={setPassword} required />
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" full disabled={busy || (mfaToken ? code.trim().length < 6 : !email || !password)}>
          {busy ? 'جارٍ التحقق...' : mfaToken ? 'تأكيد' : 'دخول'}
        </Button>

        {mfaToken && (
          <button type="button" onClick={() => { setMfaToken(null); setCode(''); setError(''); }} className="block w-full text-center text-sm text-gray-500 hover:text-primary">
            رجوع
          </button>
        )}
      </form>
    </div>
  );
}
