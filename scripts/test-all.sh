#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${MONOLITH_APP_URL:-}" ]]; then
  APP_URL="$MONOLITH_APP_URL"
  PORT="${APP_URL##*:}"
else
  PORT="$(node -e 'const net = require("node:net"); const s = net.createServer(); s.listen(0, () => { console.log(s.address().port); s.close(); });')"
  APP_URL="http://localhost:${PORT}"
fi

npm run test:unit -- --runInBand

PORT="$PORT" npm run start >/tmp/monolith-app-tests.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

ready=false
for _ in {1..40}; do
  if curl -fsS "$APP_URL/health" >/dev/null; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo "Server failed to become ready at $APP_URL"
  echo "--- /tmp/monolith-app-tests.log ---"
  tail -n 100 /tmp/monolith-app-tests.log || true
  exit 1
fi

MONOLITH_APP_URL="$APP_URL" npm run test:e2e -- --runInBand
