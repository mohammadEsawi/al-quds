import type { Prisma, QuoteStatus } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { pageArgs } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { DAY_MS, HOUR_MS, enforceSubmissionQuota } from '../lib/quota.js';
import type { QuoteInput } from '../validators/public.validators.js';
import { whatsappUrlFor } from './inbox.service.js';
import { notifyAdmins } from './notify.service.js';

type QuoteRow = Prisma.QuoteRequestGetPayload<object>;

const toDto = (q: QuoteRow) => ({
  id: q.id,
  createdAt: q.createdAt,
  productSlug: q.productSlug ?? undefined,
  productName: q.productName,
  company: q.company,
  name: q.name,
  email: q.email,
  phone: q.phone,
  quantity: q.quantity,
  city: q.city ?? undefined,
  message: q.message ?? undefined,
  status: q.status.toLowerCase(),
  notes: q.notes ?? undefined,
  isRead: q.isRead,
  whatsappUrl: whatsappUrlFor(q.phone),
});

// ───────── Public ─────────

export async function createQuoteRequest(input: QuoteInput) {
  await enforceSubmissionQuota(
    {
      forEmailToday: () => prisma.quoteRequest.count({ where: { email: input.email, createdAt: { gte: new Date(Date.now() - DAY_MS) } } }),
      siteThisHour: () => prisma.quoteRequest.count({ where: { createdAt: { gte: new Date(Date.now() - HOUR_MS) } } }),
    },
    { perEmailPerDay: 5, siteWidePerHour: 200 },
  );

  // The product name is taken from our own catalogue when the slug is known, so it cannot be spoofed.
  let productName = input.productName;
  let productSlug: string | null = null;
  if (input.productSlug) {
    const product = await prisma.product.findFirst({ where: { slug: input.productSlug, status: 'PUBLISHED' }, select: { slug: true, nameAr: true, nameEn: true } });
    if (product) {
      productSlug = product.slug;
      productName = `${product.nameAr} / ${product.nameEn}`;
    }
  }

  const quote = await prisma.quoteRequest.create({
    data: {
      productSlug,
      productName,
      company: input.company,
      name: input.name,
      email: input.email,
      phone: input.phone,
      quantity: input.quantity,
      city: input.city || null,
      message: input.message || null,
    },
  });

  await notifyAdmins({
    type: 'QUOTE_REQUEST',
    kind: 'quote',
    title: 'طلب عرض سعر جديد',
    body: `${quote.company} — ${quote.productName}`,
    refId: quote.id,
    replyTo: quote.email,
    details: [
      { label: 'المنتج', value: quote.productName },
      { label: 'الكمية', value: quote.quantity },
      { label: 'الشركة', value: quote.company },
      { label: 'الاسم', value: quote.name },
      { label: 'الهاتف', value: quote.phone },
      { label: 'البريد', value: quote.email },
      ...(quote.city ? [{ label: 'المدينة', value: quote.city }] : []),
      ...(quote.message ? [{ label: 'ملاحظات', value: quote.message.slice(0, 600) }] : []),
    ],
  });
  return quote.id;
}

// ───────── Admin ─────────

export async function listQuotes(query: { page: number; pageSize: number; status?: string; unread?: boolean; q?: string }) {
  const where: Prisma.QuoteRequestWhereInput = {
    ...(query.status && { status: query.status.toUpperCase() as QuoteStatus }),
    ...(query.unread && { isRead: false }),
    ...(query.q && {
      OR: [
        { company: { contains: query.q, mode: 'insensitive' } },
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { productName: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.quoteRequest.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.quoteRequest.count({ where }),
  ]);
  return { items: rows.map(toDto), total, page: query.page, pageSize: query.pageSize };
}

export async function getQuote(id: string) {
  const row = await prisma.quoteRequest.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Quote request not found', 'QUOTE_NOT_FOUND');
  return toDto(row);
}

export async function updateQuote(id: string, input: { status?: string; notes?: string | null; isRead?: boolean }) {
  const row = await prisma.quoteRequest.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status.toUpperCase() as QuoteStatus }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isRead !== undefined && { isRead: input.isRead }),
    },
  });
  if (input.isRead || input.status) await prisma.notification.updateMany({ where: { type: 'QUOTE_REQUEST', refId: id }, data: { isRead: true } });
  return toDto(row);
}

export async function deleteQuote(id: string) {
  await prisma.quoteRequest.delete({ where: { id } });
  await prisma.notification.deleteMany({ where: { type: 'QUOTE_REQUEST', refId: id } });
}
