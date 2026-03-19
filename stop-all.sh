#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

if [[ ! -d "$RUN_DIR" ]]; then
  echo "[info] Nothing to stop. No PID directory found at $RUN_DIR"
  exit 0
fi

for pid_file in "$RUN_DIR"/*.pid; do
  [[ -e "$pid_file" ]] || continue

  service_name="$(basename "$pid_file" .pid)"
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "[stop] $service_name (pid $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      echo "[stop] forcing $service_name (pid $pid)"
      kill -9 "$pid" 2>/dev/null || true
    fi
  else
    echo "[info] $service_name not running"
  fi

  rm -f "$pid_file"
done

echo "[done] Stop routine finished."
