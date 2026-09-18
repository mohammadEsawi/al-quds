import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';

/** Liveness: the process is up. Does not touch the database. */
export const liveness: RequestHandler = (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
};

/** Readiness: the process is up and PostgreSQL answers. */
export const readiness: RequestHandler = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
};
