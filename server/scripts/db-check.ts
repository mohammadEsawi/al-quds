/**
 * Read-only health check of the configured PostgreSQL database:  npm run db:check
 * Never writes, never prints passwords or hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/prisma.js';

const ok = (m: string) => console.log(`  ✓ ${m}`);
const warn = (m: string) => console.log(`  ! ${m}`);
const bad = (m: string) => console.log(`  ✗ ${m}`);

async function main() {
  console.log('Connection');
  const [info] = await prisma.$queryRaw<
    { version: string; user: string; db: string; encoding: string; collate: string; is_super: boolean; ssl: boolean | null }[]
  >`SELECT version() AS version, current_user AS user, current_database() AS db,
           pg_encoding_to_char(d.encoding) AS encoding, d.datcollate AS collate,
           (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_super,
           (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl
    FROM pg_database d WHERE d.datname = current_database()`;
  if (!info) throw new Error('Could not read database information');
  ok(`${info.version.split(',')[0]}`);
  ok(`database "${info.db}" as user "${info.user}"`);

  console.log('\nEncoding');
  if (info.encoding === 'UTF8') ok('UTF8 — Arabic text is safe');
  else bad(`${info.encoding} — Arabic content will be rejected. Recreate the database with ENCODING 'UTF8'.`);

  console.log('\nAccess');
  if (info.is_super) warn(`"${info.user}" is a PostgreSQL superuser. Create a dedicated user for the app (see README → "Database user").`);
  else ok(`"${info.user}" is not a superuser`);
  if (info.ssl === false) warn('The connection is not encrypted (fine on localhost; required if the database is on another machine).');

  console.log('\nMigrations');
  const dir = path.join(import.meta.dirname, '..', 'prisma', 'migrations');
  const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort() : [];
  let applied: { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[] = [];
  try {
    applied = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;
  } catch {
    bad('No _prisma_migrations table — run "npm run db:migrate".');
  }
  const done = new Set(applied.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name));
  for (const name of onDisk) (done.has(name) ? ok : bad)(done.has(name) ? name : `${name} — NOT applied (run "npm run db:migrate")`);
  for (const m of applied) if (!onDisk.includes(m.migration_name)) warn(`${m.migration_name} is applied but missing from prisma/migrations`);

  console.log('\nData');
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations' ORDER BY table_name`;
  if (!tables.length) {
    warn('No application tables yet.');
  } else {
    const counts: Record<string, number> = {
      Sector: await prisma.sector.count(),
      Product: await prisma.product.count(),
      WaterLabel: await prisma.waterLabel.count(),
      RealEstateProject: await prisma.realEstateProject.count(),
      Job: await prisma.job.count(),
      JobApplication: await prisma.jobApplication.count(),
      ContactMessage: await prisma.contactMessage.count(),
      Media: await prisma.media.count(),
      CompanyInfo: await prisma.companyInfo.count(),
      WhatsAppSetting: await prisma.whatsAppSetting.count(),
      SiteSetting: await prisma.siteSetting.count(),
    };
    console.log('  ' + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  '));
    if (!counts['Product'] || !counts['CompanyInfo']) warn('Content is missing — run "npm run db:seed".');
    else ok('Website content is loaded');
  }

  console.log('\nUsers');
  const users = await prisma.user.findMany({ select: { email: true, role: true, isActive: true, lastLoginAt: true } });
  if (!users.length) bad('No users — run "npm run db:seed" (needs ADMIN_EMAIL / ADMIN_PASSWORD in server/.env).');
  for (const u of users) console.log(`  • ${u.email}  ${u.role}  ${u.isActive ? 'active' : 'DISABLED'}  last login: ${u.lastLoginAt?.toISOString().slice(0, 16) ?? 'never'}`);
  if (users.filter((u) => u.role === 'SUPER_ADMIN' && u.isActive).length === 0 && users.length) bad('No active SUPER_ADMIN.');
}

main()
  .catch((e) => {
    console.error(`\n✗ ${e instanceof Error ? e.message.split('\n').slice(-3).join(' ').slice(0, 300) : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
