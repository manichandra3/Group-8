#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/.logs"

# Ensure the required directories exist
mkdir -p "$RUN_DIR" "$LOG_DIR"

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}
