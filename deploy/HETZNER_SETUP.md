# Deploying to Hetzner Cloud

A from-scratch runbook for putting this project on a Hetzner Cloud VPS, pointed at a domain whose DNS
is still managed elsewhere (e.g. Wix). Do the steps in order; each one says who does it.

## 0. What you need before starting

- A Hetzner Cloud account and project (**you** create this — it needs your payment details).
- The SSH keypair already generated for this: the public key is in `~/.ssh/lamico_hetzner.pub`. Paste
  its contents into Hetzner when creating the server ("SSH keys" step) — this is how the server gets
  set up without ever needing a password.
- Push access to the GitHub repo (`mohammadEsawi/al-quds`) — the server will need a **read-only** deploy
  key to pull the code (set up in step 3; it never needs your personal GitHub credentials).

## 1. Create the server (you)

In the Hetzner Cloud console:

- **Image**: Ubuntu (latest LTS Hetzner offers)
- **Type**: CX22 (2 vCPU / 4 GB RAM) is enough to start; resize later if needed, no reinstall required.
- **Location**: closest to your visitors (Falkenstein/Nuremberg, Germany is a reasonable default for a
  Palestine-based audience — decent latency, and Hetzner doesn't have a Middle East region).
- **SSH key**: pick the `lamico_hetzner` key you pasted in step 0.
- **Volumes/Networking/Firewall**: defaults are fine — `provision.sh` sets up the firewall on the server
  itself (ufw).

Create it, then note its **public IPv4 address** — everything below needs it.

## 2. Provision the server (run from your machine)

```bash
ssh -i ~/.ssh/lamico_hetzner root@<server-ip> 'bash -s' < deploy/provision.sh
```

This installs Node.js 24, PostgreSQL 18, nginx, certbot, ufw, fail2ban and unattended security updates;
creates a non-root `deploy` user (and disables root/password SSH login — key-only from here on, so
reconnect as `deploy@<server-ip>` afterwards, not `root`); opens only ports 22/80/443; and creates the
`lamico` database plus a least-privilege `lamico_app` role (see README → "Database user" for why).

At the end it prints a generated `DATABASE_URL` — **copy it**, you'll need it in step 4. It's also saved
to `/root/lamico-db-password.txt` on the server; move the password somewhere safe (a password manager)
and delete that file once you have it.

## 3. GitHub deploy key (run on the server, as `deploy`)

```bash
ssh -i ~/.ssh/lamico_hetzner deploy@<server-ip>
ssh-keygen -t ed25519 -C "lamico-server-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

Add the printed key on GitHub: repo → Settings → Deploy keys → "Add deploy key" — **read-only**, no
write access needed. Then on the server:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
EOF
```

## 4. First deploy (run on the server, as `deploy`)

```bash
git clone git@github.com:mohammadEsawi/al-quds.git /srv/lamico
cd /srv/lamico
cp server/.env.example server/.env
```

Edit `server/.env`:

- `NODE_ENV=production`
- `DATABASE_URL` — the one step 2 printed
- `CLIENT_URL=https://www.your-domain.com` (the real domain, once decided — see `deploy/nginx.conf`)
- `TRUST_PROXY=true` (the app sits behind nginx)
- `JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the first admin account; **delete `ADMIN_PASSWORD` from the file
  once seeded** (next step)
- Leave the optional blocks (SMTP, WhatsApp, Turnstile, 2FA, analytics) empty for now — see
  `docs/OPERATIONS.md` to turn them on later, any time.

Then:

```bash
npm ci
npm run build
npm run prisma:deploy -w server
npm run db:seed                 # creates the admin account + loads all site content
rsync -a client/dist/ /var/www/lamico/

sudo cp deploy/lamico-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lamico-api
sudo systemctl status lamico-api     # should say "active (running)"
```

Now remove `ADMIN_PASSWORD` from `server/.env` (the seed only needs it once) and restart:
`sudo systemctl restart lamico-api`.

## 5. nginx + HTTPS (run on the server, as `deploy`/root)

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/lamico
sudo ln -s /etc/nginx/sites-available/lamico /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit `/etc/nginx/sites-available/lamico`: replace `www.example.com` / `example.com` with the real
domain in both `server_name` lines, and comment out the `ssl_certificate` lines for now (certbot adds
them automatically in a moment). Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Don't run certbot yet** — it needs the domain already pointing at this server (step 6 first). Once DNS
has propagated:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot edits the nginx config to add the certificate paths and sets up auto-renewal (a systemd timer,
already enabled by the certbot package — nothing else to schedule).

## 6. Point the domain here (you, in Wix's DNS settings)

In Wix → domain settings → DNS records: point the **A record** for the root domain (and a CNAME or A
record for `www`) at the server's IP from step 1. **Leave the MX records alone** if the domain's email
goes through Wix — only the A/CNAME records need to change. Allow up to 48 hours to propagate (usually
much faster).

## 7. Ongoing deploys

Every time there's new code to ship:

```bash
ssh -i ~/.ssh/lamico_hetzner deploy@<server-ip>
cd /srv/lamico && ./deploy/deploy.sh
```

`deploy.sh` pulls, installs, builds, migrates, republishes the client build and restarts the API —
see the file for the exact steps.

## 8. Backups

```bash
crontab -e
```

Add (matches `docs/OPERATIONS.md` → Backups):

```
30 2 * * * cd /srv/lamico && npm run backup >> /var/log/lamico-backup.log 2>&1
```

Then **copy `/srv/lamico/server/backups/` off the server** on a schedule (another disk, or
`rclone` to S3/Backblaze) — a backup that only lives on the server you're backing up doesn't protect
against losing the server. Set `BACKUP_PASSPHRASE` in `server/.env` first (encrypts the archives; CVs
are personal data) and keep that passphrase somewhere else than the server itself.

## Verification checklist

- `curl -I https://your-domain.com` → `200`, with the security headers from `deploy/nginx.conf`
- `https://your-domain.com/admin/login` loads and logs in with the admin account from step 4
- `sudo systemctl status lamico-api` → active; `journalctl -u lamico-api -f` shows clean startup
- `ssh deploy@<server-ip>` works; `ssh root@<server-ip>` is refused (root login is disabled)
- Dashboard → home → the site checklist widget is green except whatever's intentionally still off
  (SMTP/WhatsApp/2FA/etc. — turn those on later per `docs/OPERATIONS.md`)
