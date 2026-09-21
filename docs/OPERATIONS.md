# Operating the Lamico platform

Everything below is **optional and off by default**: each service switches on when its settings exist in `server/.env`
and simply stays off otherwise, so the site never breaks because a service is missing. The dashboard page
**الصفحة الرئيسية → جاهزية الموقع** shows live what is configured and what is still missing.

## 1. Alerts when something arrives (email / WhatsApp)

Visitors send job applications, contact messages and quote requests. Instead of opening the dashboard to find out,
the owners get an alert.

**Email** — add an SMTP account to `server/.env` (any provider: Google Workspace, Microsoft 365, Zoho, your hosting):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false          # true only for port 465
SMTP_USER=no-reply@example.com
SMTP_PASS=...
MAIL_FROM="Lamico <no-reply@example.com>"
```

Then open **الإشعارات** in the dashboard: switch email on, list the recipients (up to 10), choose which events to send,
press **حفظ وإرسال رسالة تجريبية**. Replying to an alert email answers the visitor directly (Reply-To). At most 30 alerts
an hour are sent per channel, so a flood of spam cannot flood your inbox — the dashboard still records everything.

**WhatsApp** — uses Meta's WhatsApp Cloud API (developers.facebook.com → your WhatsApp Business app):

```
WHATSAPP_TOKEN=...          # permanent access token
WHATSAPP_PHONE_ID=...       # the sending phone number's id
WHATSAPP_TEMPLATE=lamico_alert   # an approved message template with 2 body parameters ({{1}} headline, {{2}} summary)
WHATSAPP_TEMPLATE_LANG=ar
```

Without `WHATSAPP_TEMPLATE`, a plain text message is sent, which Meta only delivers to a number that wrote to the business in the
last 24 hours. The alert carries only the headline and the sender's name; details stay in the dashboard.
*Not verified against Meta's live service — it is tested against a fake with the same request format. Send a test from the dashboard first.*

## 2. CAPTCHA on the public forms (Cloudflare Turnstile — free)

1. dash.cloudflare.com → Turnstile → add a site (your domain) → copy the **site key** and **secret key**.
2. `server/.env`:
   ```
   TURNSTILE_SITE_KEY=...
   TURNSTILE_SECRET=...
   ```
3. Restart the API. The contact, job-application and quote forms now show the check, and the server refuses submissions without a valid token.
   If Cloudflare cannot be reached, forms are refused (they fail closed) rather than left open to bots.

The CSP already allows `challenges.cloudflare.com`.

## 3. Antivirus for CVs (ClamAV)

Every uploaded CV (and every media-library upload) can be scanned before it is stored.

```
# Docker is the easy way to run the scanner:
docker run -d --name clamav --restart unless-stopped -p 127.0.0.1:3310:3310 clamav/clamav:stable
```
```
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
CLAMAV_REQUIRED=false       # true: refuse uploads while the scanner is down. false: accept them and log a warning
```

An infected file is refused (`FILE_INFECTED`) and recorded in **سجل النشاط**. The scan speaks clamd's INSTREAM protocol and is tested against a
fake scanner including the EICAR signature; test with the real one by uploading the EICAR test file (eicar.org) as a CV.

## 4. Two-factor login for the dashboard

Every user can turn it on under **حسابي → التحقق بخطوتين** (scan a QR code with Google Authenticator / Microsoft Authenticator / Authy;
10 one-time recovery codes are shown once). Login then asks for the 6-digit code; each code works once.

* `REQUIRE_2FA=true` — admins and super admins cannot use the dashboard until they have set it up (editors are not affected).
* A super admin can reset someone's 2FA from **المستخدمون** if they lose their phone. If the **only** super admin is locked out, from the server folder:
  `npm run admin:reset-password -- their@email` signs them in with a new password, and 2FA can be reset by another super admin; if there is none,
  clear it in the database: `UPDATE "User" SET "totpEnabledAt"=NULL,"totpSecretEnc"=NULL,"recoveryCodes"=NULL WHERE email='...';`
* Secrets are stored encrypted (AES-256-GCM). Set `DATA_ENCRYPTION_KEY` (32 random bytes as 64 hex characters) so changing `JWT_SECRET` later does not lock everyone out;
  without it the key is derived from `JWT_SECRET`.

## 5. Backups

```
npm run backup              # database + uploads (media and private CVs) -> backups/lamico-YYYYMMDD-HHMMSS/
npm run backup:verify       # checks the newest backup: checksums, dump readable, archive readable (changes nothing)
npm run backup:restore -- backups/lamico-... --yes     # REPLACES the database and uploads with that backup
```

Needs `pg_dump` / `pg_restore` (PostgreSQL client tools) and `tar`. If the PostgreSQL tools are not on the PATH set `PG_BIN_DIR`
(for example `C:/Program Files/PostgreSQL/18/bin`). Settings: `BACKUP_DIR` (default `backups/`), `BACKUP_KEEP` (default 14 newest kept),
`BACKUP_PASSPHRASE` (encrypts the files with AES-256-GCM — CVs are personal data; keep the passphrase somewhere else than the server).

**Schedule it** (a backup you have to remember does not exist):

* Linux (cron, every night at 02:30): `30 2 * * * cd /srv/lamico && npm run backup >> /var/log/lamico-backup.log 2>&1`
* Windows (Task Scheduler, every night): `schtasks /Create /SC DAILY /ST 02:30 /TN "Lamico backup" /TR "cmd /c cd /d C:\lamico && npm run backup"`

Then **copy the `backups/` folder off the server** (another disk, S3/Backblaze with `rclone`, ...) and **try a restore** into a spare database once
(`DATABASE_URL=... npm run backup:restore -- <folder> --yes`). The dashboard checklist turns green when a backup younger than 2 days exists.

## 6. Visitor statistics and Google Search Console

**Statistics** — Plausible or Umami (no cookies, no personal data, so no consent banner is needed; visitors who send "Do Not Track" are not counted):

```
ANALYTICS_PROVIDER=plausible          # or umami
ANALYTICS_DOMAIN=www.example.com      # Plausible: the site's domain
# ANALYTICS_WEBSITE_ID=...            # Umami: the website id
# ANALYTICS_SCRIPT_URL=https://your-own-host/script.js   # self-hosted instance; defaults to plausible.io / cloud.umami.is
```

Allow the statistics host in the Content-Security-Policy: build the site with `ANALYTICS_HOST=https://plausible.io` (see `client/security-headers.ts`)
and add the same address to `script-src` and `connect-src` in `deploy/nginx.conf`. The dashboard is never tracked.

**Search Console** — search.google.com/search-console → add your domain → verify with a **DNS TXT record** (best), or put the "HTML tag" code in
`GOOGLE_SITE_VERIFICATION=...` → then submit `https://your-domain/sitemap.xml` under *Sitemaps*. The sitemap lists every published page in Arabic and English
with `hreflang` and never lists drafts or the dashboard; `robots.txt` blocks `/admin` and `/api`.

## 7. Tests

```
npm run typecheck
npm run test:unit                                  # 47 fast tests: TOTP against the RFC 6238 vectors, file detection, EXIF stripping,
                                                   # password rules, encryption, the antivirus protocol, ...
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/lamico_test" npm run test:api
                                                   # 7 suites, ~360 checks against a real API + PostgreSQL (the database is wiped: its name must contain "test")
TEST_DATABASE_URL="..." npm run test:e2e           # real Chrome: dashboard, quote form, two-factor screens, CSP, phones/tablets
```

`npm run test:api -- 05` runs only the suites whose file name contains `05`. Email, WhatsApp, Turnstile and ClamAV are tested against fakes that speak the real
protocols (`server/tests/lib/fakes.mjs`), so no account or credentials are needed. GitHub Actions runs all of it on every push (`.github/workflows/ci.yml`).

## 8. Going live checklist

* `NODE_ENV=production`, HTTPS, `TRUST_PROXY=true`, `CLIENT_URL=https://your-domain` — see `deploy/nginx.conf`
* a least-privilege PostgreSQL user (README → "Database user") and **no `ADMIN_PASSWORD` left in `.env`**
* `REQUIRE_2FA=true`, `TURNSTILE_*`, SMTP + alert recipients, ClamAV, a scheduled backup that is copied off the server
* real product photos, water-label images, the official logo (dashboard → المنتجات / ملصقات المياه / معلومات الشركة) — the checklist card lists what is missing
