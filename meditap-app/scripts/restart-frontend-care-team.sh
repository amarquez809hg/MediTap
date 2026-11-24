#!/usr/bin/env bash
# Restart MediTap frontend so Tab14 sidebar picks up Care Team Members / Care Team split.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/meditap-app"
rm -rf node_modules/.vite dist
cd "$ROOT/docker"
docker compose restart frontend
echo "Frontend restarted. Hard-refresh http://localhost:8100 (Cmd+Shift+R)."
echo "Confirm: Related Person → Care Team Members → Assessment … Notes → Care Team (last)."
