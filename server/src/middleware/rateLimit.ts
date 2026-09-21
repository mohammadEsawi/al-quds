import { rateLimit } from 'express-rate-limit';
import { verifyMfaToken } from '../lib/jwt.js';

const limitMessage = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
};

/**
 * Baseline limiter for the public API. Generous on purpose: many visitors share one IP
 * (mobile carriers, offices) and every page view makes several API calls.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
  skip: (req) => req.path.startsWith('/admin'),
});

/** The dashboard polls and navigates a lot; it is protected by authentication and the login limiter. */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 4000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
});

/** Strict limiter for login attempts; successful logins do not count. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
});

/** Per-account limiter: stops a botnet from guessing one account's password from many IPs. */
export const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => `email:${String((req.body as { email?: unknown } | undefined)?.email ?? '').trim().toLowerCase()}`,
});

/** Guessing the current password through "change password" is limited per signed-in user. */
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => `user:${req.user?.id ?? ''}`,
});

/** The 6-digit code step: few tries per account (the token identifies it) and per address. */
export const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const sub = verifyMfaToken(String((req.body as { mfaToken?: unknown } | undefined)?.mfaToken ?? ''));
    return sub ? `mfa:${sub}` : `ip:${req.ip ?? ''}`;
  },
});

/** For public form submissions (contact, job applications). */
export const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
});
