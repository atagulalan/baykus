#!/usr/bin/env bash
# Start baykuş in multi mode (handle claim / login), loading secrets from .env.
# Brings up server (:4004) + Vite web (:5173) + Expo mobile — same trio as `pnpm dev`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy the example and fill in your TMDB key:" >&2
  echo "  cp .env.example .env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

export BAYKUS_MODE=multi
# Resolve relative data dirs against apps/server (tsx's cwd under pnpm --filter).
if [[ -n "${BAYKUS_DATA_DIR:-}" && "${BAYKUS_DATA_DIR}" != /* ]]; then
  export BAYKUS_DATA_DIR="$ROOT/apps/server/${BAYKUS_DATA_DIR#./}"
else
  export BAYKUS_DATA_DIR="${BAYKUS_DATA_DIR:-$ROOT/apps/server/data-multi}"
fi

# Metro reads apps/mobile/.env — don't let a root EXPO_PUBLIC_* (often localhost)
# override the device-reachable URL when Expo inherits this shell env.
unset EXPO_PUBLIC_API_BASE_URL || true
MOBILE_API_HINT="$(
  grep -E '^EXPO_PUBLIC_API_BASE_URL=' "$ROOT/apps/mobile/.env" 2>/dev/null | head -1 | cut -d= -f2-
)"
MOBILE_API_HINT="${MOBILE_API_HINT:-missing — set apps/mobile/.env}"

if [[ -z "${BAYKUS_TMDB_API_KEY:-}" ]]; then
  echo "BAYKUS_TMDB_API_KEY is empty in .env — multi mode needs a server-side TMDB key." >&2
  exit 1
fi

echo "baykuş multi → data: $BAYKUS_DATA_DIR"
echo "  web:    http://localhost:5173  (claim a handle / sign in)"
echo "  api:    http://localhost:4004"
echo "  mobile: EXPO_PUBLIC_API_BASE_URL=${MOBILE_API_HINT}"
echo "          (change apps/mobile/.env + restart Metro if the phone can't reach the API)"
exec pnpm --parallel --filter @baykus/server --filter @baykus/web --filter @baykus/mobile dev
