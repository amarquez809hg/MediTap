#!/usr/bin/env bash
# Fix: Safari "localhost" hits a stuck local Vite on IPv6 with OLD menu.
# Docker (new code) is on 127.0.0.1:8100. Kill the local Vite and open IPv4.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> Killing local Vite/node listeners on :8100…"
for pid in $(lsof -t -iTCP:8100 -sTCP:LISTEN 2>/dev/null || true); do
  cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  # Do not kill Docker's proxy by name alone — only node/vite
  if echo "$cmd" | grep -qiE 'vite|node'; then
    # Skip docker-proxy
    if echo "$cmd" | grep -qi 'docker'; then
      continue
    fi
    echo "    kill -9 $pid  ($cmd)"
    kill -9 "$pid" 2>/dev/null || true
  fi
done

# Explicitly kill known meditap vite cwd
pkill -9 -f '/Users/amarquez/Desktop/MediTap/meditap-app.*vite' 2>/dev/null || true
pkill -9 -f 'vite.*8100' 2>/dev/null || true

echo "==> Clearing Vite cache…"
rm -rf "$ROOT/meditap-app/node_modules/.vite"

echo "==> Restarting Docker frontend…"
cd "$ROOT/docker"
docker compose exec -T frontend sh -lc 'rm -rf /app/node_modules/.vite' 2>/dev/null || true
docker compose restart frontend

echo "==> Waiting for Docker on 127.0.0.1:8100…"
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8100/ | grep -q 200; then
    echo "    ready"
    break
  fi
  sleep 2
done

echo "==> Verify Care Team Members in served nav…"
if curl -s http://127.0.0.1:8100/src/intake/tab14PortabilitySections.ts | grep -q careTeamMembers; then
  echo "    OK"
else
  echo "    FAIL — Docker may not have mounted latest files"
fi

echo ""
echo "OPEN THIS EXACT URL in Safari (not 'localhost'):"
echo "  http://127.0.0.1:8100/app/intake"
echo ""
open 'http://127.0.0.1:8100/app/intake' || true
echo "Look for green text: Sidebar build: Care Team Members + Care Team"
