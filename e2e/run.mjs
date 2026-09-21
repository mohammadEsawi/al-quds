// Browser tests: builds the site, starts the API on a throwaway database, serves the production build with its
// real security headers, drives a headless Chrome through it and reports.
//
//   TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/lamico_test" npm run test:e2e
//   npm run test:e2e -- features        (only scripts whose name contains "features")
//
// Needs Google Chrome or Chromium (set CHROME_PATH if it is not found). The database is wiped before every script.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(import.meta.dirname, '..');
const serverDir = path.join(root, 'server');
const clientDir = path.join(root, 'client');
const url = process.env.TEST_DATABASE_URL;
if (!url || !/test/i.test(decodeURIComponent(new URL(url).pathname.slice(1)))) {
  console.error('Set TEST_DATABASE_URL to an empty PostgreSQL database whose name contains "test" (it will be wiped).');
  process.exit(2);
}

const API_PORT = 4001;
const SITE_PORT = 4173;
const only = process.argv[2];
const scripts = [
  { file: 'admin.e2e.mjs', title: 'Dashboard (46 checks)' },
  { file: 'features.e2e.mjs', title: 'Quotes, alerts, checklist, two-factor screens' },
  { file: 'about.e2e.mjs', title: 'About tabs, board, executives, photo upload' },
  { file: 'csp.e2e.mjs', title: 'Every public page under the production CSP' },
  { file: 'mobile.e2e.mjs', title: 'Phones and tablets (overflow, tap targets, menu)' },
].filter((s) => !only || s.file.includes(only));

const node = process.execPath;
const env = {
  ...process.env,
  DATABASE_URL: url,
  MIGRATE_DATABASE_URL: url,
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  NODE_ENV: 'development',
  PORT: String(API_PORT),
  CLIENT_URL: `http://localhost:${SITE_PORT}`,
  ADMIN_EMAIL: 'admin@lamico.test',
  ADMIN_PASSWORD: 'TestPassword-12345',
  DOTENV_CONFIG_PATH: path.join(os.tmpdir(), 'lamico-tests-no-such.env'),
  E2E_SITE: `http://localhost:${SITE_PORT}`,
  E2E_API: `http://localhost:${API_PORT}`,
  API_URL: `http://localhost:${API_PORT}`,
};
for (const key of Object.keys(env)) if (/^(SMTP_|MAIL_|WHATSAPP_|TURNSTILE_|CLAMAV_|ANALYTICS_|GOOGLE_|REQUIRE_2FA|TRUST_PROXY)/.test(key)) delete env[key];

const sync = (cwd, args, label) => {
  const r = spawnSync(node, args, { cwd, env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${label} failed:\n${(r.stdout + r.stderr).slice(-1500)}`);
};
const waitFor = async (check, ms, what) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if (await check()) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${what} did not start`);
};

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH.');
  return found;
}

async function resetDatabase() {
  const client = new pg.Client({ connectionString: url.replace(/[?&]schema=[^&]*/, '') });
  await client.connect();
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
  if (rows.length) await client.query(`TRUNCATE TABLE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await client.end();
}

const children = [];
const start = (cmd, args, options) => {
  const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  child.output = '';
  child.stdout.on('data', (d) => (child.output += d));
  child.stderr.on('data', (d) => (child.output += d));
  children.push(child);
  return child;
};
const cleanup = () => children.forEach((c) => c.kill());
process.on('exit', cleanup);

let exitCode = 0;
try {
  const prismaCli = ['node_modules/prisma/build/index.js', 'server/node_modules/prisma/build/index.js'].map((p) => path.join(root, p)).find((p) => fs.existsSync(p));
  console.log('Building the site…');
  const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build', '-w', 'client'], { cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32' });
  if (build.status !== 0) throw new Error(`Build failed:\n${(build.stdout + build.stderr).slice(-1200)}`);
  sync(serverDir, [prismaCli, 'migrate', 'deploy'], 'Migrations');

  const preview = start(node, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(SITE_PORT), '--strictPort'], { cwd: clientDir });
  await waitFor(async () => (await fetch(env.E2E_SITE)).ok, 20_000, 'The site preview');

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-chrome-'));
  const chrome = start(findChrome(), ['--headless=new', '--remote-debugging-port=9222', `--user-data-dir=${profile}`, '--no-first-run', '--no-sandbox', '--disable-gpu', 'about:blank']);
  await waitFor(async () => (await fetch('http://127.0.0.1:9222/json/version')).ok, 20_000, 'Chrome');

  for (const script of scripts) {
    process.stdout.write(`▶ ${script.title} … `);
    await resetDatabase();
    sync(serverDir, ['--import', 'tsx', 'prisma/seed.ts'], 'Seeding');
    const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'lamico-e2e-uploads-'));
    const api = start(node, ['--import', 'tsx', 'src/server.ts'], { cwd: serverDir, env: { ...env, UPLOAD_DIR: uploads } });
    try {
      await waitFor(async () => (await fetch(`${env.E2E_API}/api/health/ready`)).ok, 20_000, 'The API');
      const run = spawn(node, ['--import', 'tsx', path.join(root, 'e2e', script.file)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      run.stdout.on('data', (d) => (out += d));
      run.stderr.on('data', (d) => (out += d));
      const code = await new Promise((resolve) => run.on('close', resolve));
      const summary = out.split('\n').reverse().find((l) => /^(ALL PASSED|FAILED|All |\d+ )/.test(l)) ?? '(no summary)';
      console.log(code === 0 ? `✓ ${summary}` : `✗ ${summary}`);
      if (code !== 0) {
        exitCode = 1;
        console.log(out.split('\n').filter((l) => /^(✗| - )/.test(l)).slice(0, 30).join('\n'));
      }
      if (process.env.TEST_VERBOSE) console.log(out);
    } finally {
      api.kill();
      fs.rmSync(uploads, { recursive: true, force: true });
    }
  }
  chrome.kill();
  await new Promise((r) => setTimeout(r, 800));
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
  } catch {
    /* Chrome may still hold a file; the OS temp folder is cleaned up later */
  }
} catch (error) {
  console.error(`\n✗ ${error.message}`);
  exitCode = 1;
} finally {
  cleanup();
}
process.exit(exitCode);
