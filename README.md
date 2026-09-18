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
legacy/   The previous static HTML site (kept for reference, not served)
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

## API (`/api`, Express + Prisma)

| Area | Endpoints |
| ---- | --------- |
| Public | `GET /company` `/sectors` `/products[?sector=&featured=]` `/products/:slug` `/water` `/plastic` `/preforms` `/caps` `/food` `/water/labels` `/real-estate[/:slug]` `/jobs[/:slug]` `/settings/:key` |
| Forms | `POST /contact` · `POST /jobs/:id-or-slug-or-general/apply` (multipart: fields + `cv` PDF/DOC/DOCX ≤ 5 MB) |
| Auth | `POST /auth/login` `/auth/logout` `/auth/change-password` · `GET /auth/me` (httpOnly cookie) |
| Admin | `/admin/dashboard` `products` `categories` `water/labels` `sectors` `real-estate` `jobs` `applications` (+`/:id/cv`) `messages` `notifications` `media` `company` `whatsapp` `settings` `users` |

Roles: **EDITOR** = content (products, jobs, real estate, media...) · **ADMIN** = + applications, messages, company, settings · **SUPER_ADMIN** = + users.
All requests and responses use the same bilingual shape as the website: `{ "name": { "ar": "...", "en": "..." } }`.

Uploads: media library files are public under `/uploads/media/*`; CVs are stored privately and only downloadable by signed-in admins.
Files are identified by their content (not the extension); SVG and disguised files are rejected.

## Client structure (`client/src`)

| Folder         | Purpose                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------- |
| `i18n/`        | `ar.ts` / `en.ts` dictionaries (UI text), language provider, `LocalizedLink`             |
| `content/`     | Typed **built-in seed** (the site falls back to it if the API is down; also the DB seed source) |
| `services/`    | Data access layer: reads from the API, falls back to `content/` when the API is unreachable |
| `components/`  | `layout/` (header, footer, WhatsApp), `ui/` (design system), `sections/`, `hero/`         |
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
11 Admin dashboard (UI — the API is ready) · 12 SEO / security / performance polish · 13 Animation polish
