#!/usr/bin/env bash
# Start baykuş in multi mode (handle claim / login), loading secrets from .env.
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

if [[ -z "${BAYKUS_TMDB_API_KEY:-}" ]]; then
  echo "BAYKUS_TMDB_API_KEY is empty in .env — multi mode needs a server-side TMDB key." >&2
  exit 1
fi

echo "baykuş multi → data: $BAYKUS_DATA_DIR"
echo "Open http://localhost:5173 after Vite starts (claim a handle there)."
exec pnpm dev
