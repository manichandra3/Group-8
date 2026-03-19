#!/usr/bin/env bash
set -euo pipefail

# Source the common variables and functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

FRONTEND_DIR="$ROOT_DIR/frontend"
PID_FILE="$RUN_DIR/frontend.pid"
LOG_FILE="$LOG_DIR/frontend.log"

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE")"
  if [[ -n "$existing_pid" ]] && is_pid_running "$existing_pid"; then
    echo "[skip] frontend is already running (pid $existing_pid, port 5173)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# Install dependencies if node_modules is missing OR if package.json has been updated
if [[ ! -d "$FRONTEND_DIR/node_modules" || "$FRONTEND_DIR/package.json" -nt "$FRONTEND_DIR/node_modules" ]]; then
  echo "[prep] Installing/updating frontend dependencies"
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "[start] frontend on port 5173"
(
  cd "$FRONTEND_DIR"
  nohup npm run dev -- --host 0.0.0.0 --port 5173 >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
)

echo "[done] Frontend startup command was issued."
echo "Logs: $LOG_FILE"
