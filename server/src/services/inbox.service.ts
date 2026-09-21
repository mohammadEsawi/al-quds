import { env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { pageArgs, type Page } from '../lib/pagination.js';
import { DAY_MS, HOUR_MS, enforceSubmissionQuota } from '../lib/quota.js';
import { prisma } from '../lib/prisma.js';
import type { ContactInput } from '../validators/public.validators.js';
import { notifyAdmins } from './notify.service.js';

/** Digits-only international number for wa.me, or null when the phone cannot be normalised. */
export function whatsappUrlFor(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = env.DEFAULT_COUNTRY_CODE + digits.slice(1);
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

// ───────── Contact messages ─────────

const messageDto = (m: Prisma.ContactMessageGetPayload<object>) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  phone: m.phone ?? undefined,
  subject: m.subject ?? undefined,
  message: m.message,
  isRead: m.isRead,
  whatsappUrl: whatsappUrlFor(m.phone),
  createdAt: m.createdAt,
});

export async function createContactMessage(input: ContactInput) {
  await enforceSubmissionQuota(
    {
      forEmailToday: () => prisma.contactMessage.count({ where: { email: input.email, createdAt: { gte: new Date(Date.now() - DAY_MS) } } }),
      siteThisHour: () => prisma.contactMessage.count({ where: { createdAt: { gte: new Date(Date.now() - HOUR_MS) } } }),
    },
    { perEmailPerDay: 5, siteWidePerHour: 300 },
  );
  const message = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject || null,
      message: input.message,
    },
  });
  await notifyAdmins({
    type: 'CONTACT_MESSAGE',
    kind: 'contact',
    title: 'رسالة تواصل جديدة',
    body: `${message.name}${message.subject ? ` — ${message.subject}` : ''}`,
    refId: message.id,
    replyTo: message.email,
    details: [
      { label: 'الاسم', value: message.name },
      { label: 'البريد', value: message.email },
      ...(message.phone ? [{ label: 'الهاتف', value: message.phone }] : []),
      ...(message.subject ? [{ label: 'الموضوع', value: message.subject }] : []),
      { label: 'الرسالة', value: message.message.slice(0, 600) },
    ],
  });
  return message.id;
}

export async function listMessages(query: { page: number; pageSize: number; unread?: boolean; q?: string }): Promise<Page<ReturnType<typeof messageDto>>> {
  const where: Prisma.ContactMessageWhereInput = {
    ...(query.unread && { isRead: false }),
    ...(query.q && {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { subject: { contains: query.q, mode: 'insensitive' } },
        { message: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.contactMessage.count({ where }),
  ]);
  return { items: rows.map(messageDto), total, page: query.page, pageSize: query.pageSize };
}

export async function getMessage(id: string) {
  const row = await prisma.contactMessage.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Message not found', 'MESSAGE_NOT_FOUND');
  return messageDto(row);
}

export async function setMessageRead(id: string, isRead: boolean) {
  const row = await prisma.contactMessage.update({ where: { id }, data: { isRead } });
  if (isRead) await prisma.notification.updateMany({ where: { type: 'CONTACT_MESSAGE', refId: id }, data: { isRead: true } });
  return messageDto(row);
}

export async function deleteMessage(id: string) {
  await prisma.contactMessage.delete({ where: { id } });
  await prisma.notification.deleteMany({ where: { type: 'CONTACT_MESSAGE', refId: id } });
}

// ───────── Notifications ─────────

export async function listNotifications(query: { page: number; pageSize: number; unread?: boolean }) {
  const where: Prisma.NotificationWhereInput = query.unread ? { isRead: false } : {};
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);
  return {
    items: items.map((n) => ({ ...n, type: n.type.toLowerCase() })),
    total,
    unread,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function markNotificationRead(id: string) {
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead() {
  const result = await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  return result.count;
}
