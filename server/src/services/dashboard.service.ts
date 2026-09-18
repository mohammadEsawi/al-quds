import { prisma } from '../lib/prisma.js';
import { toJob, toProduct, productInclude } from '../serializers/index.js';
import { whatsappUrlFor } from './inbox.service.js';

const DAY = 24 * 60 * 60 * 1000;

/** Groups timestamps into the last `days` calendar days (oldest first) for the dashboard charts. */
function perDay(dates: Date[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) buckets.set(new Date(Date.now() - i * DAY).toISOString().slice(0, 10), 0);
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}

export async function getDashboard() {
  const since = new Date(Date.now() - 14 * DAY);

  const [
    totalProducts,
    bySector,
    projects,
    activeJobs,
    totalApplications,
    newApplications,
    unreadMessages,
    unreadNotifications,
    byStatus,
    recentApplication,
    recentMessage,
    recentProduct,
    recentJob,
    applicationDates,
    messageDates,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.groupBy({ by: ['sector'], _count: { _all: true } }),
    prisma.realEstateProject.count(),
    prisma.job.count({ where: { status: 'OPEN' } }),
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { status: 'NEW' } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.notification.count({ where: { isRead: false } }),
    prisma.jobApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.jobApplication.findFirst({ orderBy: { createdAt: 'desc' }, include: { job: { select: { titleAr: true, titleEn: true } } } }),
    prisma.contactMessage.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.product.findFirst({ orderBy: { createdAt: 'desc' }, include: productInclude }),
    prisma.job.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.jobApplication.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.contactMessage.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const sector = (key: string) => bySector.find((s) => s.sector === key)?._count._all ?? 0;

  return {
    totals: {
      products: totalProducts,
      waterProducts: sector('WATER'),
      plasticProducts: sector('PLASTIC') + sector('PREFORMS') + sector('CAPS'),
      foodProducts: sector('FOOD'),
      realEstateProjects: projects,
      activeJobs,
      applications: totalApplications,
      newApplications,
      unreadMessages,
      unreadNotifications,
    },
    applicationsByStatus: byStatus.map((s) => ({ status: s.status.toLowerCase(), count: s._count._all })),
    activity: {
      applications: perDay(applicationDates.map((a) => a.createdAt), 14),
      messages: perDay(messageDates.map((m) => m.createdAt), 14),
    },
    recent: {
      application: recentApplication && {
        id: recentApplication.id,
        fullName: recentApplication.fullName,
        position: recentApplication.position,
        status: recentApplication.status.toLowerCase(),
        createdAt: recentApplication.createdAt,
      },
      message: recentMessage && {
        id: recentMessage.id,
        name: recentMessage.name,
        subject: recentMessage.subject ?? undefined,
        isRead: recentMessage.isRead,
        whatsappUrl: whatsappUrlFor(recentMessage.phone),
        createdAt: recentMessage.createdAt,
      },
      product: recentProduct && toProduct(recentProduct),
      job: recentJob && toJob(recentJob),
    },
  };
}
