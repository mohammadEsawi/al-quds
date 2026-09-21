import fs from 'node:fs/promises';
import path from 'node:path';
import { env, isProduction } from '../config/env.js';
import { antivirusEnabled, scanBuffer } from '../lib/antivirus.js';
import { emailConfigured } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { whatsappConfigured } from '../lib/whatsappCloud.js';
import { captchaEnabled } from '../middleware/captcha.js';
import { getNotificationConfig } from './notificationConfig.service.js';

export interface ReadinessItem {
  id: string;
  group: 'content' | 'notifications' | 'security' | 'operations';
  /** ok: nothing to do · todo: the site works but this should be done · warn: fix before going live */
  status: 'ok' | 'todo' | 'warn';
  /** A number to show next to the item (how many things need attention), when relevant. */
  count?: number;
  /** Where in the dashboard it can be handled. */
  link?: string;
}

async function latestBackup(): Promise<Date | null> {
  try {
    const dir = path.resolve(env.BACKUP_DIR);
    const entries = (await fs.readdir(dir)).filter((name) => name.startsWith('lamico-'));
    const times = await Promise.all(entries.map(async (name) => (await fs.stat(path.join(dir, name))).mtime));
    return times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null;
  } catch {
    return null;
  }
}

/**
 * A live checklist of what is still missing before the site is complete and safe to publish.
 * It reads the real state (database + configuration), so items disappear as they are done.
 */
export async function getReadiness(currentUserId: string): Promise<ReadinessItem[]> {
  const [products, sampleProducts, labels, sampleJobs, company, notifications, adminsWithout, me, superuser, backup, teamWithoutPhoto, leaderMessages, teamPlaceholders] = await Promise.all([
    prisma.product.findMany({ where: { status: 'PUBLISHED', isSample: false }, select: { imageUrl: true } }),
    prisma.product.count({ where: { isSample: true } }),
    prisma.waterLabel.findMany({ where: { isActive: true }, select: { imageUrl: true } }),
    prisma.job.count({ where: { isSample: true } }),
    prisma.companyInfo.findUnique({ where: { id: 'default' }, select: { logoLightUrl: true, mapEmbedUrl: true } }),
    getNotificationConfig(),
    prisma.user.count({ where: { isActive: true, role: { in: ['SUPER_ADMIN', 'ADMIN'] }, totpEnabledAt: null } }),
    prisma.user.findUnique({ where: { id: currentUserId }, select: { totpEnabledAt: true } }),
    prisma.$queryRaw<{ rolsuper: boolean }[]>`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`,
    latestBackup(),
    prisma.teamMember.count({ where: { published: true, photoUrl: null } }),
    prisma.teamMember.findMany({ where: { published: true, role: { in: ['CHAIRMAN', 'GENERAL_MANAGER'] } }, select: { messageAr: true, messageEn: true } }),
    prisma.teamMember.count({ where: { isSample: true } }),
  ]);

  const withoutImage = products.filter((p) => !p.imageUrl).length;
  const labelsWithoutImage = labels.filter((l) => !l.imageUrl).length;
  const recipients = notifications.email.recipients.length;

  let antivirus: ReadinessItem['status'] = 'todo';
  if (antivirusEnabled()) antivirus = (await scanBuffer(Buffer.from('lamico-health-check'))).status === 'clean' ? 'ok' : 'warn';

  const daysSinceBackup = backup ? (Date.now() - backup.getTime()) / 86_400_000 : null;
  const items: ReadinessItem[] = [
    { id: 'productImages', group: 'content', status: withoutImage ? 'todo' : 'ok', count: withoutImage, link: '/admin/products' },
    { id: 'sampleProducts', group: 'content', status: sampleProducts ? 'todo' : 'ok', count: sampleProducts, link: '/admin/products' },
    { id: 'waterLabelImages', group: 'content', status: labelsWithoutImage ? 'todo' : 'ok', count: labelsWithoutImage, link: '/admin/water-labels' },
    { id: 'sampleJobs', group: 'content', status: sampleJobs ? 'todo' : 'ok', count: sampleJobs, link: '/admin/jobs' },
    { id: 'teamPhotos', group: 'content', status: teamWithoutPhoto ? 'todo' : 'ok', count: teamWithoutPhoto, link: '/admin/team' },
    { id: 'teamPlaceholders', group: 'content', status: teamPlaceholders ? 'todo' : 'ok', count: teamPlaceholders, link: '/admin/team' },
    { id: 'leaderMessages', group: 'content', status: leaderMessages.length >= 2 && leaderMessages.every((m) => m.messageAr && m.messageEn) ? 'ok' : 'todo', link: '/admin/team' },
    { id: 'logo', group: 'content', status: company?.logoLightUrl ? 'ok' : 'warn', link: '/admin/company' },
    { id: 'mapEmbed', group: 'content', status: company?.mapEmbedUrl ? 'ok' : 'todo', link: '/admin/company' },

    { id: 'emailServer', group: 'notifications', status: emailConfigured() ? 'ok' : 'todo' },
    { id: 'emailRecipients', group: 'notifications', status: notifications.email.enabled && recipients ? 'ok' : 'todo', count: recipients, link: '/admin/notification-settings' },
    { id: 'whatsappAlerts', group: 'notifications', status: whatsappConfigured() && notifications.whatsapp.enabled && notifications.whatsapp.number ? 'ok' : 'todo', link: '/admin/notification-settings' },

    { id: 'captcha', group: 'security', status: captchaEnabled() ? 'ok' : 'todo' },
    { id: 'antivirus', group: 'security', status: antivirus },
    { id: 'twoFactorMine', group: 'security', status: me?.totpEnabledAt ? 'ok' : 'warn', link: '/admin/account' },
    { id: 'twoFactorAdmins', group: 'security', status: adminsWithout ? 'todo' : 'ok', count: adminsWithout, link: '/admin/users' },
    { id: 'databaseUser', group: 'security', status: superuser[0]?.rolsuper ? (isProduction ? 'warn' : 'todo') : 'ok' },
    { id: 'production', group: 'security', status: isProduction ? 'ok' : 'todo' },

    { id: 'backups', group: 'operations', status: daysSinceBackup === null ? 'todo' : daysSinceBackup > 2 ? 'warn' : 'ok' },
    { id: 'analytics', group: 'operations', status: env.ANALYTICS_PROVIDER ? 'ok' : 'todo' },
    { id: 'searchConsole', group: 'operations', status: env.GOOGLE_SITE_VERIFICATION ? 'ok' : 'todo' },
  ];
  return items;
}
