import { env } from './config/env.js';
import { createApp } from './app.js';
import { getDatabaseEncoding, UTF8_HELP } from './lib/dbcheck.js';
import { prisma } from './lib/prisma.js';
import { pruneOldRecords } from './services/audit.service.js';

// A copied-but-not-edited .env is the most common first-run mistake, so say so plainly.
if (env.DATABASE_URL.includes('USER:PASSWORD')) {
  console.warn('DATABASE_URL in server/.env still has the USER:PASSWORD placeholder — put your real PostgreSQL user and password there.');
}

if (env.NODE_ENV !== 'production' && env.CLIENT_URL.startsWith('https://')) {
  console.warn('CLIENT_URL is https but NODE_ENV is not "production": login cookies will NOT be marked Secure. Set NODE_ENV=production.');
}

// Arabic content needs a UTF8 database; fail early with instructions instead of on the first insert.
const encoding = await getDatabaseEncoding();
if (encoding && encoding !== 'UTF8') {
  console.error(`Database encoding is ${encoding}.${UTF8_HELP}`);
  process.exit(1);
}
if (!encoding) console.warn('Could not reach the database yet — the API will start, but /api/health/ready reports "down".');

const app = createApp();

void pruneOldRecords();
setInterval(() => void pruneOldRecords(), 24 * 60 * 60 * 1000).unref();

const server = app.listen(env.PORT, () => {
  console.log(`Lamico API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
