import type { Request } from 'express';
import { env } from '../config/env.js';
import { pageArgs, type Page } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetId?: string | null;
  status?: number;
  ip?: string | null;
  detail?: string | null;
}

/** Writes one audit row. Never throws: a logging problem must not break the request it describes. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail?.slice(0, 254) ?? null,
        action: entry.action.slice(0, 120),
        targetId: entry.targetId?.slice(0, 64) ?? null,
        status: entry.status ?? null,
        ip: entry.ip?.slice(0, 64) ?? null,
        detail: entry.detail?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.warn('Audit log write failed:', error instanceof Error ? error.message : error);
  }
}

/** Audit entry for the request's signed-in user (or an explicit actor, e.g. a login attempt). */
export const auditRequest = (req: Request, entry: Omit<AuditEntry, 'ip'>) =>
  recordAudit({ actorId: req.user?.id, actorEmail: req.user?.email, ip: req.ip, ...entry });

export async function listAudit(query: { page: number; pageSize: number; q?: string }) {
  const where = query.q
    ? { OR: [{ action: { contains: query.q, mode: 'insensitive' as const } }, { actorEmail: { contains: query.q, mode: 'insensitive' as const } }] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
    prisma.auditLog.count({ where }),
  ]);
  const page: Page<(typeof rows)[number]> = { items: rows, total, page: query.page, pageSize: query.pageSize };
  return page;
}

/** Housekeeping: old audit rows and expired revocation entries. Runs at start-up and once a day. */
export async function pruneOldRecords(): Promise<void> {
  try {
    await prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - env.AUDIT_RETENTION_DAYS * 86_400_000) } } });
    await prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch (error) {
    console.warn('Housekeeping failed:', error instanceof Error ? error.message : error);
  }
}
