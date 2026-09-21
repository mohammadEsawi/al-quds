import { env } from '../config/env.js';
import type { NotificationType } from '../generated/prisma/client.js';
import { emailConfigured, escapeHtml, sendMail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { sendWhatsApp, whatsappConfigured } from '../lib/whatsappCloud.js';
import { recordAudit } from './audit.service.js';
import { getNotificationConfig, type NotificationConfig } from './notificationConfig.service.js';

export type NotificationKind = 'contact' | 'application' | 'quote';

export interface NotificationEvent {
  type: NotificationType;
  kind: NotificationKind;
  /** Headline shown in the dashboard bell, the email subject and the WhatsApp alert. */
  title: string;
  body?: string;
  refId?: string;
  /** Facts for the email (label → value). Never contains uploaded files. */
  details?: { label: string; value: string }[];
  /** Address of the sender, so replying to the email answers the visitor. */
  replyTo?: string;
}

const SECTION: Record<NotificationKind, string> = { contact: 'messages', application: 'applications', quote: 'quotes' };
const siteUrl = () => (env.SITE_URL ?? env.CLIENT_URL).replace(/\/+$/, '');
const dashboardLink = (event: NotificationEvent) => `${siteUrl()}/admin/${SECTION[event.kind]}${event.refId ? `?open=${encodeURIComponent(event.refId)}` : ''}`;

// A flood of submissions must not turn into a flood of emails / WhatsApp messages: the dashboard still records all of them.
const HOURLY_LIMIT = 30;
const sent: Record<'email' | 'whatsapp', number[]> = { email: [], whatsapp: [] };
function withinBudget(channel: 'email' | 'whatsapp'): boolean {
  const cutoff = Date.now() - 3_600_000;
  sent[channel] = sent[channel].filter((t) => t > cutoff);
  if (sent[channel].length >= HOURLY_LIMIT) return false;
  sent[channel].push(Date.now());
  return true;
}

export function buildEmail(event: NotificationEvent) {
  const rows = event.details ?? [];
  const link = dashboardLink(event);
  const text = [event.title, '', ...rows.map((r) => `${r.label}: ${r.value}`), '', `افتح لوحة التحكم: ${link}`].join('\n');
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.7;color:#111827">
<h2 style="margin:0 0 12px;color:#014681">${escapeHtml(event.title)}</h2>
<table style="border-collapse:collapse">${rows
    .map((r) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">${escapeHtml(r.label)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(r.value)}</td></tr>`)
    .join('')}</table>
<p style="margin-top:20px"><a href="${escapeHtml(link)}" style="background:#014681;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">فتح لوحة التحكم</a></p>
</div>`;
  return { subject: `[لاميكو] ${event.title}`, text, html };
}

async function viaEmail(config: NotificationConfig, event: NotificationEvent) {
  if (!config.email.enabled || !config.email.events[event.kind] || config.email.recipients.length === 0) return;
  if (!emailConfigured()) return;
  if (!withinBudget('email')) return void console.warn('Email alerts paused: hourly limit reached');
  const { subject, text, html } = buildEmail(event);
  await sendMail({ to: config.email.recipients, subject, text, html, ...(event.replyTo && { replyTo: event.replyTo }) });
}

async function viaWhatsApp(config: NotificationConfig, event: NotificationEvent) {
  if (!config.whatsapp.enabled || !config.whatsapp.events[event.kind] || !config.whatsapp.number) return;
  if (!whatsappConfigured()) return;
  if (!withinBudget('whatsapp')) return void console.warn('WhatsApp alerts paused: hourly limit reached');
  // Only the headline and the sender's name travel through WhatsApp; the details stay in the dashboard.
  await sendWhatsApp(config.whatsapp.number, event.title, `${event.body ?? ''} — افتح لوحة التحكم للتفاصيل`);
}

/** Sends the event to every enabled channel. A failing channel never affects the others or the request. */
async function dispatchExternal(event: NotificationEvent) {
  const config = await getNotificationConfig();
  const results = await Promise.allSettled([viaEmail(config, event), viaWhatsApp(config, event)]);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const channel = index === 0 ? 'email' : 'whatsapp';
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.warn(`${channel} alert failed:`, reason);
      void recordAudit({ action: `notify ${channel} failed`, detail: reason });
    }
  });
}

/** Stores the dashboard notification, then alerts the owners by email / WhatsApp in the background. */
export async function notifyAdmins(event: NotificationEvent) {
  await prisma.notification.create({
    data: { type: event.type, title: event.title, body: event.body ?? null, refId: event.refId ?? null },
  });
  void dispatchExternal(event).catch((error) => console.warn('Notification dispatch failed:', error instanceof Error ? error.message : error));
}

/** "Send a test" button: tries each configured channel and reports what happened. */
export async function sendTestNotification(): Promise<Record<'email' | 'whatsapp', { ok: boolean; message: string }>> {
  const config = await getNotificationConfig();
  const event: NotificationEvent = {
    type: 'CONTACT_MESSAGE',
    kind: 'contact',
    title: 'رسالة تجريبية من لوحة التحكم',
    body: 'اختبار',
    details: [{ label: 'الحالة', value: 'إذا وصلتك هذه الرسالة فإن الإشعارات تعمل بشكل صحيح.' }],
  };
  const run = async (enabled: boolean, configured: boolean, action: () => Promise<void>, notConfigured: string) => {
    if (!enabled) return { ok: false, message: 'القناة غير مفعّلة' };
    if (!configured) return { ok: false, message: notConfigured };
    try {
      await action();
      return { ok: true, message: 'تم الإرسال' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message.slice(0, 160) : 'فشل الإرسال' };
    }
  };
  const [email, whatsapp] = await Promise.all([
    run(config.email.enabled && config.email.recipients.length > 0, emailConfigured(), async () => {
      const { subject, text, html } = buildEmail(event);
      await sendMail({ to: config.email.recipients, subject, text, html });
    }, 'لم يتم إعداد خادم البريد (SMTP) في ملف .env'),
    run(config.whatsapp.enabled && Boolean(config.whatsapp.number), whatsappConfigured(), () => sendWhatsApp(config.whatsapp.number, event.title, 'اختبار — إذا وصلتك هذه الرسالة فالإشعارات تعمل'), 'لم يتم إعداد واتساب (WHATSAPP_TOKEN) في ملف .env'),
  ]);
  return { email, whatsapp };
}
