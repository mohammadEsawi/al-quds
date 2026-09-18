import type { NotificationType } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export interface NotificationEvent {
  type: NotificationType;
  title: string;
  body?: string;
  refId?: string;
}

/**
 * Extra delivery channels (e.g. the WhatsApp Business API). The initial version needs none — admins
 * see notifications in the dashboard — but a channel can be added later with `registerNotifier()`
 * without touching the code that raises the events.
 */
export type ExternalNotifier = (event: NotificationEvent) => Promise<void>;
const externalNotifiers: ExternalNotifier[] = [];

export function registerNotifier(notifier: ExternalNotifier) {
  externalNotifiers.push(notifier);
}

/** Stores a dashboard notification, then fans out to external channels on a best-effort basis. */
export async function notifyAdmins(event: NotificationEvent) {
  await prisma.notification.create({ data: event });
  for (const send of externalNotifiers) {
    send(event).catch((error) => console.error('External notifier failed:', error instanceof Error ? error.message : error));
  }
}
