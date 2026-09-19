import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { api } from '@/api/client';
import { adminApi } from './api';
import { Spinner } from './components/ui';
import type { AdminUser, Role } from './types';

interface AuthValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await adminApi.auth.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, login, logout, can: (...roles) => !!user && roles.includes(user.role) }),
    [user, loading, login, logout],
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
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" state={{ from: location.pathname + location.search }} replace />;
  return <Outlet />;
}

/** Route guard: only the listed roles may open the nested pages. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
