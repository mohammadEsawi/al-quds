import { Briefcase, Building2, Droplets, FileText, Mail, Package, Plus, Wheat, Factory, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '../api';
import { useAuth } from '../auth';
import { ActivityChart, BarList } from '../components/Charts';
import { Badge, Card, ErrorBlock, PageHeader, Spinner } from '../components/ui';
import { applicationStatusLabels, formatDate } from '../labels';

function Stat({ icon: Icon, label, value, to, tone }: { icon: LucideIcon; label: string; value: number; to?: string; tone: string }) {
  const body = (
    <div className="flex items-center gap-4 p-5">
      <span className={`flex size-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon aria-hidden className="size-6" />
      </span>
      <div>
        <p dir="ltr" className="text-start font-display text-2xl leading-none font-bold">{value}</p>
        <p className="mt-1 text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
  return (
    <Card className="transition-shadow hover:shadow-lift">
      {to ? <Link to={to} className="block">{body}</Link> : body}
    </Card>
  );
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const query = useAsync(() => adminApi.dashboard());
  const d = query.data;
  const admins = can('SUPER_ADMIN', 'ADMIN');

  return (
    <>
      <PageHeader
        title={`أهلاً ${user?.name ?? ''}`}
        description="نظرة سريعة على الموقع وآخر النشاط."
        actions={
          <>
            <Link to="/admin/products/new?sector=water">
              <Button><Plus aria-hidden className="size-4" />إضافة منتج مياه</Button>
            </Link>
            <Link to="/admin/products/new">
              <Button variant="secondary">إضافة منتج</Button>
            </Link>
          </>
        }
      />

      {query.error ? (
        <Card><ErrorBlock onRetry={query.reload} /></Card>
      ) : !d ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Package} label="إجمالي المنتجات" value={d.totals.products} to="/admin/products" tone="bg-blue-50 text-primary" />
            <Stat icon={Droplets} label="منتجات المياه" value={d.totals.waterProducts} to="/admin/products?sector=water" tone="bg-sky-50 text-sky-600" />
            <Stat icon={Factory} label="البلاستيك والبريفورم والأغطية" value={d.totals.plasticProducts} to="/admin/products?sector=plastic" tone="bg-violet-50 text-violet-600" />
            <Stat icon={Wheat} label="المنتجات الغذائية" value={d.totals.foodProducts} to="/admin/products?sector=food" tone="bg-amber-50 text-amber-600" />
            <Stat icon={Building2} label="مشاريع العقار" value={d.totals.realEstateProjects} to="/admin/real-estate" tone="bg-emerald-50 text-emerald-600" />
            <Stat icon={Briefcase} label="وظائف مفتوحة" value={d.totals.activeJobs} to="/admin/jobs" tone="bg-rose-50 text-rose-600" />
            {admins && <Stat icon={FileText} label={`طلبات التوظيف (${d.totals.newApplications} جديد)`} value={d.totals.applications} to="/admin/applications" tone="bg-indigo-50 text-indigo-600" />}
            {admins && <Stat icon={Mail} label="رسائل غير مقروءة" value={d.totals.unreadMessages} to="/admin/messages" tone="bg-pink-50 text-pink-600" />}
          </div>

          {admins && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h2 className="mb-4 font-display text-lg font-bold">النشاط خلال آخر 14 يوماً</h2>
                <ActivityChart
                  series={[
                    { label: 'طلبات التوظيف', color: '#0a6bb5', data: d.activity.applications },
                    { label: 'رسائل التواصل', color: '#ad1355', data: d.activity.messages },
                  ]}
                />
              </Card>
              <Card className="p-5">
                <h2 className="mb-4 font-display text-lg font-bold">حالة طلبات التوظيف</h2>
                {d.applicationsByStatus.length ? (
                  <BarList items={d.applicationsByStatus.map((s) => ({ label: applicationStatusLabels[s.status], value: s.count }))} />
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">لا توجد طلبات بعد</p>
                )}
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-bold">آخر النشاط</h2>
              <ul className="divide-y divide-gray-50 text-sm">
                {admins && d.recent.application && (
                  <li className="flex items-center justify-between gap-3 py-3">
                    <span><span className="font-semibold">{d.recent.application.fullName}</span> تقدّم لوظيفة {d.recent.application.position}</span>
                    <Link to={`/admin/applications?open=${d.recent.application.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">{formatDate(d.recent.application.createdAt, true)}</Link>
                  </li>
                )}
                {admins && d.recent.message && (
                  <li className="flex items-center justify-between gap-3 py-3">
                    <span>رسالة من <span className="font-semibold">{d.recent.message.name}</span>{d.recent.message.subject ? ` — ${d.recent.message.subject}` : ''} {!d.recent.message.isRead && <Badge tone="red">جديدة</Badge>}</span>
                    <Link to={`/admin/messages?open=${d.recent.message.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">{formatDate(d.recent.message.createdAt, true)}</Link>
                  </li>
                )}
                {d.recent.product && (
                  <li className="flex items-center justify-between gap-3 py-3">
                    <span>آخر منتج: <span className="font-semibold">{d.recent.product.name.ar}</span></span>
                    <Link to={`/admin/products/${d.recent.product.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">{formatDate(d.recent.product.createdAt)}</Link>
                  </li>
                )}
                {d.recent.job && (
                  <li className="flex items-center justify-between gap-3 py-3">
                    <span>آخر وظيفة: <span className="font-semibold">{d.recent.job.title.ar}</span></span>
                    <Link to={`/admin/jobs/${d.recent.job.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">{formatDate(d.recent.job.createdAt)}</Link>
                  </li>
                )}
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-bold">اختصارات</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { to: '/admin/products/new?sector=water', label: 'إضافة حجم مياه جديد' },
                  { to: '/admin/water-labels', label: 'إدارة ملصقات المياه' },
                  { to: '/admin/products/new?sector=food', label: 'إضافة منتج غذائي' },
                  { to: '/admin/media', label: 'رفع صور جديدة' },
                  { to: '/admin/jobs/new', label: 'نشر وظيفة' },
                  { to: '/admin/real-estate', label: 'مشاريع العقار' },
                ].map((s) => (
                  <Link key={s.to} to={s.to} className="rounded-lg border border-gray-100 px-4 py-3 font-medium text-gray-700 transition hover:border-primary hover:text-primary">
                    {s.label}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
