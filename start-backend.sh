#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/Backend"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/.logs"

mkdir -p "$RUN_DIR" "$LOG_DIR"

SERVICES=(
  "discovery-server|discovery-server/pom.xml|8761"
  "auth-service|auth-service/pom.xml|8081"
  "stock-service|stock-service/pom.xml|8082"
  "trade-service|trade-service/pom.xml|8083"
  "portfolio-service|portfolio-service/pom.xml|8084"
  "api-gateway|api-gateway/pom.xml|8085"
)

wait_for_port() {
  local host="$1"
  local port="$2"
  local timeout_seconds="${3:-60}"
  local elapsed=0

  echo "[wait] Waiting for $host:$port"
  while (( elapsed < timeout_seconds )); do
    if (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1; then
      echo "[wait] $host:$port is ready"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "[warn] Timed out waiting for $host:$port"
  return 1
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

start_service() {
  local service_name="$1"
  local pom_path="$2"
  local port="$3"
  local pid_file="$RUN_DIR/${service_name}.pid"
  local log_file="$LOG_DIR/${service_name}.log"

  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file")"
    if [[ -n "$existing_pid" ]] && is_pid_running "$existing_pid"; then
      echo "[skip] $service_name is already running (pid $existing_pid, port $port)"
      return
    fi
    rm -f "$pid_file"
  fi

  echo "[start] $service_name on port $port"
  (
    cd "$BACKEND_DIR"
    nohup bash ./mvnw -f "$pom_path" spring-boot:run >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )
}

echo "[prep] Installing shared parent POM and core-shared library"
(
  cd "$BACKEND_DIR"
  bash ./mvnw -N install >/dev/null
  bash ./mvnw -f core-shared/pom.xml -DskipTests install >/dev/null
)

for service in "${SERVICES[@]}"; do
  IFS='|' read -r name pom port <<<"$service"
  start_service "$name" "$pom" "$port"

  # Ensure discovery is available before starting Eureka clients.
  if [[ "$name" == "discovery-server" ]]; then
    wait_for_port "localhost" "8761" "90" || true
  fi
done

echo "[done] Backend startup commands were issued."
echo "Logs: $LOG_DIR"
echo "PIDs: $RUN_DIR"
