import { AppError } from './errors.js';

const tooMany = () => new AppError(429, 'TOO_MANY_SUBMISSIONS', 'Too many submissions, please try again later');

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/**
 * Limits that do not depend on the visitor's IP address (bots rotate those): how many submissions one
 * email address may send per day, and a ceiling for the whole site per hour so a flood cannot fill the
 * disk or the dashboard. The per-IP limiter still applies on top.
 */
export async function enforceSubmissionQuota(counts: { forEmailToday: () => Promise<number>; siteThisHour: () => Promise<number> }, limits: { perEmailPerDay: number; siteWidePerHour: number }) {
  const [email, site] = await Promise.all([counts.forEmailToday(), counts.siteThisHour()]);
  if (email >= limits.perEmailPerDay || site >= limits.siteWidePerHour) throw tooMany();
}
