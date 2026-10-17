#!/usr/bin/env bash
# Deploys the latest code. Run on the server, as the "deploy" user, from /srv/lamico:
#
#   cd /srv/lamico && ./deploy/deploy.sh
#
# Pulls the latest commit, installs dependencies, builds client + server, applies any new database
# migrations (never resets data — "migrate deploy", not "migrate dev"), publishes the client build to
# nginx's web root, and restarts the API. Each step fails loudly (set -e) rather than leaving things
# half-deployed.

set -euo pipefail
cd "$(dirname "$0")/.."

WEB_ROOT="/var/www/lamico"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

echo "==> Applying database migrations"
npm run prisma:deploy -w server

echo "==> Publishing client build to $WEB_ROOT"
rsync -a --delete client/dist/ "$WEB_ROOT/"

echo "==> Restarting the API"
sudo systemctl restart lamico-api
sudo systemctl --no-pager status lamico-api | head -5

echo "==> Done"
