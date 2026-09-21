import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { api } from '@/api/client';
import { adminApi } from './api';
import { SplashHold } from '@/lib/splash';
import { Spinner } from './components/ui';
import type { AdminUser, Role } from './types';

interface AuthValue {
  user: AdminUser | null;
  loading: boolean;
  /** Resolves with `mfaToken` when a second step (authenticator code) is still needed. */
  login: (email: string, password: string) => Promise<{ mfaToken: string } | null>;
  loginWithCode: (mfaToken: string, code: string) => Promise<void>;
  /** Re-reads the signed-in user (after two-factor setup changes). */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Keeps the signed-in admin in memory. The session itself is an httpOnly cookie the browser manages. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.auth
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // An expired session on any admin call drops back to the login screen.
    const id = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const url: string = error?.config?.url ?? '';
        if (error?.response?.status === 401 && url.startsWith('/admin')) setUser(null);
        return Promise.reject(error);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminApi.auth.login(email, password);
    if ('mfaRequired' in result) return { mfaToken: result.mfaToken };
    setUser(result.user);
    return null;
  }, []);

  const loginWithCode = useCallback(async (mfaToken: string, code: string) => {
    const result = await adminApi.auth.loginTwoFactor(mfaToken, code);
    setUser(result.user);
  }, []);

  const refresh = useCallback(async () => {
    const result = await adminApi.auth.me().catch(() => null);
    if (result) setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await adminApi.auth.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, login, loginWithCode, refresh, logout, can: (...roles) => !!user && roles.includes(user.role) }),
    [user, loading, login, loginWithCode, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** Route guard: signed-in users only. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SplashHold />
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname + location.search }} replace />;
  // When the server requires two-factor login, the only page that works until it is set up is the account page.
  if (user.twoFactorRequired && location.pathname !== '/admin/account') return <Navigate to="/admin/account" replace />;
  return <Outlet />;
}

/** Route guard: only the listed roles may open the nested pages. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
