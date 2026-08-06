#!/usr/bin/env zsh
set -euo pipefail

ROOT="${0:A:h:h}"
cd "$ROOT"

API_ENTRY="$ROOT/apps/api/dist/index.js"
WEB_INDEX="$ROOT/apps/web/dist/index.html"
WEB_DIST_DIR="$ROOT/apps/web/dist"

if [[ ! -f "$API_ENTRY" ]] || [[ ! -f "$WEB_INDEX" ]]; then
    echo "Production build missing — running yarn build…"
    yarn build
fi

export NODE_ENV=production
export API_PORT="${API_PORT:-8888}"
export WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:${API_PORT}}"
export ATLASSIAN_REDIRECT_URI="${ATLASSIAN_REDIRECT_URI:-http://localhost:${API_PORT}/auth/callback}"
export DATA_DIR="${DATA_DIR:-$ROOT/.data}"
export WEB_DIST="${WEB_DIST:-$WEB_DIST_DIR}"

if lsof -nP -iTCP:"${API_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port ${API_PORT} is already in use (likely yarn dev or a previous yarn start:prod)."
    echo "Stop it with Ctrl+C in that terminal, or:"
    echo "  kill \$(lsof -t -iTCP:${API_PORT} -sTCP:LISTEN)"
    exit 1
fi

if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Note: Vite dev server is still on port 5173 — use http://localhost:${API_PORT} for prod (not 5173)."
fi

echo "Worklog Auditor → http://localhost:${API_PORT}"
exec node "$API_ENTRY"
