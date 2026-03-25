#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${WORKSPACE_DIR}/.." && pwd)"

GENERATOR_ROOT="${SDKWORK_GENERATOR_ROOT:-D:/javasource/spring-ai-plus/spring-ai-plus-business/sdk/sdkwork-sdk-generator}"
BASE_SPEC="${BASE_SPEC:-${WORKSPACE_DIR}/openapi/openchat-im-admin.openapi.yaml}"
SDKGEN_SPEC="${SDKGEN_SPEC:-${WORKSPACE_DIR}/openapi/openchat-im-admin.sdkgen.yaml}"
SDK_NAME="${SDK_NAME:-sdkwork-im-admin-sdk}"
SDK_TYPE="${SDK_TYPE:-backend}"
PACKAGE_NAME="${PACKAGE_NAME:-@sdkwork/im-admin-backend-sdk}"
API_PREFIX="${API_PREFIX:-/admin/im/v3}"
BASE_URL="${BASE_URL:-}"
HOST="${HOST:-${DOMAIN:-127.0.0.1}}"
PORT="${PORT:-3000}"
SCHEME="${SCHEME:-http}"
SCHEMA_URL="${SCHEMA_URL:-}"
SKIP_FETCH="${SKIP_FETCH:-false}"
OPENAPI_REFRESH_TIMEOUT_MS="${OPENAPI_REFRESH_TIMEOUT_MS:-15000}"
LANGUAGES="${LANGUAGES:-typescript}"

is_true() {
  local value="${1:-}"
  case "${value,,}" in
    true|1|yes|on)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

while [ $# -gt 0 ]; do
  case "$1" in
    --languages)
      LANGUAGES="$2"
      shift 2
      ;;
    --skip-fetch)
      SKIP_FETCH=true
      shift
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --host|--domain)
      HOST="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --scheme)
      SCHEME="$2"
      shift 2
      ;;
    --schema-url)
      SCHEMA_URL="$2"
      shift 2
      ;;
    --api-prefix)
      API_PREFIX="$2"
      shift 2
      ;;
    --refresh-timeout-ms)
      OPENAPI_REFRESH_TIMEOUT_MS="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

RESOLVED_BASE_URL="${BASE_URL:-$SCHEME://$HOST:$PORT}"
RESOLVED_BASE_URL="${RESOLVED_BASE_URL%/}"
OPENAPI_REFRESH_URL="${OPENAPI_REFRESH_URL:-${SCHEMA_URL:-${RESOLVED_BASE_URL}/admin/im/v3/openapi.json}}"

echo "=========================================="
echo "SDKWork IM Admin SDK Generator"
echo "=========================================="
echo "Workspace: ${WORKSPACE_DIR}"
echo "Generator: ${GENERATOR_ROOT}"
echo "Runtime base URL: ${RESOLVED_BASE_URL}"
echo "Schema URL: ${OPENAPI_REFRESH_URL}"
echo ""

RUNTIME_PID=""
BOUNDARY_SNAPSHOT=""

cleanup_runtime() {
  if [ -n "${RUNTIME_PID}" ]; then
    kill "${RUNTIME_PID}" >/dev/null 2>&1 || true
  fi
  if [ -n "${BOUNDARY_SNAPSHOT}" ] && [ -f "${BOUNDARY_SNAPSHOT}" ]; then
    rm -f "${BOUNDARY_SNAPSHOT}" >/dev/null 2>&1 || true
  fi
}

trap cleanup_runtime EXIT

if ! is_true "${SKIP_FETCH}" && [ -n "${OPENAPI_REFRESH_URL}" ]; then
  echo "Ensuring runtime OpenAPI endpoints are available"
  runtime_json="$(node "${SCRIPT_DIR}/ensure-openapi-runtime.mjs" \
    --repo-root "${REPO_ROOT}" \
    --base-url "${RESOLVED_BASE_URL}" \
    --host "${HOST}" \
    --port "${PORT}" \
    --scheme "${SCHEME}" \
    --schema-url "${OPENAPI_REFRESH_URL}" \
    --timeout-ms 60000)"
  OPENAPI_REFRESH_URL="$(node -e "const runtime = JSON.parse(process.argv[1]); process.stdout.write(runtime.schemaUrl || '');" "${runtime_json}")"
  RUNTIME_PID="$(node -e "const runtime = JSON.parse(process.argv[1]); process.stdout.write(runtime.startedRuntime && runtime.pid ? String(runtime.pid) : '');" "${runtime_json}")"
fi

prepare_args=(
  "${SCRIPT_DIR}/prepare-openapi-source.mjs"
  --base "${BASE_SPEC}"
  --derived "${SDKGEN_SPEC}"
  --prefer-derived
)

if ! is_true "${SKIP_FETCH}" && [ -n "${OPENAPI_REFRESH_URL}" ]; then
  prepare_args+=(--refresh-url "${OPENAPI_REFRESH_URL}" --refresh-timeout-ms "${OPENAPI_REFRESH_TIMEOUT_MS}")
fi

PREPARED_INPUT="$(node "${prepare_args[@]}")"
echo "Prepared input: ${PREPARED_INPUT}"
echo ""

echo "Resolving unified SDK version"
RESOLVED_SDK_VERSION="$(node "${GENERATOR_ROOT}/bin/resolve-sdk-version.js" \
  --sdk-root "${WORKSPACE_DIR}" \
  --sdk-name "${SDK_NAME}" \
  --sdk-type "${SDK_TYPE}" \
  --package-name "${PACKAGE_NAME}")"
if [ -z "${RESOLVED_SDK_VERSION}" ]; then
  echo "Error: Failed to resolve SDK version" >&2
  exit 1
fi
echo "Resolved SDK version: ${RESOLVED_SDK_VERSION}"
echo ""

echo "Capturing manual-owned boundary snapshot"
BOUNDARY_SNAPSHOT="$(mktemp "${TMPDIR:-/tmp}/sdkwork-im-admin-sdk-boundary.XXXXXX.json")"
node "${SCRIPT_DIR}/verify-sdk-boundary.mjs" \
  --snapshot-root "${WORKSPACE_DIR}" \
  --write-snapshot "${BOUNDARY_SNAPSHOT}"

IFS=',' read -r -a LANGUAGE_LIST <<< "${LANGUAGES}"
HAS_TYPESCRIPT=false
for language in "${LANGUAGE_LIST[@]}"; do
  language="$(echo "${language}" | xargs)"
  if [ -z "${language}" ]; then
    continue
  fi
  if [ "${language}" = "typescript" ]; then
    HAS_TYPESCRIPT=true
  fi

  output_dir="${WORKSPACE_DIR}/sdkwork-im-admin-sdk-${language}/generated/server-openapi"
  mkdir -p "${output_dir}"
  echo "Generating ${language} -> ${output_dir}"
  node "${GENERATOR_ROOT}/bin/sdkgen.js" generate \
    -i "${PREPARED_INPUT}" \
    -o "${output_dir}" \
    -n "${SDK_NAME}" \
    -t "${SDK_TYPE}" \
    -l "${language}" \
    --fixed-sdk-version "${RESOLVED_SDK_VERSION}" \
    --sdk-root "${WORKSPACE_DIR}" \
    --sdk-name "${SDK_NAME}" \
    --base-url "${RESOLVED_BASE_URL}" \
    --api-prefix "${API_PREFIX}"
done

echo ""
echo "Verifying generation boundary"
node "${SCRIPT_DIR}/verify-sdk-boundary.mjs"

echo ""
echo "Running assemble step"
node "${SCRIPT_DIR}/assemble-sdk.mjs"

echo ""
echo "Verifying manual-owned boundary snapshot"
node "${SCRIPT_DIR}/verify-sdk-boundary.mjs" \
  --snapshot-root "${WORKSPACE_DIR}" \
  --compare-snapshot "${BOUNDARY_SNAPSHOT}"

if [ "${HAS_TYPESCRIPT}" = "true" ]; then
  echo ""
  echo "Materializing TypeScript workspace packages"
  node "${SCRIPT_DIR}/materialize-typescript-workspace.mjs"
fi
