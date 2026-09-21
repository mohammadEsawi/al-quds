import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_HOURS: z.coerce.number().positive().default(8),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  /** Public address of the website (sitemap, robots.txt). Defaults to CLIENT_URL. */
  SITE_URL: z.string().url().optional(),
  /** How long dashboard activity is kept. */
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(365),
  /** Extra browser origins allowed to call the API with cookies (comma separated), besides CLIENT_URL. */
  ALLOWED_ORIGINS: z.string().optional(),
  TRUST_PROXY: booleanString,
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  /** Images and other media in the library. */
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  MAX_VIDEO_MB: z.coerce.number().positive().default(50),
  /** CV uploads on job applications. The website shows the same limit. */
  MAX_CV_MB: z.coerce.number().positive().default(5),
  /** Prefix added to local phone numbers (0597...) when building WhatsApp links. */
  DEFAULT_COUNTRY_CODE: z.string().regex(/^\d{1,4}$/).default('970'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().default('Lamico Admin'),

  // ── Email notifications (optional): new applications, messages and quote requests are mailed to the recipients set in the dashboard.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** true for port 465 (implicit TLS); false uses STARTTLS. */
  SMTP_SECURE: booleanString,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  // ── WhatsApp Cloud API (optional): a short alert to the number set in the dashboard.
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),
  /** Approved message template (needed to message a number that has not written to you in the last 24 h). */
  WHATSAPP_TEMPLATE: z.string().optional(),
  WHATSAPP_TEMPLATE_LANG: z.string().default('ar'),
  WHATSAPP_API_URL: z.string().url().default('https://graph.facebook.com/v21.0'),

  // ── CAPTCHA (optional): Cloudflare Turnstile on the public forms.
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),
  TURNSTILE_VERIFY_URL: z.string().url().default('https://challenges.cloudflare.com/turnstile/v0/siteverify'),

  // ── Antivirus (optional): a ClamAV daemon (clamd) that scans every uploaded CV.
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  /** true: refuse uploads while the scanner is unreachable. false: accept them and log a warning. */
  CLAMAV_REQUIRED: booleanString,

  // ── Two-factor login
  /** 32 bytes as hex or base64; encrypts the authenticator secrets in the database. Defaults to a key derived from JWT_SECRET. */
  DATA_ENCRYPTION_KEY: z.string().optional(),
  /** true: admins and super admins must set up two-factor login before using the dashboard. */
  REQUIRE_2FA: booleanString,

  // ── Visitor statistics and search engines (optional)
  ANALYTICS_PROVIDER: z.enum(['plausible', 'umami']).optional(),
  /** Plausible: your site's domain. */
  ANALYTICS_DOMAIN: z.string().optional(),
  /** Umami: the website id. */
  ANALYTICS_WEBSITE_ID: z.string().optional(),
  /** Script address; defaults to the hosted Plausible / Umami cloud script. */
  ANALYTICS_SCRIPT_URL: z.string().url().optional(),
  /** Google Search Console "HTML tag" verification code. */
  GOOGLE_SITE_VERIFICATION: z.string().optional(),

  // ── Backups (npm run backup)
  BACKUP_DIR: z.string().default('backups'),
  BACKUP_KEEP: z.coerce.number().int().min(1).max(365).default(14),
  /** When set, backups are encrypted with this passphrase (AES-256-GCM). Keep it somewhere else than the server. */
  BACKUP_PASSPHRASE: z.string().optional(),
  /** Folder that contains pg_dump / pg_restore, if they are not on the PATH. */
  PG_BIN_DIR: z.string().optional(),
});

// `KEY=` lines left blank in .env should behave like unset variables.
const raw = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  // Log only the variable names and messages, never the values.
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
