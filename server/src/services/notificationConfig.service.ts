import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/** Who is alerted about what. Stored in the database (editable in the dashboard); the credentials stay in server/.env. */
const events = z.object({ contact: z.boolean(), application: z.boolean(), quote: z.boolean() });

export const notificationConfigSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    recipients: z.array(z.string().trim().toLowerCase().pipe(z.email())).max(10),
    events,
  }),
  whatsapp: z.object({
    enabled: z.boolean(),
    /** Digits only, with country code. */
    number: z.union([z.literal(''), z.string().trim().regex(/^\d{7,15}$/, 'Digits only, with country code')]),
    events,
  }),
});
export type NotificationConfig = z.infer<typeof notificationConfigSchema>;

const allEvents = { contact: true, application: true, quote: true };
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  email: { enabled: false, recipients: [], events: allEvents },
  whatsapp: { enabled: false, number: '', events: allEvents },
};

const KEY = 'notifications.config';

export async function getNotificationConfig(): Promise<NotificationConfig> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  const parsed = notificationConfigSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_CONFIG;
}

export async function saveNotificationConfig(config: NotificationConfig): Promise<NotificationConfig> {
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: config }, update: { value: config } });
  return config;
}
