import { rateLimit } from 'express-rate-limit';

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

/** For public form submissions (contact, job applications). */
export const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
});
