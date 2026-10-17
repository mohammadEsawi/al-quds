import crypto from 'node:crypto';
import * as geoip from 'geoip-country';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

/**
 * A same-day, one-way fingerprint: the same visitor gets the same value only within one calendar
 * day (UTC), because the day is baked into the hash. Nothing here can be reversed back to an IP
 * address or a person, and it cannot be used to follow one visitor from one day to the next — this
 * is why the site does not need a cookie-consent banner for it (no cookie, no IP, no persistent id).
 */
function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${env.JWT_SECRET}|${day}|${ip}|${userAgent}`).digest('hex');
}

/** ISO 3166-1 alpha-2 country code, or null for local/private addresses and ranges the database does not cover. */
function countryOf(ip: string): string | null {
  try {
    return geoip.lookup(ip)?.country ?? null;
  } catch {
    return null;
  }
}

const MAX_PATH_LENGTH = 300;

/** Records one page view. Never stores the IP address itself — only its country and the rotating hash above. */
export async function recordPageView(path: string, ip: string, userAgent: string): Promise<void> {
  await prisma.pageView.create({
    data: {
      path: path.slice(0, MAX_PATH_LENGTH),
      country: countryOf(ip),
      visitorHash: visitorHash(ip, userAgent),
    },
  });
}

export interface VisitStats {
  days: number;
  totalViews: number;
  uniqueVisitors: number;
  daily: { date: string; views: number; visitors: number }[];
  topCountries: { country: string; visitors: number }[];
  topPages: { path: string; views: number }[];
}

/** Aggregates the last `days` of page views for the dashboard. Computed on read — no rollup table to keep in sync. */
export async function getVisitStats(days: number): Promise<VisitStats> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.pageView.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, country: true, visitorHash: true, path: true },
  });

  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  const byCountry = new Map<string, Set<string>>();
  const byPath = new Map<string, number>();

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(day) ?? { views: 0, visitors: new Set<string>() };
    bucket.views += 1;
    bucket.visitors.add(row.visitorHash);
    byDay.set(day, bucket);

    if (row.country) {
      const set = byCountry.get(row.country) ?? new Set<string>();
      set.add(row.visitorHash);
      byCountry.set(row.country, set);
    }

    byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
  }

  return {
    days,
    totalViews: rows.length,
    uniqueVisitors: new Set(rows.map((row) => row.visitorHash)).size,
    daily: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({ date, views: bucket.views, visitors: bucket.visitors.size })),
    topCountries: [...byCountry.entries()]
      .map(([country, visitors]) => ({ country, visitors: visitors.size }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 12),
    topPages: [...byPath.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
  };
}

/** Deletes page views older than `PAGEVIEW_RETENTION_DAYS` (called from the daily housekeeping job). */
export async function prunePageViews(): Promise<void> {
  try {
    await prisma.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - env.PAGEVIEW_RETENTION_DAYS * 86_400_000) } } });
  } catch (error) {
    // Most likely the "page_views" migration has not been applied yet — never crash the server for this.
    console.warn('Page-view housekeeping failed:', error instanceof Error ? error.message : error);
  }
}
