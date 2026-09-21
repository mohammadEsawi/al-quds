import type { RequestHandler } from 'express';
import { recordAudit } from '../services/audit.service.js';

/** Reads that expose personal data (an application, a message, a CV file) are logged like writes are. */
const SENSITIVE_READ = /^\/(applications|messages)\/[^/]+(\/cv)?$/;

/**
 * Records every successful change made in the dashboard, and every view of personal data, with who did it.
 * Bodies are never stored. Mounted after `requireAuth` on the admin router.
 */
export const auditAdmin: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const path = (req.originalUrl.split('?')[0] ?? '').replace(/^\/api\/admin/, '');
    const isRead = req.method === 'GET' || req.method === 'HEAD';
    if (isRead && !SENSITIVE_READ.test(path)) return;

    const [, resource, id, sub] = path.split('/');
    void recordAudit({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      action: `${isRead ? 'view' : req.method.toLowerCase()} ${resource ?? ''}${sub ? `/${sub}` : ''}`.trim(),
      targetId: id,
      status: res.statusCode,
      ip: req.ip,
    });
  });
  next();
};
