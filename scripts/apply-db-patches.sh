#!/bin/bash
# ============================================
# OpenChat 数据库补丁执行脚本
# 用法: ./apply-db-patches.sh [development|test|production]
#      兼容别名: dev -> development, prod -> production
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

resolve_env_name() {
    local raw_env="$1"
    case "${raw_env}" in
        development|dev)
            echo "development"
            ;;
        test)
            echo "test"
            ;;
        production|prod)
            echo "production"
            ;;
        *)
            echo ""
            ;;
    esac
}

resolve_env_file() {
    local canonical_env="$1"
    local env_file=""
    case "${canonical_env}" in
        development)
            [ -f ".env.development" ] && env_file=".env.development"
            [ -z "$env_file" ] && [ -f ".env.dev" ] && env_file=".env.dev"
            ;;
        test)
            [ -f ".env.test" ] && env_file=".env.test"
            ;;
        production)
            [ -f ".env.production" ] && env_file=".env.production"
            [ -z "$env_file" ] && [ -f ".env.prod" ] && env_file=".env.prod"
            ;;
    esac
    echo "$env_file"
}

ENV_INPUT=${1:-development}
ENV=$(resolve_env_name "$ENV_INPUT")
if [ -z "$ENV" ]; then
    echo -e "${RED}错误: 无效环境 ${ENV_INPUT}${NC}"
    echo -e "${YELLOW}支持环境: development(dev), test, production(prod)${NC}"
    exit 1
fi
ENV_FILE="$(resolve_env_file "$ENV")"
PATCH_DIR="database/patches"
MIGRATION_TABLE="chat_schema_migrations"

compute_sha256() {
    local file="$1"
    if command -v sha256sum > /dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
        return 0
    fi
    if command -v shasum > /dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
        return 0
    fi
    if command -v openssl > /dev/null 2>&1; then
        openssl dgst -sha256 "$file" | awk '{print $NF}'
        return 0
    fi
    return 1
}

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  OpenChat 数据库补丁执行脚本${NC}"
echo -e "${BLUE}  环境: ${ENV}${NC}"
echo -e "${BLUE}============================================${NC}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 找不到环境配置文件${NC}"
    echo -e "${YELLOW}当前环境: ${ENV}${NC}"
    echo -e "${YELLOW}期望文件: development=.env.development(.env.dev), test=.env.test, production=.env.production(.env.prod)${NC}"
    exit 1
fi

if [ ! -d "$PATCH_DIR" ]; then
    echo -e "${YELLOW}未找到补丁目录 ${PATCH_DIR}，无需执行${NC}"
    exit 0
fi

source "$ENV_FILE"
export PGPASSWORD="${DB_PASSWORD}"

if ! command -v psql > /dev/null 2>&1; then
    echo -e "${RED}✗ 未找到 psql 命令，请先安装 PostgreSQL 客户端并加入 PATH${NC}"
    unset PGPASSWORD
    exit 1
fi

echo -e "${BLUE}测试数据库连接...${NC}"
if ! psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}✗ 数据库连接失败${NC}"
    unset PGPASSWORD
    exit 1
fi
echo -e "${GREEN}✓ 数据库连接成功${NC}"

psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
    filename TEXT PRIMARY KEY,
    version TEXT,
    checksum TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" > /dev/null
psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
ALTER TABLE ${MIGRATION_TABLE}
    ADD COLUMN IF NOT EXISTS version TEXT,
    ADD COLUMN IF NOT EXISTS checksum TEXT;" > /dev/null
psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
UPDATE ${MIGRATION_TABLE}
SET version = substring(filename from '^([0-9]{8})_')
WHERE version IS NULL
  AND filename ~ '^[0-9]{8}_.+\.sql$';" > /dev/null
psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_schema_migrations_version_uniq
    ON ${MIGRATION_TABLE}(version)
    WHERE version IS NOT NULL;" > /dev/null

patch_count=0
applied_count=0
skipped_count=0
backfilled_count=0
last_patch_version=""
for patch in $(find "$PATCH_DIR" -maxdepth 1 -type f -name "*.sql" | sort); do
    patch_count=$((patch_count + 1))
    patch_name="$(basename "$patch")"
    patch_name_sql=${patch_name//\'/\'\'}
    patch_version="${patch_name%%_*}"
    if [[ ! "${patch_name}" =~ ^[0-9]{8}_.+\.sql$ ]]; then
        echo -e "${RED}✗ 补丁命名不符合标准 (YYYYMMDD_name.sql): ${patch_name}${NC}"
        unset PGPASSWORD
        exit 1
    fi
    if [ -n "${last_patch_version}" ] && [[ "${patch_version}" < "${last_patch_version}" ]]; then
        echo -e "${RED}✗ 补丁顺序异常: ${patch_name} 早于前一个版本 ${last_patch_version}${NC}"
        unset PGPASSWORD
        exit 1
    fi
    last_patch_version="${patch_version}"
    patch_checksum="$(compute_sha256 "$patch" || true)"
    if [ -z "${patch_checksum}" ]; then
        echo -e "${RED}✗ 无法计算补丁摘要: ${patch_name}${NC}"
        unset PGPASSWORD
        exit 1
    fi

    version_row="$(psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -tA -F '|' -c "SELECT filename, checksum FROM ${MIGRATION_TABLE} WHERE version='${patch_version}' LIMIT 1;")"
    if [ -n "${version_row}" ]; then
        stored_filename="${version_row%%|*}"
        stored_checksum="${version_row#*|}"
        normalized_stored_filename="$(echo "${stored_filename}" | tr -d '[:space:]')"
        normalized_stored_checksum="$(echo "${stored_checksum}" | tr -d '[:space:]')"
        if [ "${normalized_stored_filename}" != "${patch_name}" ]; then
            echo -e "${RED}✗ 补丁版本冲突: version=${patch_version}${NC}"
            echo -e "${RED}  已登记文件: ${normalized_stored_filename}${NC}"
            echo -e "${RED}  当前文件:   ${patch_name}${NC}"
            unset PGPASSWORD
            exit 1
        fi
        if [ "${normalized_stored_checksum}" != "${patch_checksum}" ]; then
            echo -e "${RED}✗ 补丁摘要不匹配: ${patch_name}${NC}"
            echo -e "${RED}  记录摘要: ${normalized_stored_checksum}${NC}"
            echo -e "${RED}  当前摘要: ${patch_checksum}${NC}"
            unset PGPASSWORD
            exit 1
        fi
        skipped_count=$((skipped_count + 1))
        echo -e "${YELLOW}跳过补丁 [${patch_count}]: ${patch_name} (已执行)${NC}"
        continue
    fi

    filename_row="$(psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -tA -F '|' -c "SELECT version, checksum FROM ${MIGRATION_TABLE} WHERE filename='${patch_name_sql}' LIMIT 1;")"
    if [ -n "${filename_row}" ]; then
        stored_version="${filename_row%%|*}"
        stored_checksum="${filename_row#*|}"
        normalized_stored_version="$(echo "${stored_version}" | tr -d '[:space:]')"
        normalized_stored_checksum="$(echo "${stored_checksum}" | tr -d '[:space:]')"
        if [ -n "${normalized_stored_version}" ] && [ "${normalized_stored_version}" != "${patch_version}" ]; then
            echo -e "${RED}✗ 补丁版本冲突: ${patch_name} 已绑定 version=${normalized_stored_version}${NC}"
            unset PGPASSWORD
            exit 1
        fi
        if [ -n "${normalized_stored_checksum}" ] && [ "${normalized_stored_checksum}" != "${patch_checksum}" ]; then
            echo -e "${RED}✗ 补丁摘要不匹配: ${patch_name}${NC}"
            echo -e "${RED}  记录摘要: ${normalized_stored_checksum}${NC}"
            echo -e "${RED}  当前摘要: ${patch_checksum}${NC}"
            unset PGPASSWORD
            exit 1
        fi
        psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "UPDATE ${MIGRATION_TABLE} SET version='${patch_version}', checksum='${patch_checksum}' WHERE filename='${patch_name_sql}';" > /dev/null
        backfilled_count=$((backfilled_count + 1))
        skipped_count=$((skipped_count + 1))
        echo -e "${YELLOW}补丁 [${patch_count}] 已存在历史记录，已回填版本/摘要: ${patch_name}${NC}"
        continue
    fi

    echo -e "${BLUE}执行补丁 [${patch_count}]: ${patch_name}${NC}"
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "$patch"
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "INSERT INTO ${MIGRATION_TABLE} (filename, version, checksum) VALUES ('${patch_name_sql}', '${patch_version}', '${patch_checksum}');" > /dev/null
    applied_count=$((applied_count + 1))
    echo -e "${GREEN}✓ 完成: ${patch_name}${NC}"
done

if [ "$patch_count" -eq 0 ]; then
    echo -e "${YELLOW}补丁目录中没有 SQL 文件，跳过${NC}"
else
    echo -e "${GREEN}补丁总数 ${patch_count}，本次执行 ${applied_count}，跳过 ${skipped_count}，回填摘要 ${backfilled_count}${NC}"
fi

unset PGPASSWORD
