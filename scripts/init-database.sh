#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLI_PATH="${PROJECT_ROOT}/scripts/openchat-cli.cjs"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js >= 18 is required to run OpenChat database commands." >&2
  exit 1
fi

exec node "${CLI_PATH}" db init "$@"
