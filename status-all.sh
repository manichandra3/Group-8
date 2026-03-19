#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

if [[ ! -d "$RUN_DIR" ]]; then
  echo "[info] No tracked processes."
  exit 0
fi

for pid_file in "$RUN_DIR"/*.pid; do
  [[ -e "$pid_file" ]] || continue

  service_name="$(basename "$pid_file" .pid)"
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "[up] $service_name (pid $pid)"
  else
    echo "[down] $service_name (stale pid file)"
  fi
done
