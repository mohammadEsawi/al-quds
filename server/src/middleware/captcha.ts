import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export const captchaEnabled = () => Boolean(env.TURNSTILE_SECRET);

/** Asks Cloudflare whether a Turnstile token is valid. Throws when Cloudflare cannot be reached. */
export async function verifyTurnstile(token: string, ip: string | undefined): Promise<boolean> {
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET ?? '', response: token });
  if (ip) body.set('remoteip', ip);
  const response = await fetch(env.TURNSTILE_VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`Turnstile answered ${response.status}`);
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

/**
 * Public forms are protected by Cloudflare Turnstile when TURNSTILE_SECRET is set (otherwise this is a no-op).
 * The token travels in the `x-captcha-token` header, so it is checked before any body or file is read.
 * If Cloudflare is unreachable the form is refused (fail closed) rather than left open to bots.
 */
export const requireCaptcha: RequestHandler = async (req, _res, next) => {
  if (!captchaEnabled()) return next();

  const token = req.headers['x-captcha-token'];
  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw AppError.badRequest('Please complete the verification', 'CAPTCHA_REQUIRED');
  }

  let valid: boolean;
  try {
    valid = await verifyTurnstile(token, req.ip);
  } catch (error) {
    console.warn('Turnstile verification failed:', error instanceof Error ? error.message : error);
    throw new AppError(503, 'CAPTCHA_UNAVAILABLE', 'The verification service is not reachable, please try again');
  }
  if (!valid) throw AppError.badRequest('Verification failed, please try again', 'CAPTCHA_FAILED');
  next();
};
