#!/usr/bin/env bash
# Deploy latest MediTap on the production VM.
# Resets code to origin/main but preserves the local SQLite database (never in git).
set -euo pipefail
cd ~/MediTap
DB=backend/db.sqlite3
DB_BAK=/tmp/meditap-db-pre-deploy.sqlite3
if [[ -f "$DB" ]]; then
  cp -a "$DB" "$DB_BAK"
fi
git fetch origin main
git reset --hard origin/main
if [[ -f "$DB_BAK" ]]; then
  mv "$DB_BAK" "$DB"
fi
cd backend
source ~/MediTap/venv/bin/activate
python manage.py migrate
deactivate
cd ../meditap-app
npm install
npm run build
sudo systemctl reload nginx
echo ""
git log -1 --oneline
echo "Done. Hard-refresh meditap.ai (Cmd+Shift+R)."
