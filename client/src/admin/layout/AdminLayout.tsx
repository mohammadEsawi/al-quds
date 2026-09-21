import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  BookOpenText,
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  FolderTree,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  Shapes,
  Tag,
  ScrollText,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { adminApi } from '../api';
import { useAuth } from '../auth';
import { Badge } from '../components/ui';
import { formatDate, roleLabels, sectorLabels } from '../labels';
import type { DashboardDTO, NotificationDTO, Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  badge?: keyof DashboardDTO['totals'];
}

const ADMINS: Role[] = ['SUPER_ADMIN', 'ADMIN'];

const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'عام', items: [{ to: '/admin', label: 'لوحة المعلومات', icon: LayoutDashboard }] },
  {
    title: 'المنتجات',
    items: [
      { to: '/admin/products', label: 'كل المنتجات', icon: Package },
      { to: '/admin/products?sector=water', label: sectorLabels.water, icon: Package },
      { to: '/admin/products?sector=plastic', label: sectorLabels.plastic, icon: Package },
      { to: '/admin/products?sector=preforms', label: sectorLabels.preforms, icon: Package },
      { to: '/admin/products?sector=caps', label: sectorLabels.caps, icon: Package },
      { to: '/admin/products?sector=food', label: sectorLabels.food, icon: Package },
      { to: '/admin/water-labels', label: 'ملصقات المياه', icon: Tag },
      { to: '/admin/categories', label: 'التصنيفات', icon: FolderTree },
    ],
  },
  {
    title: 'المحتوى',
    items: [
      { to: '/admin/sectors', label: 'القطاعات', icon: Shapes },
      { to: '/admin/real-estate', label: 'العقار', icon: Building2 },
      { to: '/admin/jobs', label: 'الوظائف', icon: Briefcase },
      { to: '/admin/team', label: 'الإدارة (مجلس + تنفيذية)', icon: UsersRound },
      { to: '/admin/about', label: 'صفحة عن الشركة', icon: BookOpenText, roles: ADMINS },
      { to: '/admin/home', label: 'الصفحة الرئيسية', icon: Home, roles: ADMINS },
    ],
  },
  {
    title: 'التواصل',
    items: [
      { to: '/admin/applications', label: 'طلبات التوظيف', icon: FileText, roles: ADMINS, badge: 'newApplications' },
      { to: '/admin/quotes', label: 'طلبات عروض الأسعار', icon: Receipt, roles: ADMINS, badge: 'newQuotes' },
      { to: '/admin/messages', label: 'الرسائل', icon: Mail, roles: ADMINS, badge: 'unreadMessages' },
      { to: '/admin/notification-settings', label: 'الإشعارات', icon: BellRing, roles: ADMINS },
    ],
  },
  {
    title: 'الموقع',
    items: [
      { to: '/admin/media', label: 'مكتبة الوسائط', icon: ImageIcon },
      { to: '/admin/company', label: 'معلومات الشركة', icon: Building2, roles: ADMINS },
      { to: '/admin/whatsapp', label: 'واتساب', icon: MessageCircle, roles: ADMINS },
      { to: '/admin/settings', label: 'إعدادات متقدمة', icon: Settings, roles: ADMINS },
    ],
  },
  {
    title: 'النظام',
    items: [
      { to: '/admin/users', label: 'المستخدمون', icon: Users, roles: ['SUPER_ADMIN'] },
      { to: '/admin/audit', label: 'سجل النشاط', icon: ScrollText, roles: ['SUPER_ADMIN'] },
      { to: '/admin/account', label: 'حسابي', icon: KeyRound },
    ],
  },
];

function isActive(item: NavItem, pathname: string, search: string) {
  const [path, query] = item.to.split('?');
  if (pathname !== path && !(path !== '/admin' && pathname.startsWith(`${path}/`))) return false;
  if (path === '/admin/products') {
    const sector = new URLSearchParams(search).get('sector');
    const wanted = new URLSearchParams(query ?? '').get('sector');
    // The "all products" item is active only when no sector filter is applied (editing a product keeps it active).
    return wanted ? sector === wanted : !sector;
  }
  return true;
}

export function AdminLayout() {
  const { user, logout, can } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [totals, setTotals] = useState<DashboardDTO['totals'] | null>(null);
  const [notes, setNotes] = useState<{ items: NotificationDTO[]; unread: number } | null>(null);
  const [bell, setBell] = useState(false);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'لوحة التحكم | لاميكو';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => setOpen(false), [pathname, search]);

  const refresh = useCallback(async () => {
    adminApi.dashboard().then((d) => setTotals(d.totals)).catch(() => undefined);
    if (can('SUPER_ADMIN', 'ADMIN')) {
      adminApi.notifications.list({ pageSize: 8 }).then((n) => setNotes({ items: n.items, unread: n.unread })).catch(() => undefined);
    }
  }, [can]);

  // Light polling keeps badges and the bell fresh while the dashboard stays open.
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(id);
  }, [refresh, pathname]);

  const openNotification = async (n: NotificationDTO) => {
    setBell(false);
    await adminApi.notifications.markRead(n.id).catch(() => undefined);
    void refresh();
    const section = n.type === 'job_application' ? 'applications' : n.type === 'quote_request' ? 'quotes' : 'messages';
    navigate(`/admin/${section}?open=${n.refId ?? ''}`);
  };

  const markAll = async () => {
    await adminApi.notifications.markAllRead().catch(() => undefined);
    void refresh();
  };

  const sidebar = (
    <nav aria-label="القائمة الرئيسية" className="flex h-full flex-col overflow-y-auto px-3 pb-6">
      {NAV.map((group) => {
        const items = group.items.filter((item) => !item.roles || can(...item.roles));
        if (!items.length) return null;
        return (
          <div key={group.title} className="mt-5">
            <p className="text-overline mb-2 px-3 text-gray-500">{group.title}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(item, pathname, search);
                const count = item.badge ? totals?.[item.badge] : 0;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active ? 'bg-white/12 text-white' : 'text-gray-300 hover:bg-white/6 hover:text-white',
                      )}
                    >
                      <item.icon aria-hidden className="size-[18px] shrink-0 opacity-80" />
                      <span className="flex-1">{item.label}</span>
                      {!!count && <span dir="ltr" className="rounded-full bg-quds px-2 py-0.5 text-[11px] font-bold text-white">{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col bg-gray-900 lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-sm font-black text-primary">L</span>
          <div>
            <p className="text-sm font-bold text-white">لاميكو</p>
            <p className="text-[11px] text-gray-400">لوحة التحكم</p>
          </div>
        </div>
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="absolute inset-0 bg-gray-900/50" />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-gray-900">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <p className="text-sm font-bold text-white">لوحة التحكم</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="فتح القائمة" className="rounded-lg p-2 text-gray-600 hover:bg-gray-50 lg:hidden">
            <Menu aria-hidden className="size-5" />
          </button>
          <div className="flex-1" />

          <Link to="/ar" target="_blank" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 sm:inline-flex">
            <ExternalLink aria-hidden className="size-4" />
            عرض الموقع
          </Link>

          {can('SUPER_ADMIN', 'ADMIN') && (
            <div className="relative">
              <button type="button" onClick={() => setBell((v) => !v)} aria-label={`الإشعارات${notes?.unread ? ` (${notes.unread} جديد)` : ''}`} aria-expanded={bell} className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-50">
                <Bell aria-hidden className="size-5" />
                {!!notes?.unread && <span dir="ltr" className="absolute -end-0.5 -top-0.5 min-w-5 rounded-full bg-quds px-1 text-center text-[10px] leading-5 font-bold text-white">{notes.unread}</span>}
              </button>
              {bell && (
                <>
                  <button type="button" aria-label="إغلاق" className="fixed inset-0 z-40 cursor-default" onClick={() => setBell(false)} />
                  <div className="absolute end-0 top-full z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-deep">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-bold">الإشعارات</p>
                      {!!notes?.unread && <button type="button" onClick={() => void markAll()} className="text-xs font-semibold text-primary hover:underline">تعليم الكل كمقروء</button>}
                    </div>
                    <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
                      {notes?.items.length ? (
                        notes.items.map((n) => (
                          <li key={n.id}>
                            <button type="button" onClick={() => void openNotification(n)} className={cn('block w-full px-4 py-3 text-start hover:bg-gray-50', !n.isRead && 'bg-blue-50/50')}>
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                {!n.isRead && <span className="size-2 rounded-full bg-quds" />}
                                {n.title}
                              </span>
                              {n.body && <span className="mt-0.5 block truncate text-xs text-gray-500">{n.body}</span>}
                              <span className="mt-1 block text-[11px] text-gray-400">{formatDate(n.createdAt, true)}</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-8 text-center text-sm text-gray-400">لا توجد إشعارات</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 border-s border-gray-100 ps-3">
            <div className="hidden text-end sm:block">
              <p className="text-sm leading-tight font-semibold">{user?.name}</p>
              <Badge tone="blue">{user ? roleLabels[user.role] : ''}</Badge>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/admin/login');
              }}
              aria-label="تسجيل الخروج"
              className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-error"
            >
              <LogOut aria-hidden className="size-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
