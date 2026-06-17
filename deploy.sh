#!/usr/bin/env bash
#
# One-command deploy for the Quorum frontend.
#
# Architecture note: the BACKEND is Supabase (hosted in the cloud). There is no
# Node/PM2 backend on this server — this box only builds the static frontend and
# nginx serves it. So a "deploy" is just: pull latest, build, publish into
# nginx's web root.
#
# Usage (from anywhere):  bash /opt/game/deploy.sh
#
set -euo pipefail

WEB_ROOT="/var/www/quorumdaily"   # must match nginx 'root' in /etc/nginx/sites-enabled/quorumdaily

# Always run relative to this script's location (the repo root).
cd "$(dirname "$0")"

echo "→ Pulling latest code..."
git pull origin main

echo "→ Building frontend..."
cd frontend
npm install
npm run build

echo "→ Publishing to ${WEB_ROOT} ..."
mkdir -p "${WEB_ROOT}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete dist/ "${WEB_ROOT}/"
else
  rm -rf "${WEB_ROOT:?}/"* && cp -r dist/* "${WEB_ROOT}/"
fi

echo "✓ Deployed. Hard-refresh quorumdaily.com (or open a private tab)."
