#!/bin/bash

# ============================================
# OpenChat 服务健康检查和诊断脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
APP_URL="${APP_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
WUKONGIM_URL="${WUKONGIM_API_URL:-http://localhost:5001}"

# 打印分隔线
print_line() {
    echo -e "${CYAN}=========================================${NC}"
}

# 打印标题
print_header() {
    echo ""
    print_line
    echo -e "${BLUE}$1${NC}"
    print_line
}

# 检查服务是否运行
check_service() {
    local service=$1
    local port=$2
    local url=$3
    
    echo -n "检查 $service ... "
    
    if [ -n "$url" ]; then
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 运行中${NC}"
            return 0
        else
            echo -e "${RED}✗ 不可用${NC}"
            return 1
        fi
    elif [ -n "$port" ]; then
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}✓ 运行中${NC}"
            return 0
        else
            echo -e "${RED}✗ 未运行${NC}"
            return 1
        fi
    fi
    
    echo -e "${YELLOW}? 未知${NC}"
    return 1
}

# 检查 Docker 容器状态
check_docker_containers() {
    print_header "Docker 容器状态"
    
    local containers=("openchat" "openchat-postgres" "openchat-redis" "openchat-wukongim")
    local all_running=true
    
    for container in "${containers[@]}"; do
        local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
        local health=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        
        echo -n "  $container: "
        
        if [ "$status" = "running" ]; then
            if [ "$health" != "none" ] && [ "$health" != "" ]; then
                if [ "$health" = "healthy" ]; then
                    echo -e "${GREEN}运行中 (健康)${NC}"
                else
                    echo -e "${YELLOW}运行中 ($health)${NC}"
                fi
            else
                echo -e "${GREEN}运行中${NC}"
            fi
        else
            echo -e "${RED}未运行 ($status)${NC}"
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        return 0
    else
        return 1
    fi
}

# 检查端口
check_ports() {
    print_header "端口检查"
    
    local ports=(
        "3000:应用服务"
        "5432:PostgreSQL"
        "6379:Redis"
        "5001:WukongIM API"
        "5100:WukongIM TCP"
        "5200:WukongIM WS"
    )
    
    for item in "${ports[@]}"; do
        local port="${item%%:*}"
        local desc="${item##*:}"
        
        echo -n "  端口 $port ($desc): "
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}开放${NC}"
        else
            echo -e "${YELLOW}未开放${NC}"
        fi
    done
}

# 检查应用健康状态
check_app_health() {
    print_header "应用健康检查"
    
    echo -n "  应用健康端点: "
    if curl -sf "$APP_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}正常${NC}"
        
        # 获取详细健康信息
        echo ""
        echo "  健康详情:"
        curl -s "$APP_URL/health" | grep -o '"status":"[^"]*"' | sed 's/^/    /'
    else
        echo -e "${RED}异常${NC}"
        echo -e "  ${YELLOW}提示: 应用可能正在启动或配置有问题${NC}"
    fi
    
    echo ""
    echo -n "  API 文档: "
    if curl -sf "$APP_URL/api/docs" > /dev/null 2>&1; then
        echo -e "${GREEN}可用${NC}"
    else
        echo -e "${YELLOW}不可用${NC}"
    fi
}

# 检查数据库连接
check_database() {
    print_header "数据库连接检查"
    
    echo -n "  PostgreSQL 连接: "
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}正常${NC}"
        
        # 获取数据库信息
        echo ""
        echo "  数据库信息:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | head -20 | sed 's/^/    /'
    else
        echo -e "${RED}异常${NC}"
        echo -e "  ${YELLOW}提示: 检查 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD 配置${NC}"
    fi
}

# 检查 Redis 连接
check_redis() {
    print_header "Redis 连接检查"
    
    echo -n "  Redis 连接: "
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
        echo -e "${GREEN}正常${NC}"
        
        # 获取 Redis 信息
        echo ""
        echo "  Redis 信息:"
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info | grep -E "^(redis_version|connected_clients|used_memory_human)" | sed 's/^/    /'
    else
        echo -e "${RED}异常${NC}"
        echo -e "  ${YELLOW}提示: 检查 REDIS_HOST, REDIS_PORT, REDIS_PASSWORD 配置${NC}"
    fi
}

# 检查 WukongIM 连接
check_wukongim() {
    print_header "WukongIM 连接检查"
    
    echo -n "  WukongIM API: "
    if curl -sf "$WUKONGIM_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}正常${NC}"
        
        # 获取 WukongIM 信息
        echo ""
        echo "  WukongIM 信息:"
        curl -s "$WUKONGIM_URL/varz" 2>/dev/null | grep -oE '"(online_user_count|channel_count)":[^,]*' | sed 's/^/    /' || echo "    无法获取详细信息"
    else
        echo -e "${RED}异常${NC}"
        echo -e "  ${YELLOW}提示: 检查 WUKONGIM_API_URL 配置或 WukongIM 服务是否启动${NC}"
    fi
}

# 检查网络连接
check_network() {
    print_header "网络连通性"
    
    local hosts=(
        "google.com:互联网连接"
        "$DB_HOST:数据库主机"
        "$REDIS_HOST:Redis主机"
    )
    
    for item in "${hosts[@]}"; do
        local host="${item%%:*}"
        local desc="${item##*:}"
        
        echo -n "  $desc: "
        if ping -c 1 -W 2 "$host" > /dev/null 2>&1 || nc -z "$host" 443 2>/dev/null; then
            echo -e "${GREEN}可达${NC}"
        else
            echo -e "${YELLOW}不可达${NC}"
        fi
    done
}

# 检查日志错误
check_logs() {
    print_header "最近错误日志"
    
    local containers=("openchat" "openchat-postgres" "openchat-redis" "openchat-wukongim")
    
    for container in "${containers[@]}"; do
        local errors=$(docker logs --tail 20 "$container" 2>&1 | grep -iE "(error|fatal|exception)" | tail -5)
        
        if [ -n "$errors" ]; then
            echo ""
            echo -e "  ${RED}$container 错误:${NC}"
            echo "$errors" | sed 's/^/    /'
        fi
    done
}

# 检查资源使用
check_resources() {
    print_header "资源使用情况"
    
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "(CONTAINER|openchat|postgres|redis|wukongim)" | sed 's/^/  /'
}

# 检查配置完整性
check_config() {
    print_header "配置检查"
    
    local required_vars=(
        "DB_HOST:数据库主机"
        "DB_PORT:数据库端口"
        "DB_USER:数据库用户"
        "DB_PASSWORD:数据库密码"
        "REDIS_HOST:Redis主机"
        "REDIS_PORT:Redis端口"
        "JWT_SECRET:JWT密钥"
    )
    
    local missing=()
    
    for item in "${required_vars[@]}"; do
        local var="${item%%:*}"
        local desc="${item##*:}"
        
        echo -n "  $desc: "
        if [ -n "${!var}" ]; then
            echo -e "${GREEN}已配置${NC}"
        else
            echo -e "${RED}未配置 ($var)${NC}"
            missing+=("$var")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        echo -e "  ${YELLOW}提示: 缺少必要配置，请检查 .env 文件${NC}"
    fi
}

# 完整诊断
run_full_diagnosis() {
    print_header "OpenChat 完整诊断"
    
    echo -e "${BLUE}开始诊断...${NC}"
    echo ""
    
    check_docker_containers
    echo ""
    
    check_ports
    echo ""
    
    check_config
    echo ""
    
    check_app_health
    echo ""
    
    check_database
    echo ""
    
    check_redis
    echo ""
    
    check_wukongim
    echo ""
    
    check_network
    echo ""
    
    check_resources
    echo ""
    
    check_logs
    
    print_header "诊断完成"
}

# 快速检查
run_quick_check() {
    echo -e "${BLUE}OpenChat 快速检查${NC}"
    echo ""
    
    check_docker_containers
    echo ""
    
    check_app_health
}

# 显示帮助
show_help() {
    echo -e "${BLUE}OpenChat 健康检查和诊断脚本${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  full         运行完整诊断"
    echo "  quick        快速检查"
    echo "  containers   检查容器状态"
    echo "  ports        检查端口"
    echo "  app          检查应用"
    echo "  database     检查数据库"
    echo "  redis        检查 Redis"
    echo "  wukongim     检查 WukongIM"
    echo "  config       检查配置"
    echo "  resources    检查资源"
    echo "  logs         检查日志"
    echo "  help         显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 full          # 完整诊断"
    echo "  $0 quick        # 快速检查"
    echo "  $0 database     # 检查数据库"
}

# 主命令
COMMAND="${1:-quick}"

case "$COMMAND" in
    full)
        run_full_diagnosis
        ;;
    quick)
        run_quick_check
        ;;
    containers)
        check_docker_containers
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
    config)
        check_config
        ;;
    resources)
        check_resources
        ;;
    logs)
        check_logs
        ;;
    network)
        check_network
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}未知命令: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac
