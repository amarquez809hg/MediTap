#!/usr/bin/env bash
# Deploy latest MediTap on the production VM.
# Resets local edits (Tab14.tsx/css, etc.) that block git pull — VM should match GitHub only.
set -euo pipefail
cd ~/MediTap
git fetch origin main
git reset --hard origin/main
cd backend
source ~/MediTap/venv/bin/activate
python manage.py migrate
deactivate
cd ../meditap-app
npm run build
sudo systemctl reload nginx
echo ""
git log -1 --oneline
echo "Done. Hard-refresh meditap.ai (Cmd+Shift+R)."
