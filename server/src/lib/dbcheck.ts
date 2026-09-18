import { prisma } from './prisma.js';

export const UTF8_HELP = `
The database encoding is not UTF8, so Arabic text cannot be stored.
Recreate the database with UTF8 (Postgres on Windows often defaults to WIN1252):

  CREATE DATABASE lamico WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C';

Then run "npm run db:migrate" and "npm run db:seed" again.`;

/** Returns the current database's encoding (e.g. "UTF8"), or null when the database is unreachable. */
export async function getDatabaseEncoding(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ encoding: string }[]>`
      SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = current_database()`;
    return rows[0]?.encoding ?? null;
  } catch {
    return null;
  }
}

/** Throws with instructions when the database cannot hold Arabic content. Unreachable databases pass (other errors surface later). */
export async function assertUtf8Database(): Promise<void> {
  const encoding = await getDatabaseEncoding();
  if (encoding && encoding !== 'UTF8') throw new Error(`Database encoding is ${encoding}.${UTF8_HELP}`);
}
