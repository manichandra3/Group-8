#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/.logs"
PID_FILE="$RUN_DIR/frontend.pid"
LOG_FILE="$LOG_DIR/frontend.log"

mkdir -p "$RUN_DIR" "$LOG_DIR"

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE")"
  if [[ -n "$existing_pid" ]] && is_pid_running "$existing_pid"; then
    echo "[skip] frontend is already running (pid $existing_pid, port 5173)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "[prep] Installing frontend dependencies"
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
