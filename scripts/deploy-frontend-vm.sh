#!/usr/bin/env bash
# Deploy latest MediTap frontend on the production VM (discards local Tab14 edits that block git pull).
set -euo pipefail
cd ~/MediTap
git checkout -- meditap-app/src/pages/Tab14.tsx 2>/dev/null || true
git pull origin main
cd backend
source ~/MediTap/venv/bin/activate
python manage.py migrate
deactivate
cd ../meditap-app
npm run build
sudo systemctl reload nginx
git log -1 --oneline
echo "Done. Hard-refresh meditap.ai in your browser."
