import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const normalise = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
};

/** Browser origins that may call the API with the login cookie. */
export const allowedOrigins = [env.CLIENT_URL, ...(env.ALLOWED_ORIGINS?.split(',') ?? [])]
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalise);

/**
 * Defence in depth against CSRF for the cookie-authenticated API (SameSite=Lax is the first layer):
 * a state-changing request coming from a page on another origin is refused.
 * Non-browser clients (no Origin header) are unaffected.
 */
export const originGuard: RequestHandler = (req, _res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(normalise(origin))) {
    throw AppError.forbidden('Cross-origin request blocked', 'CROSS_ORIGIN');
  }
  if (!origin && req.headers['sec-fetch-site'] === 'cross-site') {
    throw AppError.forbidden('Cross-origin request blocked', 'CROSS_ORIGIN');
  }
  next();
};

/** Private responses (admin data, sessions) must never be stored by browsers or proxies. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

/** Browser features this site never needs are switched off (helmet does not send this header). */
export const permissionsPolicy: RequestHandler = (_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  next();
};

/** `%00` in a URL can only be an attack or a bug and PostgreSQL cannot store it. */
export const rejectNulInUrl: RequestHandler = (req, _res, next) => {
  if (/%00/i.test(req.url)) throw AppError.badRequest('Invalid characters in request', 'INVALID_CHARACTERS');
  next();
};
