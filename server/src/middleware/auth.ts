import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import type { UserRole } from '../generated/prisma/client.js';

export const AUTH_COOKIE = 'lamico_token';

function extractToken(cookies: Record<string, unknown> | undefined, header?: string): string | null {
  const fromCookie = cookies?.[AUTH_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie) return fromCookie;

  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim() || null;
  return null;
}

/** Requires a valid session; loads the user fresh so deactivation takes effect immediately. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = extractToken(req.cookies, req.headers.authorization);
  const payload = token ? verifyToken(token) : null;
  if (!payload) throw AppError.unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordChangedAt: true },
  });
  if (!user || !user.isActive) throw AppError.unauthorized();
  // A password change signs out every session that was created before it.
  if (user.passwordChangedAt && (payload.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw AppError.unauthorized();
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
};

/** Must run after `requireAuth`. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}
