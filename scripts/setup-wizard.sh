#!/bin/bash
# ============================================
# OpenChat - 智能安装向导
# 支持多种安装场景
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

# 应用配置
APP_NAME="OpenChat"
APP_VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 安装配置
INSTALL_ENV="production"
INSTALL_MODE="docker"
USE_EXISTING_DB=false
USE_EXISTING_REDIS=false
DB_HOST=""
DB_PORT=5432
DB_USER=""
DB_PASSWORD=""
DB_NAME="openchat"
REDIS_HOST=""
REDIS_PORT=6379
REDIS_PASSWORD=""
EXTERNAL_IP=""

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_ask() { echo -ne "${YELLOW}[?]${NC} $1"; }

# 显示横幅
show_banner() {
    clear
    echo -e "${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   ██████╗ ██████╗ ███████╗ █████╗ ████████╗ █████╗ ██╗       ║"
    echo "║  ██╔═══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║       ║"
    echo "║  ██║   ██║██████╔╝█████╗  ███████║   ██║   ███████║██║       ║"
    echo "║  ██║   ██║██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══██║██║       ║"
    echo "║  ╚██████╔╝██║  ██║███████╗██║  ██║   ██║   ██║  ██║███████╗  ║"
    echo "║   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝  ║"
    echo "║                                                               ║"
    echo "║           Open Source Instant Messaging Platform              ║"
    echo "║                     智能安装向导 v${APP_VERSION}                      ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_NAME=$NAME
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        OS_NAME="macOS"
    else
        OS="linux"
        OS_NAME="Linux"
    fi
    log_info "检测到操作系统: ${OS_NAME}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 检测已有数据库
detect_existing_database() {
    log_step "检测已有数据库..."
    
    # 检查本地 PostgreSQL
    if command_exists psql; then
        if psql -U postgres -c "SELECT 1" &> /dev/null; then
            log_success "检测到本地 PostgreSQL 服务"
            return 0
        fi
    fi
    
    # 检查 Docker PostgreSQL 容器
    if command_exists docker; then
        if docker ps --format '{{.Names}}' | grep -q "postgres"; then
            log_success "检测到 Docker PostgreSQL 容器"
            return 0
        fi
    fi
    
    log_info "未检测到已有 PostgreSQL 数据库"
    return 1
}

# 检测已有 Redis
detect_existing_redis() {
    log_step "检测已有 Redis..."
    
    # 检查本地 Redis
    if command_exists redis-cli; then
        if redis-cli ping &> /dev/null; then
            log_success "检测到本地 Redis 服务"
            return 0
        fi
    fi
    
    # 检查 Docker Redis 容器
    if command_exists docker; then
        if docker ps --format '{{.Names}}' | grep -q "redis"; then
            log_success "检测到 Docker Redis 容器"
            return 0
        fi
    fi
    
    log_info "未检测到已有 Redis 服务"
    return 1
}

# 选择安装环境
select_environment() {
    echo
    echo -e "${BOLD}请选择安装环境:${NC}"
    echo "  1) 开发环境 (Development)"
    echo "  2) 测试环境 (Testing)"
    echo "  3) 生产环境 (Production)"
    echo
    log_ask "请选择 [1-3, 默认 3]: "
    read -r env_choice
    
    case ${env_choice:-3} in
        1)
            INSTALL_ENV="development"
            ;;
        2)
            INSTALL_ENV="test"
            ;;
        3)
            INSTALL_ENV="production"
            ;;
        *)
            log_warn "无效选择，使用默认生产环境"
            INSTALL_ENV="production"
            ;;
    esac
    
    log_success "选择环境: $INSTALL_ENV"
}

# 选择安装模式
select_install_mode() {
    echo
    echo -e "${BOLD}请选择安装模式:${NC}"
    echo "  1) Docker Compose（推荐，自动管理所有依赖）"
    echo "  2) 独立服务（使用已有数据库和 Redis）"
    echo "  3) 混合模式（使用已有数据库，Docker 管理 Redis）"
    echo "  4) 混合模式（使用已有 Redis，Docker 管理数据库）"
    echo
    log_ask "请选择 [1-4, 默认 1]: "
    read -r mode_choice
    
    case ${mode_choice:-1} in
        1)
            INSTALL_MODE="docker"
            ;;
        2)
            INSTALL_MODE="standalone"
            USE_EXISTING_DB=true
            USE_EXISTING_REDIS=true
            ;;
        3)
            INSTALL_MODE="hybrid-db"
            USE_EXISTING_DB=true
            USE_EXISTING_REDIS=false
            ;;
        4)
            INSTALL_MODE="hybrid-redis"
            USE_EXISTING_DB=false
            USE_EXISTING_REDIS=true
            ;;
        *)
            log_warn "无效选择，使用默认 Docker 模式"
            INSTALL_MODE="docker"
            ;;
    esac
    
    log_success "选择模式: $INSTALL_MODE"
}

# 配置已有数据库
configure_existing_database() {
    echo
    echo -e "${BOLD}配置已有数据库连接:${NC}"
    
    log_ask "数据库主机地址 [localhost]: "
    read -r DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    log_ask "数据库端口 [5432]: "
    read -r DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    log_ask "数据库名称 [openchat]: "
    read -r DB_NAME
    DB_NAME=${DB_NAME:-openchat}
    
    log_ask "数据库用户名: "
    read -r DB_USER
    
    log_ask "数据库密码: "
    read -rs DB_PASSWORD
    echo
    
    # 测试连接
    log_info "测试数据库连接..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
        log_success "数据库连接成功"
    else
        log_error "数据库连接失败，请检查配置"
        return 1
    fi
}

# 配置已有 Redis
configure_existing_redis() {
    echo
    echo -e "${BOLD}配置已有 Redis 连接:${NC}"
    
    log_ask "Redis 主机地址 [localhost]: "
    read -r REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-localhost}
    
    log_ask "Redis 端口 [6379]: "
    read -r REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-6379}
    
    log_ask "Redis 密码 (无密码请留空): "
    read -rs REDIS_PASSWORD
    echo
    
    # 测试连接
    log_info "测试 Redis 连接..."
    if [ -n "$REDIS_PASSWORD" ]; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping &> /dev/null; then
            log_success "Redis 连接成功"
        else
            log_error "Redis 连接失败，请检查配置"
            return 1
        fi
    else
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
            log_success "Redis 连接成功"
        else
            log_error "Redis 连接失败，请检查配置"
            return 1
        fi
    fi
}

# 获取服务器 IP
get_server_ip() {
    log_step "获取服务器 IP 地址..."
    
    # 尝试获取外网 IP
    EXTERNAL_IP=$(curl -s -4 --connect-timeout 5 ifconfig.me 2>/dev/null || curl -s -4 --connect-timeout 5 icanhazip.com 2>/dev/null || echo "")
    
    if [ -z "$EXTERNAL_IP" ]; then
        # 获取内网 IP
        if [[ "$OSTYPE" == "darwin"* ]]; then
            EXTERNAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
        else
            EXTERNAL_IP=$(hostname -I | awk '{print $1}')
        fi
    fi
    
    log_ask "请输入服务器外网 IP [$EXTERNAL_IP]: "
    read -r input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    log_success "服务器 IP: $EXTERNAL_IP"
}

# 生成随机密码
generate_password() {
    openssl rand -base64 16 | tr -d '/+=' | head -c 24
}

# 生成 JWT 密钥
generate_jwt_secret() {
    openssl rand -base64 32
}

# 创建环境配置文件
create_env_file() {
    log_step "创建环境配置文件..."
    
    local env_file=".env"
    
    # 根据环境选择模板
    if [ "$INSTALL_ENV" = "development" ]; then
        cp ".env.development" "$env_file"
    elif [ "$INSTALL_ENV" = "test" ]; then
        cp ".env.test" "$env_file"
    else
        cp ".env.production" "$env_file"
    fi
    
    # 更新配置
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/EXTERNAL_IP=.*/EXTERNAL_IP=$EXTERNAL_IP/" "$env_file"
        sed -i '' "s/DB_HOST=.*/DB_HOST=$DB_HOST/" "$env_file"
        sed -i '' "s/DB_PORT=.*/DB_PORT=$DB_PORT/" "$env_file"
        sed -i '' "s/DB_USER=.*/DB_USER=$DB_USER/" "$env_file"
        sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$env_file"
        sed -i '' "s/DB_NAME=.*/DB_NAME=$DB_NAME/" "$env_file"
        sed -i '' "s/REDIS_HOST=.*/REDIS_HOST=$REDIS_HOST/" "$env_file"
        sed -i '' "s/REDIS_PORT=.*/REDIS_PORT=$REDIS_PORT/" "$env_file"
        sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "$env_file"
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$(generate_jwt_secret)/" "$env_file"
    else
        sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=$EXTERNAL_IP/" "$env_file"
        sed -i "s/DB_HOST=.*/DB_HOST=$DB_HOST/" "$env_file"
        sed -i "s/DB_PORT=.*/DB_PORT=$DB_PORT/" "$env_file"
        sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" "$env_file"
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$env_file"
        sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" "$env_file"
        sed -i "s/REDIS_HOST=.*/REDIS_HOST=$REDIS_HOST/" "$env_file"
        sed -i "s/REDIS_PORT=.*/REDIS_PORT=$REDIS_PORT/" "$env_file"
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "$env_file"
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(generate_jwt_secret)/" "$env_file"
    fi
    
    log_success "环境配置文件创建完成"
}

# 创建 Docker Compose 配置
create_docker_compose_config() {
    log_step "创建 Docker Compose 配置..."
    
    local compose_file="docker-compose.override.yml"
    
    # 根据模式创建不同的配置
    if [ "$USE_EXISTING_DB" = true ] && [ "$USE_EXISTING_REDIS" = true ]; then
        # 使用已有数据库和 Redis
        cat > "$compose_file" << EOF
# OpenChat Docker Compose 覆盖配置
# 使用已有数据库和 Redis
version: '3.8'

services:
  app:
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF
    elif [ "$USE_EXISTING_DB" = true ]; then
        # 使用已有数据库，Docker 管理 Redis
        cat > "$compose_file" << EOF
# OpenChat Docker Compose 覆盖配置
# 使用已有数据库，Docker 管理 Redis
version: '3.8'

services:
  app:
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - redis
EOF
    elif [ "$USE_EXISTING_REDIS" = true ]; then
        # 使用已有 Redis，Docker 管理数据库
        cat > "$compose_file" << EOF
# OpenChat Docker Compose 覆盖配置
# 使用已有 Redis，Docker 管理数据库
version: '3.8'

services:
  app:
    environment:
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - postgres
EOF
    fi
    
    log_success "Docker Compose 配置创建完成"
}

# 初始化数据库
initialize_database() {
    log_step "初始化数据库..."
    
    if [ "$USE_EXISTING_DB" = true ]; then
        log_info "使用已有数据库，检查表结构..."
        
        # 检查表是否存在
        local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
        
        if [ "$table_count" -gt 0 ]; then
            log_warn "数据库中已有表结构"
            log_ask "是否重新初始化? 这将删除现有数据! (y/N): "
            read -r confirm
            if [[ ! $confirm =~ ^[Yy]$ ]]; then
                log_info "跳过数据库初始化"
                return 0
            fi
        fi
    fi
    
    # 执行数据库初始化脚本
    if [ -f "database/schema.sql" ]; then
        log_info "执行数据库初始化脚本..."
        if [ "$USE_EXISTING_DB" = true ]; then
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/schema.sql
        else
            docker compose exec -T postgres psql -U openchat -d openchat -f /docker-entrypoint-initdb.d/01-schema.sql
        fi
        log_success "数据库初始化完成"
    fi
}

# 启动服务
start_services() {
    log_step "启动服务..."
    
    case $INSTALL_MODE in
        docker|hybrid-db|hybrid-redis)
            log_info "拉取 Docker 镜像..."
            docker compose pull
            
            log_info "启动 Docker 服务..."
            docker compose up -d
            
            log_info "等待服务就绪..."
            sleep 10
            
            # 检查服务状态
            if docker compose ps | grep -q "Up"; then
                log_success "服务启动成功"
            else
                log_error "服务启动失败，请检查日志"
                docker compose logs
                return 1
            fi
            ;;
        standalone)
            log_info "安装 Node.js 依赖..."
            npm install
            
            log_info "构建应用..."
            npm run build
            
            log_info "启动应用..."
            npm run start:prod &
            
            log_success "服务启动成功"
            ;;
    esac
}

# 显示安装结果
show_install_result() {
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🎉 安装成功！                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}安装信息:${NC}"
    echo "  • 安装环境: $INSTALL_ENV"
    echo "  • 安装模式: $INSTALL_MODE"
    echo "  • 数据库: $([ "$USE_EXISTING_DB" = true ] && echo "已有 ($DB_HOST:$DB_PORT/$DB_NAME)" || echo "Docker 管理")"
    echo "  • Redis: $([ "$USE_EXISTING_REDIS" = true ] && echo "已有 ($REDIS_HOST:$REDIS_PORT)" || echo "Docker 管理")"
    echo
    echo -e "${BOLD}服务访问地址:${NC}"
    echo "  • OpenChat API:    http://${EXTERNAL_IP}:3000"
    echo "  • API 文档:        http://${EXTERNAL_IP}:3000/api/docs"
    echo "  • 健康检查:        http://${EXTERNAL_IP}:3000/health"
    echo
    echo -e "${BOLD}常用命令:${NC}"
    echo "  • 查看日志:    docker compose logs -f"
    echo "  • 停止服务:    docker compose down"
    echo "  • 重启服务:    docker compose restart"
    echo
    echo -e "${YELLOW}安全提示:${NC}"
    echo "  ⚠️  请妥善保管 .env 文件中的密码和密钥"
    echo "  ⚠️  生产环境建议启用 HTTPS"
    echo
}

# 主安装流程
main() {
    show_banner
    
    # 检测操作系统
    detect_os
    
    # 选择安装环境
    select_environment
    
    # 检测已有服务
    local has_db=false
    local has_redis=false
    
    if detect_existing_database; then
        has_db=true
    fi
    
    if detect_existing_redis; then
        has_redis=true
    fi
    
    # 选择安装模式
    select_install_mode
    
    # 配置数据库
    if [ "$USE_EXISTING_DB" = true ]; then
        if [ "$has_db" = true ]; then
            log_ask "检测到已有数据库，是否使用? (Y/n): "
            read -r use_existing
            if [[ ! $use_existing =~ ^[Nn]$ ]]; then
                configure_existing_database
            else
                USE_EXISTING_DB=false
            fi
        else
            configure_existing_database
        fi
    fi
    
    # 配置 Redis
    if [ "$USE_EXISTING_REDIS" = true ]; then
        if [ "$has_redis" = true ]; then
            log_ask "检测到已有 Redis，是否使用? (Y/n): "
            read -r use_existing
            if [[ ! $use_existing =~ ^[Nn]$ ]]; then
                configure_existing_redis
            else
                USE_EXISTING_REDIS=false
            fi
        else
            configure_existing_redis
        fi
    fi
    
    # 设置默认值
    if [ "$USE_EXISTING_DB" = false ]; then
        DB_HOST="postgres"
        DB_USER="openchat"
        DB_PASSWORD=$(generate_password)
        DB_NAME="openchat"
    fi
    
    if [ "$USE_EXISTING_REDIS" = false ]; then
        REDIS_HOST="redis"
        REDIS_PASSWORD=$(generate_password)
    fi
    
    # 获取服务器 IP
    get_server_ip
    
    # 创建配置文件
    create_env_file
    create_docker_compose_config
    
    # 初始化数据库
    initialize_database
    
    # 启动服务
    start_services
    
    # 显示结果
    show_install_result
}

# 运行主程序
main "$@"
