#!/bin/bash
# ============================================
# OpenChat - 配置验证脚本
# 检查所有配置是否正确
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_check() { echo -ne "${CYAN}[CHECK]${NC} $1 ... "; }

# 检查结果
PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "${GREEN}✓${NC}"; PASS=$((PASS + 1)); }
check_fail() { echo -e "${RED}✗${NC}"; FAIL=$((FAIL + 1)); }
check_warn() { echo -e "${YELLOW}!${NC}"; WARN=$((WARN + 1)); }

# 加载环境变量
load_env() {
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
        log_success "加载 .env 文件"
    else
        log_error "未找到 .env 文件"
        exit 1
    fi
}

# 检查必需的环境变量
check_required_vars() {
    echo
    echo -e "${BOLD}检查必需的环境变量:${NC}"
    
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DB_HOST"
        "DB_PORT"
        "DB_USER"
        "DB_PASSWORD"
        "DB_NAME"
        "REDIS_HOST"
        "REDIS_PORT"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        log_check "$var"
        if [ -n "${!var}" ]; then
            check_pass
        else
            check_fail
            log_error "  未设置 $var"
        fi
    done
}

# 检查安全配置
check_security() {
    echo
    echo -e "${BOLD}检查安全配置:${NC}"
    
    # 检查 JWT 密钥强度
    log_check "JWT 密钥强度"
    if [ ${#JWT_SECRET} -ge 32 ]; then
        check_pass
    else
        check_warn
        log_warn "  JWT 密钥长度应至少 32 个字符"
    fi
    
    # 检查默认密码
    log_check "数据库密码安全性"
    if [[ "$DB_PASSWORD" == *"password"* ]] || [[ "$DB_PASSWORD" == *"123456"* ]] || [[ "$DB_PASSWORD" == *"admin"* ]]; then
        check_fail
        log_error "  数据库密码过于简单"
    else
        check_pass
    fi
    
    # 检查 Redis 密码
    log_check "Redis 密码配置"
    if [ -n "$REDIS_PASSWORD" ]; then
        check_pass
    else
        check_warn
        log_warn "  Redis 未设置密码"
    fi
    
    # 检查生产环境配置
    if [ "$NODE_ENV" = "production" ]; then
        log_check "生产环境配置"
        if [[ "$JWT_SECRET" == *"dev"* ]] || [[ "$JWT_SECRET" == *"test"* ]]; then
            check_fail
            log_error "  生产环境使用了开发密钥"
        else
            check_pass
        fi
    fi
}

# 检查数据库连接
check_database() {
    echo
    echo -e "${BOLD}检查数据库连接:${NC}"
    
    log_check "PostgreSQL 连接"
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
            check_pass
        else
            check_fail
            log_error "  无法连接到数据库"
        fi
    else
        check_warn
        log_warn "  psql 未安装，跳过连接测试"
    fi
    
    # 检查数据库版本
    log_check "PostgreSQL 版本"
    if command -v psql &> /dev/null; then
        local version=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version()" 2>/dev/null | head -1 | tr -d ' ')
        if [ -n "$version" ]; then
            echo -e "${GREEN}✓${NC} PostgreSQL ${version:0:20}..."
            PASS=$((PASS + 1))
        else
            check_fail
        fi
    else
        check_warn
    fi
}

# 检查 Redis 连接
check_redis() {
    echo
    echo -e "${BOLD}检查 Redis 连接:${NC}"
    
    log_check "Redis 连接"
    if command -v redis-cli &> /dev/null; then
        if [ -n "$REDIS_PASSWORD" ]; then
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping &> /dev/null; then
                check_pass
            else
                check_fail
                log_error "  无法连接到 Redis"
            fi
        else
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
                check_pass
            else
                check_fail
                log_error "  无法连接到 Redis"
            fi
        fi
    else
        check_warn
        log_warn "  redis-cli 未安装，跳过连接测试"
    fi
    
    # 检查 Redis 内存
    log_check "Redis 内存状态"
    if command -v redis-cli &> /dev/null; then
        local mem_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        if [ -n "$mem_info" ]; then
            echo -e "${GREEN}✓${NC} 已使用内存: $mem_info"
            PASS=$((PASS + 1))
        else
            check_warn
        fi
    else
        check_warn
    fi
}

# 检查端口可用性
check_ports() {
    echo
    echo -e "${BOLD}检查端口可用性:${NC}"
    
    local ports=("$PORT" "$DB_PORT" "$REDIS_PORT")
    local services=("OpenChat API" "PostgreSQL" "Redis")
    
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local service="${services[$i]}"
        
        log_check "$service 端口 $port"
        if lsof -i :$port &> /dev/null; then
            check_warn
            log_warn "  端口 $port 已被使用"
        else
            check_pass
        fi
    done
}

# 检查文件权限
check_permissions() {
    echo
    echo -e "${BOLD}检查文件权限:${NC}"
    
    local dirs=("var/logs" "var/data" "var/run")
    
    for dir in "${dirs[@]}"; do
        log_check "目录 $dir"
        if [ -d "$dir" ]; then
            if [ -w "$dir" ]; then
                check_pass
            else
                check_fail
                log_error "  目录不可写"
            fi
        else
            check_warn
            log_warn "  目录不存在，将自动创建"
            mkdir -p "$dir"
        fi
    done
}

# 检查依赖服务
check_dependencies() {
    echo
    echo -e "${BOLD}检查依赖服务:${NC}"
    
    # 检查 WukongIM
    log_check "WukongIM 连接"
    if curl -s "${WUKONGIM_API_URL:-http://localhost:5001}/health" &> /dev/null; then
        check_pass
    else
        check_warn
        log_warn "  WukongIM 服务未响应"
    fi
}

# 检查 Docker 环境
check_docker() {
    echo
    echo -e "${BOLD}检查 Docker 环境:${NC}"
    
    log_check "Docker 服务"
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            check_pass
        else
            check_fail
            log_error "  Docker 服务未运行"
        fi
    else
        check_warn
        log_warn "  Docker 未安装"
    fi
    
    log_check "Docker Compose"
    if docker compose version &> /dev/null; then
        check_pass
    elif command -v docker-compose &> /dev/null; then
        check_pass
    else
        check_warn
        log_warn "  Docker Compose 未安装"
    fi
}

# 显示总结
show_summary() {
    echo
    echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║                      检查结果汇总                             ║${NC}"
    echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "  ${GREEN}通过: $PASS${NC}"
    echo -e "  ${YELLOW}警告: $WARN${NC}"
    echo -e "  ${RED}失败: $FAIL${NC}"
    echo
    
    if [ $FAIL -gt 0 ]; then
        echo -e "${RED}存在配置错误，请修复后重试${NC}"
        exit 1
    elif [ $WARN -gt 0 ]; then
        echo -e "${YELLOW}存在配置警告，建议检查${NC}"
        exit 0
    else
        echo -e "${GREEN}所有检查通过，配置正常${NC}"
        exit 0
    fi
}

# 主程序
main() {
    echo -e "${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║               OpenChat 配置验证脚本                           ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    
    # 加载环境变量
    load_env
    
    # 执行检查
    check_required_vars
    check_security
    check_database
    check_redis
    check_ports
    check_permissions
    check_dependencies
    check_docker
    
    # 显示总结
    show_summary
}

# 运行主程序
main
