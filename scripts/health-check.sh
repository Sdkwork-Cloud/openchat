#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FAILURES=0

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

print_line() {
  echo -e "${CYAN}=========================================${NC}"
}

print_header() {
  echo
  print_line
  echo -e "${BLUE}$1${NC}"
  print_line
}

mark_ok() {
  echo -e "${GREEN}OK${NC} $1"
}

mark_warn() {
  echo -e "${YELLOW}WARN${NC} $1"
}

mark_fail() {
  echo -e "${RED}FAIL${NC} $1"
  FAILURES=$((FAILURES + 1))
}

probe_http() {
  local url="$1"
  curl -fsS --max-time 3 "$url" >/dev/null 2>&1
}

probe_tcp() {
  local host="$1"
  local port="$2"

  if command_exists nc; then
    nc -z "$host" "$port" >/dev/null 2>&1
    return $?
  fi

  return 1
}

resolve_env_file() {
  local requested="${OPENCHAT_ENV_FILE:-}"
  local node_env="${NODE_ENV:-}"

  if [[ -n "$requested" && -f "$requested" ]]; then
    echo "$requested"
    return 0
  fi

  if [[ -n "$node_env" ]]; then
    case "${node_env,,}" in
      development|dev)
        for candidate in "$PROJECT_ROOT/.env.development" "$PROJECT_ROOT/.env.dev" "$PROJECT_ROOT/.env"; do
          [[ -f "$candidate" ]] && echo "$candidate" && return 0
        done
        ;;
      test)
        for candidate in "$PROJECT_ROOT/.env.test" "$PROJECT_ROOT/.env"; do
          [[ -f "$candidate" ]] && echo "$candidate" && return 0
        done
        ;;
      production|prod)
        for candidate in "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/.env.prod" "$PROJECT_ROOT/.env"; do
          [[ -f "$candidate" ]] && echo "$candidate" && return 0
        done
        ;;
    esac
  fi

  for candidate in \
    "$PROJECT_ROOT/.env" \
    "$PROJECT_ROOT/.env.development" \
    "$PROJECT_ROOT/.env.dev" \
    "$PROJECT_ROOT/.env.test" \
    "$PROJECT_ROOT/.env.production" \
    "$PROJECT_ROOT/.env.prod"; do
    [[ -f "$candidate" ]] && echo "$candidate" && return 0
  done

  return 1
}

ENV_FILE="$(resolve_env_file || true)"
if [[ -n "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

APP_HOST="${APP_HOST:-${HOST:-127.0.0.1}}"
APP_PORT="${APP_PORT:-${PORT:-7200}}"
APP_URL="${APP_URL:-http://${APP_HOST}:${APP_PORT}}"
RUNTIME_ENVIRONMENT="${NODE_ENV:-production}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-openchat}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-openchat}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

WUKONGIM_URL="${WUKONGIM_API_URL:-http://localhost:5001}"

check_config() {
  print_header "Configuration"

  if [[ -n "$ENV_FILE" ]]; then
    mark_ok "Loaded environment file: $ENV_FILE"
  else
    mark_warn "No environment file found. Using process environment only."
  fi

  local required_vars=(
    "DB_HOST"
    "DB_PORT"
    "DB_USERNAME"
    "DB_NAME"
    "REDIS_HOST"
    "REDIS_PORT"
    "JWT_SECRET"
  )

  for var_name in "${required_vars[@]}"; do
    if [[ -n "${!var_name:-}" ]]; then
      mark_ok "Configured: $var_name"
    else
      mark_fail "Missing required variable: $var_name"
    fi
  done
}

check_ports() {
  print_header "Ports"

  local entries=(
    "127.0.0.1:${APP_PORT}:OpenChat"
    "${DB_HOST}:${DB_PORT}:PostgreSQL"
    "${REDIS_HOST}:${REDIS_PORT}:Redis"
  )

  if [[ -n "${WUKONGIM_API_URL:-}" ]]; then
    local wukong_host
    local wukong_port
    wukong_host="$(echo "$WUKONGIM_URL" | sed -E 's#^https?://([^/:]+).*#\1#')"
    wukong_port="$(echo "$WUKONGIM_URL" | sed -nE 's#^https?://[^/:]+:([0-9]+).*$#\1#p')"
    wukong_port="${wukong_port:-80}"
    entries+=("${wukong_host}:${wukong_port}:WukongIM")
  fi

  for entry in "${entries[@]}"; do
    local host="${entry%%:*}"
    local rest="${entry#*:}"
    local port="${rest%%:*}"
    local name="${entry##*:}"

    if probe_tcp "$host" "$port"; then
      mark_ok "${name} is reachable on ${host}:${port}"
    else
      mark_warn "${name} is not reachable on ${host}:${port}"
    fi
  done
}

check_app_health() {
  print_header "Application"

  if probe_http "${APP_URL%/}/health"; then
    mark_ok "Health endpoint responded: ${APP_URL%/}/health"
  else
    mark_fail "Health endpoint is unavailable: ${APP_URL%/}/health"
  fi

  if probe_http "${APP_URL%/}/im/v3/docs"; then
    mark_ok "OpenAPI docs responded: ${APP_URL%/}/im/v3/docs"
  else
    mark_warn "OpenAPI docs are unavailable: ${APP_URL%/}/im/v3/docs"
  fi
}

check_runtime() {
  print_header "Runtime"

  if [[ ! -x "$PROJECT_ROOT/bin/openchat" ]]; then
    mark_warn "Runtime wrapper is unavailable: $PROJECT_ROOT/bin/openchat"
    return 0
  fi

  if "$PROJECT_ROOT/bin/openchat" status --environment "$RUNTIME_ENVIRONMENT" >/dev/null 2>&1; then
    mark_ok "Runtime status command succeeded for environment ${RUNTIME_ENVIRONMENT}"
  else
    mark_warn "Runtime status command reported an issue for environment ${RUNTIME_ENVIRONMENT}"
  fi

  if "$PROJECT_ROOT/bin/openchat" health --environment "$RUNTIME_ENVIRONMENT" >/dev/null 2>&1; then
    mark_ok "Runtime health command succeeded for environment ${RUNTIME_ENVIRONMENT}"
  else
    mark_warn "Runtime health command reported an issue for environment ${RUNTIME_ENVIRONMENT}"
  fi
}

check_database() {
  print_header "Database"

  if ! command_exists psql; then
    mark_fail "psql is not available in PATH"
    return 0
  fi

  if PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -tAc "SELECT 1" >/dev/null 2>&1; then
    mark_ok "PostgreSQL connection succeeded (${DB_USERNAME}@${DB_HOST}:${DB_PORT}/${DB_NAME})"
  else
    mark_fail "PostgreSQL connection failed (${DB_USERNAME}@${DB_HOST}:${DB_PORT}/${DB_NAME})"
  fi
}

check_redis() {
  print_header "Redis"

  if ! command_exists redis-cli; then
    mark_fail "redis-cli is not available in PATH"
    return 0
  fi

  local redis_args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT")
  if [[ -n "$REDIS_PASSWORD" ]]; then
    redis_args+=("-a" "$REDIS_PASSWORD")
  fi

  if redis-cli "${redis_args[@]}" ping >/dev/null 2>&1; then
    mark_ok "Redis connection succeeded (${REDIS_HOST}:${REDIS_PORT})"
  else
    mark_fail "Redis connection failed (${REDIS_HOST}:${REDIS_PORT})"
  fi
}

check_wukongim() {
  print_header "WukongIM"

  if [[ "${WUKONGIM_ENABLED:-true}" == "false" ]]; then
    mark_warn "WukongIM is disabled by configuration"
    return 0
  fi

  if probe_http "${WUKONGIM_URL%/}/health"; then
    mark_ok "WukongIM health endpoint responded: ${WUKONGIM_URL%/}/health"
  else
    mark_warn "WukongIM health endpoint is unavailable: ${WUKONGIM_URL%/}/health"
  fi
}

check_docker_containers() {
  print_header "Docker"

  if ! command_exists docker; then
    mark_warn "docker command is not available"
    return 0
  fi

  if ! docker info >/dev/null 2>&1; then
    mark_warn "Docker daemon is unavailable or current user has no permission"
    return 0
  fi

  local containers=(
    "openchat"
    "openchat-postgres"
    "openchat-redis"
    "openchat-wukongim"
  )

  for container in "${containers[@]}"; do
    local status
    status="$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo 'missing')"
    if [[ "$status" == "running" ]]; then
      mark_ok "Container running: $container"
    elif [[ "$status" == "missing" ]]; then
      mark_warn "Container not found: $container"
    else
      mark_warn "Container status for $container: $status"
    fi
  done
}

run_quick_check() {
  print_header "OpenChat Quick Check"
  check_config
  check_runtime
  check_app_health
}

run_full_diagnosis() {
  print_header "OpenChat Full Diagnosis"
  check_config
  check_runtime
  check_ports
  check_app_health
  check_database
  check_redis
  check_wukongim
  check_docker_containers
}

show_help() {
  cat <<'EOF'
OpenChat health check

Usage:
  ./scripts/health-check.sh [quick|full|config|runtime|ports|app|database|redis|wukongim|containers|help]

Environment:
  OPENCHAT_ENV_FILE=/path/to/.env.production ./scripts/health-check.sh full

Notes:
  - The script loads OPENCHAT_ENV_FILE first when provided.
  - Otherwise it resolves .env.<environment> from NODE_ENV and falls back to .env.
  - quick checks configuration, runtime wrapper state, and /health.
  - full runs configuration, runtime wrapper, ports, app, database, Redis, WukongIM, and Docker checks.
EOF
}

COMMAND="${1:-quick}"

case "$COMMAND" in
  quick)
    run_quick_check
    ;;
  full)
    run_full_diagnosis
    ;;
  config)
    check_config
    ;;
  runtime)
    check_runtime
    ;;
  ports)
    check_ports
    ;;
  app)
    check_app_health
    ;;
  database)
    check_database
    ;;
  redis)
    check_redis
    ;;
  wukongim)
    check_wukongim
    ;;
  containers)
    check_docker_containers
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    mark_fail "Unknown command: $COMMAND"
    show_help
    ;;
esac

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi
