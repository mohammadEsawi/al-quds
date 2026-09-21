# Lamico Investment Company — Platform

Bilingual (Arabic RTL / English LTR) corporate website + admin platform for **شركة لاميكو الاستثمارية**.

| Layer    | Stack                                                                    |
| -------- | ------------------------------------------------------------------------ |
| Client   | React 19, Vite, TypeScript (strict), Tailwind CSS 4, GSAP, Framer Motion |
| Server   | Node.js, Express 5, TypeScript, Prisma 7, JWT (httpOnly cookie), argon2  |
| Database | PostgreSQL                                                               |

```
client/   React SPA — public site (done, design phase) + /admin (later phase)
server/   REST API — auth is done; content endpoints arrive with the database
```

## Run

```bash
npm install
npm run dev          # API :4000 + client :5173 (the client proxies /api)
npm run typecheck
npm run build
```

## Database setup (first time)

1. **The database must be UTF8** (Arabic content). PostgreSQL on Windows often defaults to `WIN1252`:
   ```sql
   CREATE DATABASE lamico WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C';
   ```
2. Edit `server/.env`: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters). `JWT_SECRET` is already generated.
3. ```bash
   npm run db:migrate   # creates the tables
   npm run db:seed      # creates the admin + loads all website content (safe to re-run)
   npm run dev
   ```
The server refuses to start (and the seed refuses to run) if the database is not UTF8, and tells you how to fix it.

`npm run db:check` inspects the configured database (read-only): encoding, applied migrations, row counts, users, and warnings.

### Database user (do this before going live)

The `postgres` superuser is fine for a first local run, but the website itself should never connect as a superuser: a single SQL bug would then mean full control of the server. Create a dedicated user that owns only the `lamico` database (run as `postgres`, replace the password with a long random one):

```sql
CREATE ROLE lamico_app LOGIN PASSWORD 'CHANGE-ME-long-random' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE lamico OWNER TO lamico_app;
REVOKE ALL ON DATABASE lamico FROM PUBLIC;
GRANT CONNECT ON DATABASE lamico TO lamico_app;
\c lamico
ALTER SCHEMA public OWNER TO lamico_app;
```

Then point `DATABASE_URL` in `server/.env` at `lamico_app`. (Optionally keep a separate owner in `MIGRATE_DATABASE_URL` that only `npm run db:migrate` uses, and give the app user just `SELECT/INSERT/UPDATE/DELETE`.)

## Security notes

- **Sessions**: JWT in an `httpOnly` cookie (`Secure` when `NODE_ENV=production`, `SameSite=Lax`), 8 h lifetime, checked against the database on every request. Deactivating a user, changing a password, or **logging out** ends the session for real (tokens are revoked server-side).
- **Two-factor login** (authenticator app, recovery codes, replay-proof), optional `REQUIRE_2FA` for admins. **CAPTCHA** (Cloudflare Turnstile) on the public forms, **antivirus** (ClamAV) for uploads, alerts by email/WhatsApp — all optional, see [docs/OPERATIONS.md](docs/OPERATIONS.md).
- **Passwords**: argon2id, 12+ characters, common passwords ("password1234", keyboard runs, company names) are refused. Login is rate limited per IP *and* per account. Forgot the password? `npm run admin:reset-password -- someone@example.com` (typed at a hidden prompt; signs out every session of that user).
- **CSRF**: state-changing requests from a browser page on another origin are refused (`CLIENT_URL` + `ALLOWED_ORIGINS` are the only allowed origins).
- **Uploads**: identified by content (Word files must really be Word), size limited, never executed (`Content-Security-Policy: sandbox`), JPEG metadata (GPS/EXIF) removed, CVs are private and admin-only; optional ClamAV scan of every CV and media upload.
- **Spam control**: per-IP limits, plus per-email (3 applications / 5 messages a day) and site-wide hourly ceilings that do not depend on IP addresses.
- **Activity log**: every dashboard change and every view of an application, message or CV is recorded with who did it (Dashboard → سجل النشاط, super admin only). Request bodies are never stored. Kept `AUDIT_RETENTION_DAYS` (default 365).
- **Data exposure**: no password hashes or secrets in any response; public pages read only published content; `/sitemap.xml` and `/robots.txt` never list drafts or the dashboard.
- `npm audit` reports issues that come only through the **Prisma CLI** (`prisma` → `mysql2`). The CLI is a dev/deploy tool (`devDependencies`); the running API uses the PostgreSQL adapter and never loads it. The suggested "fix" is a breaking downgrade to Prisma 6, so it is intentionally not applied; update Prisma when a fixed 7.x is released.

## Production

```bash
npm ci
npm run build                      # server/dist + client/dist
npm run prisma:deploy -w server    # = prisma migrate deploy (NOT "migrate dev": it never resets or prompts)
NODE_ENV=production node server/dist/server.js
```

1. `server/.env`: `NODE_ENV=production`, `CLIENT_URL=https://your-domain`, `TRUST_PROXY=true` (behind nginx), a strong `JWT_SECRET`, the least-privilege `DATABASE_URL` from above, and **no `ADMIN_PASSWORD`**.
2. Serve `client/dist` and proxy `/api`, `/uploads/media`, `/robots.txt`, `/sitemap.xml` to the API from **one domain** — [deploy/nginx.conf](deploy/nginx.conf) is a working example with HTTPS, the security headers (CSP, HSTS, anti-framing) and `noindex` for `/admin`. The same headers are in [client/security-headers.ts](client/security-headers.ts); `npm run preview -w client` serves the production build with them so you can test locally.
3. Back up the database (`pg_dump`) and the `uploads/` folder on a schedule, and test a restore.
4. Set `SITE_URL` if the public address differs from `CLIENT_URL`.

## Operations

Alerts, CAPTCHA, antivirus, two-factor login, backups, analytics, Search Console and the test suites are documented in **[docs/OPERATIONS.md](docs/OPERATIONS.md)**.

```bash
npm run backup            # database + uploads, optionally encrypted, rotated
npm run backup:verify     # check the newest backup
npm run admin:reset-password -- someone@example.com
npm test                  # unit + API tests (needs TEST_DATABASE_URL, a throwaway database)
npm run test:e2e          # real-browser tests (Chrome)
```

## Ideas that are not built yet

Automatic deletion of old applications (a retention policy) · a Docker setup · error monitoring (Sentry) and uptime checks · self-hosted fonts · a product PDF catalogue download.

## API (`/api`, Express + Prisma)

| Area | Endpoints |
| ---- | --------- |
| Public | `GET /company` `/sectors` `/products[?sector=&featured=]` `/products/:slug` `/water` `/plastic` `/preforms` `/caps` `/food` `/water/labels` `/real-estate[/:slug]` `/jobs[/:slug]` `/settings/:key` |
| Forms | `POST /contact` · `POST /quotes` · `POST /jobs/:id-or-slug-or-general/apply` (multipart: fields + `cv` PDF/DOC/DOCX ≤ 5 MB) · `GET /config` (public keys) · CAPTCHA token in the `x-captcha-token` header when enabled |
| Auth | `POST /auth/login` `/auth/login/2fa` `/auth/logout` `/auth/change-password` `/auth/2fa/setup` `/auth/2fa/enable` `/auth/2fa/disable` · `GET /auth/me` (httpOnly cookie) |
| Admin | `/admin/dashboard` `products` `categories` `water/labels` `sectors` `real-estate` `jobs` `applications` (+`/:id/cv`) `messages` `quotes` `notification-settings` `readiness` `audit` `notifications` `media` `company` `whatsapp` `settings` `users` |

Roles: **EDITOR** = content (products, jobs, real estate, media...) · **ADMIN** = + applications, messages, company, settings · **SUPER_ADMIN** = + users.
All requests and responses use the same bilingual shape as the website: `{ "name": { "ar": "...", "en": "..." } }`.

Uploads: media library files are public under `/uploads/media/*`; CVs are stored privately and only downloadable by signed-in admins.
Files are identified by their content (not the extension); SVG and disguised files are rejected.

## Admin dashboard (`/admin`)

Arabic, RTL, responsive. Sign in at `/admin/login` with the account created by `npm run db:seed`.

| Section | What you can do |
| ------- | --------------- |
| Dashboard | totals, 14-day activity chart, application status, latest events, shortcuts |
| Products (all sectors) | add / edit / delete / hide / feature; **water sizes, plastic, preforms, caps, food**; upload images from the form; gallery, video, specs, features; drag-and-drop ordering |
| Water labels · Categories · Sectors | label artwork per size, product groups, sector cards |
| Real estate · Jobs | projects with gallery; job ads with deadline |
| Applications · Messages · Notifications | status workflow, notes, protected CV download, WhatsApp / e-mail reply, bell with unread count |
| Media library | drag-and-drop upload, alt text, replace (URL stays), delete |
| Company · WhatsApp · Homepage · Advanced | logos, contact, about, values, milestones, stats, cities; number + message per sector; hero texts; JSON settings |
| Users | roles: **Editor** (content), **Admin** (+ applications, messages, settings), **Super admin** (+ users) |

Everything is stored bilingual (Arabic + English) and appears on the public site immediately. The dashboard is a separate code-split bundle, so visitors never download it.

## Client structure (`client/src`)

| Folder         | Purpose                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------- |
| `i18n/`        | `ar.ts` / `en.ts` dictionaries (UI text), language provider, `LocalizedLink`             |
| `content/`     | Typed **built-in seed** (the site falls back to it if the API is down; also the DB seed source) |
| `services/`    | Data access layer: reads from the API, falls back to `content/` when the API is unreachable |
| `components/`  | `layout/` (header, footer, WhatsApp), `ui/` (design system), `sections/`, `hero/`         |
| `admin/`       | the dashboard: `pages/`, `components/` (tables, forms, media picker), `api.ts`, `auth.tsx` |
| `pages/`       | One file per route                                                                        |

### Languages
Every route lives under `/ar/...` or `/en/...`. `/` redirects to the visitor's last language (default Arabic).
Content fields are bilingual (`L('عربي', 'English')`), which maps to `nameAr` / `nameEn` columns later.
Add a language by adding a dictionary, a `LOCALES` entry and a `DIRECTIONS` entry in `i18n/types.ts`.

### Homepage intro
`components/hero/HeroIntro.tsx` — truck drives in, stops, leaves; water fills a bottle; the real product photo is revealed.
≈9 s on the first visit (the truck drives slowly), ≈4 s afterwards, skippable, and a static hero when `prefers-reduced-motion` is on.
In dev, `?introAt=4.5` freezes the intro at that second (handy for visual checks).
The truck is cut out of `assets/hero/hero-truck.webp`; wheel geometry lives in `components/hero/Truck.tsx`.

### Plastic page
`components/sections/GranuleName.tsx` — plastic granules and colour pigments fly in and assemble into the company name (Arabic or English), react to the pointer, and render as a static lettering with `prefers-reduced-motion`.

### Assets
`client/public/assets/{branding,hero,water,food,real-estate,...}` — WebP, English file names without spaces.
Components never embed images: paths come from `content/`, so they can move to the database / media library.

## Build phases

1 Architecture + auth ✅ · **2 DB schema, migrations & seed ✅ (API complete, 118 integration checks)** · **3 Design system ✅ · 4 Homepage & intro ✅ · 5 Water ✅ · 6 Plastic/preforms/caps ✅ ·
7 Food ✅ · 8 Real estate ✅ · 9 Careers & applications ✅ · 10 Contact & WhatsApp ✅** ·
**11 Admin dashboard ✅ (46 browser checks)** · 12 SEO / security / performance polish · 13 Animation polish
