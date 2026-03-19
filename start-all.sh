#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$ROOT_DIR/start-backend.sh"
"$ROOT_DIR/start-frontend.sh"

echo "[done] Requested startup for all servers."
