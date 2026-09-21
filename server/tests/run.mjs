// Runs every API test suite against a throwaway PostgreSQL database and a freshly started API.
//
//   TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/lamico_test" npm run test:api -w server
//   npm run test:api -w server -- 05        (only the suites whose file name contains "05")
//
// The database is EMPTIED before every suite, so the name must contain "test" — the runner refuses anything else.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const serverDir = path.resolve(import.meta.dirname, '..');
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error('Set TEST_DATABASE_URL to an empty PostgreSQL database whose name contains "test" (it will be wiped).');
  process.exit(2);
}
const dbName = decodeURIComponent(new URL(url).pathname.slice(1));
if (!/test/i.test(dbName)) {
  console.error(`Refusing to run: the database "${dbName}" does not look like a test database (its name must contain "test").`);
  process.exit(2);
}

const PORT = Number(process.env.TEST_PORT ?? 4001);
const BASE = `http://localhost:${PORT}`;
const only = process.argv[2];

const fakeServices = {
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '2525',
  MAIL_FROM: 'Lamico <no-reply@lamico.test>',
  WHATSAPP_TOKEN: 'wa-token',
  WHATSAPP_PHONE_ID: '12345',
  WHATSAPP_API_URL: 'http://127.0.0.1:4010/graph',
  TURNSTILE_SITE_KEY: 'site-key',
  TURNSTILE_SECRET: 'test-secret',
  TURNSTILE_VERIFY_URL: 'http://127.0.0.1:4010/turnstile',
  CLAMAV_HOST: '127.0.0.1',
  CLAMAV_PORT: '3311',
  ANALYTICS_PROVIDER: 'plausible',
  ANALYTICS_DOMAIN: 'lamico.test',
  GOOGLE_SITE_VERIFICATION: 'gv-token',
  TRUST_PROXY: 'true',
};

const suites = [
  { file: '01-api.test.mjs', title: 'Public + admin API' },
  { file: '02-hardening.test.mjs', title: 'Sessions, CSRF, password rules' },
  { file: '03-security-probes.test.mjs', title: 'Security probes (auth, uploads, injection, headers)' },
  { file: '04-fixes.test.mjs', title: 'Audit fixes (quotas, EXIF, NUL, logout, audit log)' },
  { file: '05-features.test.mjs', title: 'Alerts, quotes, CAPTCHA, antivirus, two-factor', env: fakeServices },
  { file: '06-production-mode.test.mjs', title: 'Production mode (Secure cookie, origins)', env: { NODE_ENV: 'production', CLIENT_URL: 'https://lamico.test', TRUST_PROXY: 'true' }, testEnv: { TEST_ORIGIN: 'https://lamico.test' } },
  { file: '07-require-2fa.test.mjs', title: 'REQUIRE_2FA=true', env: { REQUIRE_2FA: 'true' } },
  { file: '08-team.test.mjs', title: 'Board, executive management and the About page content' },
].filter((s) => !only || s.file.includes(only));

const baseEnv = {
  ...process.env,
  DATABASE_URL: url,
  MIGRATE_DATABASE_URL: url,
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  NODE_ENV: 'development',
  PORT: String(PORT),
  CLIENT_URL: 'http://localhost:5173',
  ADMIN_EMAIL: 'admin@lamico.test',
  ADMIN_PASSWORD: 'TestPassword-12345',
  ADMIN_NAME: 'Saad Esawi',
  TEST_API_URL: BASE,
  // Never read server/.env: the tests define every setting themselves.
  DOTENV_CONFIG_PATH: path.join(os.tmpdir(), 'lamico-tests-no-such.env'),
};
// A developer's own settings must never leak into the tests.
for (const key of Object.keys(baseEnv)) if (/^(SMTP_|MAIL_|WHATSAPP_|TURNSTILE_|CLAMAV_|ANALYTICS_|GOOGLE_|REQUIRE_2FA|DATA_ENCRYPTION_KEY|TRUST_PROXY|SITE_URL|ALLOWED_ORIGINS)/.test(key)) delete baseEnv[key];

const node = process.execPath;
const runSync = (args, env, label) => {
  const result = spawnSync(node, args, { cwd: serverDir, env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${label} failed:\n${(result.stdout + result.stderr).slice(-1500)}`);
};

async function resetDatabase() {
  const client = new pg.Client({ connectionString: url.replace(/[?&]schema=[^&]*/, '') });
  await client.connect();
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
  if (rows.length) await client.query(`TRUNCATE TABLE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await client.end();
}

async function waitForApi(child, ms = 20_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error('The API stopped while starting');
    try {
      const res = await fetch(`${BASE}/api/health/ready`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('The API did not become ready');
}

const runSuite = (file, env) =>
  new Promise((resolve) => {
    const child = spawn(node, ['--import', 'tsx', path.join('tests', 'suites', file)], { cwd: serverDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });

console.log(`Test database "${dbName}" · API on ${BASE}\n`);
const prismaCli = ['../node_modules/prisma/build/index.js', 'node_modules/prisma/build/index.js'].map((p) => path.join(serverDir, p)).find((p) => fs.existsSync(p));
if (!prismaCli) throw new Error('Prisma CLI not found — run "npm install" first');
runSync([prismaCli, 'migrate', 'deploy'], baseEnv, 'Applying migrations');

const results = [];
for (const suite of suites) {
  process.stdout.write(`▶ ${suite.title} … `);
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-test-uploads-'));
  const apiEnv = { ...baseEnv, UPLOAD_DIR: uploads, ...suite.env };
  let api;
  let apiLog = '';
  try {
    await resetDatabase();
    runSync(['--import', 'tsx', 'prisma/seed.ts'], apiEnv, 'Seeding');
    api = spawn(node, ['--import', 'tsx', 'src/server.ts'], { cwd: serverDir, env: apiEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    api.stdout.on('data', (d) => (apiLog += d));
    api.stderr.on('data', (d) => (apiLog += d));
    await waitForApi(api);
    const { code, out } = await runSuite(suite.file, { ...baseEnv, ...suite.testEnv });
    const summary = out.split('\n').reverse().find((l) => /^(ALL PASSED|FAILED|FAILURES)/.test(l)) ?? '(no summary)';
    results.push({ suite, ok: code === 0, summary });
    console.log(code === 0 ? `✓ ${summary}` : `✗ ${summary}`);
    if (code !== 0) console.log(out.split('\n').filter((l) => /^(✗|FAIL| - )/.test(l) || /\bFAILED\b/.test(l)).slice(0, 25).join('\n') + '\n');
    if (process.env.TEST_VERBOSE) console.log(out);
  } catch (error) {
    results.push({ suite, ok: false, summary: String(error.message).slice(0, 300) });
    console.log(`✗ ${error.message}`);
    if (apiLog) console.log(apiLog.split('\n').slice(-12).join('\n'));
  } finally {
    api?.kill();
    fs.rmSync(uploads, { recursive: true, force: true });
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? `${failed.length} suite(s) FAILED` : 'All suites passed'} (${results.length - failed.length}/${results.length})`);
process.exit(failed.length ? 1 : 0);
