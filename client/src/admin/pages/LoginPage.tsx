import { useEffect, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { describeError } from '../api';
import { useAuth } from '../auth';
import { TextField } from '../components/Fields';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'تسجيل الدخول | لاميكو';
  }, []);

  if (!loading && user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/admin'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true });
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-900 to-gray-800 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-deep">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white">
            <Lock aria-hidden className="size-6" />
          </span>
          <h1 className="font-display text-2xl font-bold">لوحة تحكم لاميكو</h1>
          <p className="mt-1 text-sm text-gray-500">سجّل الدخول لإدارة المحتوى</p>
        </div>

        <TextField label="البريد الإلكتروني" type="email" dir="ltr" autoComplete="username" value={email} onChange={setEmail} required />
        <TextField label="كلمة السر" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={setPassword} required />

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" full disabled={busy || !email || !password}>
          {busy ? 'جارٍ الدخول...' : 'دخول'}
        </Button>
      </form>
    </div>
  );
}
