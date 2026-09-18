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
