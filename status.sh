#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

if [[ ! -d "$RUN_DIR" ]]; then
  echo "[info] No tracked processes."
  exit 0
fi

for pid_file in "$RUN_DIR"/*.pid; do
  [[ -e "$pid_file" ]] || continue

  service_name="$(basename "$pid_file" .pid)"
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && is_pid_running "$pid"; then
    echo "[up] $service_name (pid $pid)"
  else
    echo "[down] $service_name (stale pid file)"
  fi
done
