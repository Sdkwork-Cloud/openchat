#!/bin/bash
# ============================================
# Compatibility Regression Guard
# Prevent reintroducing removed legacy/compat keys and patterns.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

if ! command -v rg > /dev/null 2>&1; then
  echo "[compat-guard] ripgrep (rg) is required"
  exit 1
fi

fail_count=0

run_guard() {
  local title="$1"
  local pattern="$2"
  shift 2
  local paths=("$@")

  local result
  result="$(rg -n --hidden --no-messages \
    --glob '!scripts/check-compat-regression.sh' \
    --glob '!node_modules/**' \
    --glob '!dist/**' \
    --glob '!**/*.spec.ts' \
    --glob '!**/*.test.ts' \
    "$pattern" "${paths[@]}" || true)"
  if [ -n "$result" ]; then
    fail_count=$((fail_count + 1))
    echo "[compat-guard] FAIL: $title"
    echo "$result"
    echo
  fi
}

run_guard "Legacy DB_USER key" "\\bDB_USER\\b" \
  src scripts docs .env .env.example .env.development .env.test .env.production \
  docker-compose.yml docker-compose.external-db.yml docker-compose.prod.yml docker-compose.quick.yml \
  README.md README_CN.md DEPLOYMENT.md INSTALL_CN.md INSTALL_EN.md ARCHITECT.md QWEN.md k8s

run_guard "Legacy DB_DATABASE key" "\\bDB_DATABASE\\b" \
  src scripts docs .env .env.example .env.development .env.test .env.production \
  docker-compose.yml docker-compose.external-db.yml docker-compose.prod.yml docker-compose.quick.yml \
  README.md README_CN.md DEPLOYMENT.md INSTALL_CN.md INSTALL_EN.md ARCHITECT.md QWEN.md k8s

run_guard "Legacy idempotency header x-idempotency-key" "x-idempotency-key" \
  src scripts docs

run_guard "Legacy timeline cursor decode marker legacyBase64" "legacyBase64" \
  src scripts docs

run_guard "Deprecated RTC query-style wording" "deprecated query style" \
  src docs

run_guard "Legacy RTC validate query endpoint" "GET /rtc/tokens/validate\\?token" \
  src docs

run_guard "Legacy nested config key im.wukongim.*" "im\\.wukongim\\." \
  src docs scripts .env .env.example .env.development .env.test .env.production

run_guard "Legacy nested config key rtc.volcengine.webhook.*" "rtc\\.volcengine\\.webhook" \
  src docs scripts .env .env.example .env.development .env.test .env.production

run_guard "Legacy WUKONGIM_APP_ID key" "WUKONGIM_APP_ID" \
  src scripts docs .env .env.example .env.development .env.test .env.production \
  docker-compose.yml docker-compose.external-db.yml docker-compose.prod.yml docker-compose.quick.yml

run_guard "Legacy Tencent privateMapKey alias" "tencentEnablePrivateMapKey" \
  src docs scripts .env .env.example .env.development .env.test .env.production

run_guard "Legacy JWT device aliases in token parsing" \
  "payload\\.device_id|payload\\.did|decoded\\.device_id|decoded\\.did|device_id\\?: string;|did\\?: string;" \
  src/modules/user src/common/auth

run_guard "Legacy auth query token compatibility" \
  "query\\.token|query\\.bot_token|query\\.api_key|query\\.craw_api_key" \
  src/common/auth src/modules/user/strategies

run_guard "Legacy auth cookie token compatibility" \
  "cookies\\?\\.token|request\\.cookies\\.token" \
  src/common/auth src/modules/user/strategies

run_guard "Legacy websocket query token compatibility" \
  "handshake\\.query\\.token" \
  src/gateways

run_guard "Legacy websocket cookie token compatibility" \
  "handshake\\.headers\\.cookie|tokenCookie" \
  src/gateways

run_guard "Legacy PagedResponseDto.create usage" "PagedResponseDto\\.create\\(" \
  src

run_guard "Legacy CursorPagedResponseDto.create usage" "CursorPagedResponseDto\\.create\\(" \
  src

run_guard "Non-strict CREATE TABLE IF NOT EXISTS in schema baseline" "CREATE TABLE IF NOT EXISTS" \
  database/schema.sql database/patches

run_guard "Non-strict CREATE INDEX IF NOT EXISTS in schema baseline" "CREATE INDEX IF NOT EXISTS" \
  database/schema.sql database/patches database/indexes-optimization.sql

if [ "$fail_count" -ne 0 ]; then
  echo "[compat-guard] Found $fail_count compatibility regression categories."
  exit 1
fi

echo "[compat-guard] PASS"
