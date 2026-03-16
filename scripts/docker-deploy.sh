#!/bin/bash

# ============================================
# OpenChat Docker 部署脚本
# 支持灵活配置外部数据库和 Redis
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 默认配置
DEFAULT_ENV_FILE="$PROJECT_ROOT/.env"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
EXTERNAL_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.external-db.yml"

# 默认启用 profiles
DEFAULT_PROFILES="database,cache,im"

# 打印分隔线
print_line() {
    echo -e "${CYAN}=========================================${NC}"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}OpenChat Docker 部署脚本${NC}"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  install          安装并启动所有服务"
    echo "  start            启动服务"
    echo "  stop             停止服务"
    echo "  restart          重启服务"
    echo "  status           查看服务状态"
    echo "  logs             查看日志"
    echo "  clean            清理所有数据"
    echo "  update           更新并重启"
    echo "  external         使用外部数据库/Redis启动"
    echo "  quick            快速启动（仅应用）"
    echo "  profiles         启动指定的服务"
    echo "  patch-db         执行数据库在线补丁（database/patches）"
    echo "  prod:deploy      生产部署（先补丁，再启动 docker-compose.prod.yml）"
    echo ""
    echo "选项:"
    echo "  -f, --file       指定 docker-compose 文件"
    echo "  -e, --env        指定环境变量文件"
    echo "  -p, --profiles   指定启动的 profiles (database,cache,im,monitoring)"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 install                    # 安装并启动"
    echo "  $0 start -e .env.production   # 使用生产环境配置启动"
    echo "  $0 external                   # 使用外部数据库启动"
    echo "  $0 profiles -p database,im    # 只启动数据库和IM"
    echo "  $0 logs -f app               # 查看应用日志"
}

# 执行数据库补丁
apply_db_patches() {
    local patch_dir="$PROJECT_ROOT/database/patches"
    local migration_table="chat_schema_migrations"
    local checksum_tool=""

    if command -v sha256sum &> /dev/null; then
        checksum_tool="sha256sum"
    elif command -v shasum &> /dev/null; then
        checksum_tool="shasum"
    elif command -v openssl &> /dev/null; then
        checksum_tool="openssl"
    fi

    if [ ! -d "$patch_dir" ]; then
        echo -e "${YELLOW}⚠ 未找到补丁目录: $patch_dir，跳过${NC}"
        return 0
    fi

    if ! command -v psql &> /dev/null; then
        echo -e "${RED}✗ 错误: psql 未安装，无法执行数据库补丁${NC}"
        return 1
    fi

    if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USERNAME:-}" ] || [ -z "${DB_NAME:-}" ]; then
        echo -e "${RED}✗ 错误: 数据库连接信息不完整，请检查环境变量 DB_HOST/DB_USERNAME/DB_NAME${NC}"
        return 1
    fi

    echo -e "${BLUE}执行数据库在线补丁...${NC}"
    export PGPASSWORD="${DB_PASSWORD:-}"

    if [ -z "$checksum_tool" ]; then
        echo -e "${RED}✗ 错误: 找不到 SHA256 工具 (sha256sum/shasum/openssl)${NC}"
        unset PGPASSWORD
        return 1
    fi

    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS ${migration_table} (
    filename TEXT PRIMARY KEY,
    version TEXT,
    checksum TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" > /dev/null
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
ALTER TABLE ${migration_table}
    ADD COLUMN IF NOT EXISTS version TEXT,
    ADD COLUMN IF NOT EXISTS checksum TEXT;" > /dev/null
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
UPDATE ${migration_table}
SET version = substring(filename from '^([0-9]{8})_')
WHERE version IS NULL
  AND filename ~ '^[0-9]{8}_.+\.sql$';" > /dev/null
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_schema_migrations_version_uniq
    ON ${migration_table}(version)
    WHERE version IS NOT NULL;" > /dev/null

    local patch_count=0
    local applied_count=0
    local skipped_count=0
    local backfilled_count=0
    local last_patch_version=""
    for patch in $(find "$patch_dir" -maxdepth 1 -type f -name "*.sql" | sort); do
        patch_count=$((patch_count + 1))
        local patch_name
        patch_name="$(basename "$patch")"
        local patch_name_sql="${patch_name//\'/\'\'}"
        local patch_version="${patch_name%%_*}"
        if [[ ! "${patch_name}" =~ ^[0-9]{8}_.+\.sql$ ]]; then
            echo -e "${RED}✗ 错误: 补丁命名不符合标准 (YYYYMMDD_name.sql): ${patch_name}${NC}"
            unset PGPASSWORD
            return 1
        fi
        if [ -n "${last_patch_version}" ] && [[ "${patch_version}" < "${last_patch_version}" ]]; then
            echo -e "${RED}✗ 错误: 补丁顺序异常 ${patch_name} < ${last_patch_version}${NC}"
            unset PGPASSWORD
            return 1
        fi
        last_patch_version="${patch_version}"
        local patch_checksum
        case "$checksum_tool" in
            sha256sum)
                patch_checksum="$(sha256sum "$patch" | awk '{print $1}')"
                ;;
            shasum)
                patch_checksum="$(shasum -a 256 "$patch" | awk '{print $1}')"
                ;;
            openssl)
                patch_checksum="$(openssl dgst -sha256 "$patch" | awk '{print $NF}')"
                ;;
        esac
        if [ -z "${patch_checksum}" ]; then
            echo -e "${RED}✗ 错误: 无法计算补丁摘要 ${patch_name}${NC}"
            unset PGPASSWORD
            return 1
        fi

        local version_row
        version_row="$(psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -tA -F '|' -c "SELECT filename, checksum FROM ${migration_table} WHERE version='${patch_version}' LIMIT 1;")"
        if [ -n "${version_row}" ]; then
            local stored_filename
            stored_filename="${version_row%%|*}"
            local stored_checksum
            stored_checksum="${version_row#*|}"
            local normalized_stored_filename
            normalized_stored_filename="$(echo "${stored_filename}" | tr -d '[:space:]')"
            local normalized_stored_checksum
            normalized_stored_checksum="$(echo "${stored_checksum}" | tr -d '[:space:]')"
            if [ "${normalized_stored_filename}" != "${patch_name}" ]; then
                echo -e "${RED}✗ 错误: 补丁版本冲突 version=${patch_version}${NC}"
                echo -e "${RED}    已登记文件: ${normalized_stored_filename}${NC}"
                echo -e "${RED}    当前文件:   ${patch_name}${NC}"
                unset PGPASSWORD
                return 1
            fi
            if [ "${normalized_stored_checksum}" != "${patch_checksum}" ]; then
                echo -e "${RED}✗ 错误: 补丁摘要不匹配 ${patch_name}${NC}"
                echo -e "${RED}    记录摘要: ${normalized_stored_checksum}${NC}"
                echo -e "${RED}    当前摘要: ${patch_checksum}${NC}"
                unset PGPASSWORD
                return 1
            fi
            skipped_count=$((skipped_count + 1))
            echo -e "${YELLOW}  [${patch_count}] 跳过 ${patch_name} (已执行)${NC}"
            continue
        fi

        local filename_row
        filename_row="$(psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -tA -F '|' -c "SELECT version, checksum FROM ${migration_table} WHERE filename='${patch_name_sql}' LIMIT 1;")"
        if [ -n "${filename_row}" ]; then
            local stored_version
            stored_version="${filename_row%%|*}"
            local stored_checksum
            stored_checksum="${filename_row#*|}"
            local normalized_stored_version
            normalized_stored_version="$(echo "${stored_version}" | tr -d '[:space:]')"
            local normalized_stored_checksum
            normalized_stored_checksum="$(echo "${stored_checksum}" | tr -d '[:space:]')"
            if [ -n "${normalized_stored_version}" ] && [ "${normalized_stored_version}" != "${patch_version}" ]; then
                echo -e "${RED}✗ 错误: 补丁版本冲突 ${patch_name} 已绑定 version=${normalized_stored_version}${NC}"
                unset PGPASSWORD
                return 1
            fi
            if [ -n "${normalized_stored_checksum}" ] && [ "${normalized_stored_checksum}" != "${patch_checksum}" ]; then
                echo -e "${RED}✗ 错误: 补丁摘要不匹配 ${patch_name}${NC}"
                echo -e "${RED}    记录摘要: ${normalized_stored_checksum}${NC}"
                echo -e "${RED}    当前摘要: ${patch_checksum}${NC}"
                unset PGPASSWORD
                return 1
            fi
            psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "UPDATE ${migration_table} SET version='${patch_version}', checksum='${patch_checksum}' WHERE filename='${patch_name_sql}';" > /dev/null
            skipped_count=$((skipped_count + 1))
            backfilled_count=$((backfilled_count + 1))
            echo -e "${YELLOW}  [${patch_count}] 已回填版本/摘要 ${patch_name}${NC}"
            continue
        fi

        echo -e "${BLUE}  [${patch_count}] 执行 ${patch_name}${NC}"
        psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "$patch"
        psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "INSERT INTO ${migration_table} (filename, version, checksum) VALUES ('${patch_name_sql}', '${patch_version}', '${patch_checksum}');" > /dev/null
        applied_count=$((applied_count + 1))
    done

    unset PGPASSWORD

    if [ "$patch_count" -eq 0 ]; then
        echo -e "${YELLOW}⚠ 补丁目录为空，跳过${NC}"
    else
        echo -e "${GREEN}✓ 数据库补丁执行完成：总计 ${patch_count}，执行 ${applied_count}，跳过 ${skipped_count}，回填摘要 ${backfilled_count}${NC}"
    fi
}

# 生产部署（补丁前置）
deploy_production() {
    local compose_file="$PROJECT_ROOT/docker-compose.prod.yml"

    if [ ! -f "$compose_file" ]; then
        echo -e "${RED}✗ 错误: 生产 compose 文件不存在: $compose_file${NC}"
        return 1
    fi

    apply_db_patches

    echo -e "${BLUE}启动生产环境服务...${NC}"
    docker compose -f "$compose_file" up -d --build
    wait_for_services "$compose_file"
    echo -e "${GREEN}✓ 生产部署完成${NC}"
}

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}检查依赖...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ 错误: Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        echo -e "${RED}✗ 错误: Docker Compose 未安装${NC}"
        exit 1
    fi
    
    # 检查 Docker 服务是否运行
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}✗ 错误: Docker 服务未运行${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 依赖检查通过${NC}"
}

# 加载环境变量
load_env() {
    local env_file="${1:-$DEFAULT_ENV_FILE}"
    
    if [ -f "$env_file" ]; then
        echo -e "${BLUE}加载环境变量: $env_file${NC}"
        set -a
        source "$env_file"
        set +a
    else
        echo -e "${YELLOW}⚠ 警告: 环境变量文件不存在: $env_file${NC}"
        echo -e "${YELLOW}⚠ 将使用默认配置${NC}"
    fi
}

# 检查端口占用
check_ports() {
    echo -e "${BLUE}检查端口占用...${NC}"
    
    local ports=("${APP_PORT:-3000}" "${DB_PORT:-5432}" "${REDIS_PORT:-6379}" "${WUKONGIM_API_PORT:-5001}")
    local conflicts=()
    
    for port in "${ports[@]}"; do
        if command -v nc &> /dev/null; then
            if nc -z localhost "$port" 2>/dev/null; then
                conflicts+=("$port")
            fi
        elif command -v lsof &> /dev/null; then
            if lsof -i:$port &> /dev/null; then
                conflicts+=("$port")
            fi
        fi
    done
    
    if [ ${#conflicts[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠ 警告: 以下端口已被占用: ${conflicts[*]}${NC}"
        echo -e "${YELLOW}⚠ 请修改 .env 文件中的端口配置或停止占用端口的服务${NC}"
    else
        echo -e "${GREEN}✓ 端口检查通过${NC}"
    fi
}

# 检查并创建必要目录
prepare_directories() {
    echo -e "${BLUE}准备目录...${NC}"
    
    mkdir -p "$PROJECT_ROOT/var/logs" 2>/dev/null || true
    mkdir -p "$PROJECT_ROOT/var/data" 2>/dev/null || true
    mkdir -p "$PROJECT_ROOT/database" 2>/dev/null || true
    mkdir -p "$PROJECT_ROOT/etc" 2>/dev/null || true
    
    echo -e "${GREEN}✓ 目录准备完成${NC}"
}

# 准备环境变量文件
prepare_env_file() {
    if [ ! -f "$DEFAULT_ENV_FILE" ]; then
        echo -e "${YELLOW}⚠ 未找到 .env 文件，正在创建默认配置...${NC}"
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$DEFAULT_ENV_FILE"
            echo -e "${GREEN}✓ 已创建 .env 文件，请根据需要修改配置${NC}"
            echo -e "${YELLOW}⚠ 请编辑 .env 文件后再继续${NC}"
            exit 0
        else
            echo -e "${RED}✗ 错误: .env.example 文件不存在${NC}"
            exit 1
        fi
    fi
}

# 安装服务
install_services() {
    echo -e "${BLUE}开始安装服务...${NC}"
    
    # 准备目录
    prepare_directories
    
    # 准备环境变量
    prepare_env_file
    
    # 拉取镜像
    echo -e "${BLUE}拉取 Docker 镜像...${NC}"
    docker compose -f "$COMPOSE_FILE" pull || true
    
    # 构建应用镜像
    echo -e "${BLUE}构建应用镜像...${NC}"
    docker compose -f "$COMPOSE_FILE" build
    
    echo -e "${GREEN}✓ 安装完成!${NC}"
}

# 启动服务
start_services() {
    local compose_file="${1:-$COMPOSE_FILE}"
    local profiles="${2:-}"
    
    echo -e "${BLUE}启动服务...${NC}"
    
    if [ -n "$profiles" ]; then
        echo -e "${BLUE}使用 profiles: $profiles${NC}"
        docker compose -f "$compose_file" --profile $profiles up -d
    else
        docker compose -f "$compose_file" up -d
    fi
    
    echo -e "${GREEN}✓ 服务启动命令已执行${NC}"
    
    # 等待服务启动
    wait_for_services "$compose_file"
}

# 等待服务启动
wait_for_services() {
    local compose_file="${1:-$COMPOSE_FILE}"
    local max_wait=120
    local elapsed=0
    local interval=5
    
    echo -e "${BLUE}等待服务启动...${NC}"
    
    while [ $elapsed -lt $max_wait ]; do
        # 检查应用健康状态
        if curl -sf "http://localhost:${APP_PORT:-3000}/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 服务启动成功!${NC}"
            echo ""
            show_status "$compose_file"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    echo ""
    echo -e "${YELLOW}⚠ 服务启动超时，但服务可能仍在启动中${NC}"
    echo -e "${YELLOW}⚠ 请使用 '$0 status' 检查服务状态${NC}"
    
    return 1
}

# 显示服务状态
show_status() {
    local compose_file="${1:-$COMPOSE_FILE}"
    
    echo ""
    print_line
    echo -e "${BLUE}服务状态:${NC}"
    print_line
    
    docker compose -f "$compose_file" ps
    
    echo ""
    echo -e "${BLUE}资源使用:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null | grep -E "(CONTAINER|openchat)" || true
}

# 停止服务
stop_services() {
    local compose_file="${1:-$COMPOSE_FILE}"
    
    echo -e "${BLUE}停止服务...${NC}"
    docker compose -f "$compose_file" down
    
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 查看日志
logs_services() {
    local service="${1:-}"
    local compose_file="${2:-$COMPOSE_FILE}"
    
    if [ -n "$service" ]; then
        docker compose -f "$compose_file" logs -f "$service"
    else
        docker compose -f "$compose_file" logs -f
    fi
}

# 清理数据
clean_services() {
    local compose_file="${1:-$COMPOSE_FILE}"
    
    echo -e "${RED}⚠ 警告: 这将删除所有数据!${NC}"
    read -p "确定要继续吗? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${BLUE}清理数据...${NC}"
        docker compose -f "$compose_file" down -v
        rm -rf "$PROJECT_ROOT/var/logs"/* 2>/dev/null || true
        rm -rf "$PROJECT_ROOT/var/data"/* 2>/dev/null || true
        echo -e "${GREEN}✓ 数据已清理${NC}"
    else
        echo -e "${YELLOW}⚠ 已取消${NC}"
    fi
}

# 更新服务
update_services() {
    local compose_file="${1:-$COMPOSE_FILE}"
    
    echo -e "${BLUE}更新服务...${NC}"
    
    # 拉取最新镜像
    docker compose -f "$compose_file" pull
    
    # 重新构建
    docker compose -f "$compose_file" build
    
    # 重启服务
    docker compose -f "$compose_file" down
    docker compose -f "$compose_file" up -d
    
    wait_for_services "$compose_file"
    
    echo -e "${GREEN}✓ 更新完成!${NC}"
}

# 外部模式启动
start_external() {
    # 检查环境变量文件
    prepare_env_file
    
    # 加载环境变量
    load_env "$DEFAULT_ENV_FILE"
    
    echo -e "${BLUE}使用外部服务模式启动...${NC}"
    echo ""
    echo "  数据库: ${DB_HOST:-未配置} (端口: ${DB_PORT:-5432})"
    echo "  Redis: ${REDIS_HOST:-未配置} (端口: ${REDIS_PORT:-6379})"
    echo "  WukongIM: ${WUKONGIM_API_URL:-未配置}"
    echo ""
    
    start_services "$EXTERNAL_COMPOSE_FILE"
}

# 快速启动（仅应用）
start_quick() {
    load_env "$DEFAULT_ENV_FILE"
    
    echo -e "${BLUE}快速启动（仅应用）...${NC}"
    
    # 只启动应用，不启动数据库等依赖服务
    # 假设外部服务已经准备好
    docker compose -f "$COMPOSE_FILE" up -d app
    
    wait_for_services "$COMPOSE_FILE"
}

# Profiles 启动
start_with_profiles() {
    local profiles="${1:-$DEFAULT_PROFILES}"
    
    load_env "$DEFAULT_ENV_FILE"
    
    echo -e "${BLUE}使用 profiles 启动: $profiles${NC}"
    
    # 转换逗号为空格
    profiles="${profiles//,/ }"
    
    docker compose -f "$COMPOSE_FILE" --profile $profiles up -d
    
    wait_for_services "$COMPOSE_FILE"
}

# 重新加载配置
reload_services() {
    local compose_file="${1:-$COMPOSE_FILE}"
    
    echo -e "${BLUE}重新加载配置...${NC}"
    
    docker compose -f "$compose_file" up -d --force-recreate
    
    wait_for_services "$compose_file"
    
    echo -e "${GREEN}✓ 配置已重新加载${NC}"
}

# 主命令处理
COMMAND=""
COMPOSE_FILE_ARG="$COMPOSE_FILE"
ENV_FILE_ARG=""
PROFILES_ARG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        install|start|stop|restart|status|clean|update|external|quick|reload|patch-db|patch:db|prod-deploy|prod:deploy)
            COMMAND="$1"
            shift
            ;;
        -f|--file)
            COMPOSE_FILE_ARG="$2"
            shift 2
            ;;
        -e|--env)
            ENV_FILE_ARG="$2"
            shift 2
            ;;
        -p|--profiles)
            PROFILES_ARG="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}✗ 未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 加载环境变量
if [ -n "$ENV_FILE_ARG" ]; then
    load_env "$ENV_FILE_ARG"
else
    load_env "$DEFAULT_ENV_FILE"
fi

# 执行命令
case "$COMMAND" in
    install)
        check_dependencies
        check_ports
        install_services
        start_services "$COMPOSE_FILE_ARG" "$PROFILES_ARG"
        ;;
    start)
        check_dependencies
        check_ports
        start_services "$COMPOSE_FILE_ARG" "$PROFILES_ARG"
        ;;
    stop)
        stop_services "$COMPOSE_FILE_ARG"
        ;;
    restart)
        stop_services "$COMPOSE_FILE_ARG"
        sleep 2
        start_services "$COMPOSE_FILE_ARG" "$PROFILES_ARG"
        ;;
    status)
        show_status "$COMPOSE_FILE_ARG"
        ;;
    logs)
        logs_services "" "$COMPOSE_FILE_ARG"
        ;;
    clean)
        clean_services "$COMPOSE_FILE_ARG"
        ;;
    update)
        check_dependencies
        update_services "$COMPOSE_FILE_ARG"
        ;;
    external)
        check_dependencies
        check_ports
        start_external
        ;;
    quick)
        check_dependencies
        start_quick
        ;;
    reload)
        check_dependencies
        reload_services "$COMPOSE_FILE_ARG"
        ;;
    patch-db|patch:db)
        apply_db_patches
        ;;
    prod-deploy|prod:deploy)
        check_dependencies
        deploy_production
        ;;
    profiles)
        check_dependencies
        check_ports
        start_with_profiles "$PROFILES_ARG"
        ;;
    *)
        show_help
        exit 1
        ;;
esac
