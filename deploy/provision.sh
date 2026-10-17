#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu server (e.g. a new Hetzner Cloud instance).
# Run as root, right after the server is created:
#
#   ssh root@<server-ip> 'bash -s' < deploy/provision.sh
#
# What it does: installs Node.js, PostgreSQL, nginx and certbot; creates a non-root "deploy" user
# (and locks down SSH to key-only, no root login); opens only ports 22/80/443 in the firewall;
# enables fail2ban and automatic security updates; creates the "lamico" database and app user;
# and creates /srv/lamico for the app code. It does NOT deploy the app itself — see deploy/deploy.sh
# and deploy/HETZNER_SETUP.md for the steps after this script finishes.
#
# Safe to re-run: steps that are already done (user exists, database exists, ...) are skipped.

set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/srv/lamico"
WEB_ROOT="/var/www/lamico"
DB_NAME="lamico"
DB_USER="lamico_app"

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root (e.g. over SSH as root, or with sudo)." >&2
  exit 1
fi

echo "==> Updating the system"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Installing base packages (curl, git, ufw, fail2ban, unattended-upgrades, nginx, certbot)"
apt-get install -y curl git ufw fail2ban unattended-upgrades nginx python3-certbot-nginx ca-certificates gnupg rsync

echo "==> Installing Node.js 24"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Installing PostgreSQL 18 (PGDG repository)"
if ! command -v psql >/dev/null; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-18
fi
systemctl enable --now postgresql

echo "==> Firewall (OpenSSH, HTTP, HTTPS only)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban for SSH"
systemctl enable --now fail2ban

echo "==> Automatic security updates"
echo 'Unattended-Upgrade::Allowed-Origins { "${distro_id}:${distro_codename}-security"; };' \
  > /etc/apt/apt.conf.d/51unattended-upgrades-security
systemctl enable --now unattended-upgrades

echo "==> Deploy user"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
  fi
fi
# Root login is disabled below, so deploy needs passwordless sudo — otherwise nothing could ever
# run as root again (the account has no password to sudo with, by design).
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

echo "==> Locking down SSH (key-only, no root login)"
SSHD_DROPIN=/etc/ssh/sshd_config.d/99-lamico-hardening.conf
cat > "$SSHD_DROPIN" <<'EOF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
EOF
systemctl reload ssh 2>/dev/null || systemctl try-reload-or-restart ssh.socket 2>/dev/null || true

echo "==> App directories"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$WEB_ROOT"

echo "==> Database and app role"
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")
if [[ "$DB_EXISTS" != "1" ]]; then
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C';"
fi
ROLE_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'")
if [[ "$ROLE_EXISTS" != "1" ]]; then
  DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))")
  sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE;"
  sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
  sudo -u postgres psql -c "REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC;"
  sudo -u postgres psql -c "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;"
  sudo -u postgres psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO $DB_USER;"
  echo "$DB_PASSWORD" > "/root/lamico-db-password.txt"
  chmod 600 "/root/lamico-db-password.txt"
  echo
  echo "    Generated DATABASE_URL for server/.env:"
  echo "    postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"
  echo "    (also saved to /root/lamico-db-password.txt — move it somewhere safe, then delete it from the server)"
  echo
fi

echo "==> Done. Next: deploy/HETZNER_SETUP.md, section 'First deploy'."
