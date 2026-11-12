#!/bin/bash
# Start AniStream detached (survives the shell closing).
# Usage: ./start.sh [port]
set -e
cd "$(dirname "$0")"

PORT="${1:-5178}"

# Secrets (ANISTREAM_KEY) live in the gitignored .env.local.
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

# Stop any previous instance bound to this port.
for pid in $(pgrep -f "node server/index.js" 2>/dev/null); do
  kill "$pid" 2>/dev/null || true
done
sleep 1

# Build if the bundle is missing or stale.
if [ ! -f dist/index.html ]; then
  echo "Building client…"
  npm run build
fi

PORT="$PORT" NODE_ENV=production setsid nohup node server/index.js \
  > /tmp/anistream.log 2>&1 < /dev/null &
sleep 2

if curl -sf -m 5 -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "AniStream running on port $PORT"
  echo "  local   http://localhost:$PORT"
  echo "  tailnet https://$(tailscale status --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null):5175"
else
  echo "Failed to start — see /tmp/anistream.log"
  exit 1
fi
