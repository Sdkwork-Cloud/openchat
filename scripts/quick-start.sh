#!/bin/bash
# ============================================
# OpenChat Server - 一键部署脚本
# 集成悟空IM，实现快速启动
# ============================================

set -e

ENV_FILE=".env.quickstart"
BASE_ENV_FILE=".env.development"
COMPOSE_FILE="docker-compose.quick.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示横幅
show_banner() {
    echo
    echo "============================================"
    echo "  OpenChat Server + 悟空IM 一键部署"
    echo "============================================"
    echo
}

# 检查 Docker
check_docker() {
    log_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "未找到 Docker，请先安装 Docker"
        log_info "安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "未找到 docker compose，请先安装 Docker Compose 插件"
        log_info "安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 获取服务器IP
get_server_ip() {
    log_info "检测服务器IP地址..."
    
    # 尝试获取外网IP
    EXTERNAL_IP=$(curl -s -4 ifconfig.me 2>/dev/null || echo "")
    
    if [ -z "$EXTERNAL_IP" ]; then
        # 获取内网IP
        EXTERNAL_IP=$(hostname -I | awk '{print $1}')
    fi
    
    log_info "检测到服务器IP: $EXTERNAL_IP"
    
    # 询问用户确认
    read -p "请确认服务器外网IP [$EXTERNAL_IP]: " input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    export EXTERNAL_IP
    export INTERNAL_IP="wukongim"
}

# 配置环境变量
setup_env() {
    log_info "配置环境变量..."
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$BASE_ENV_FILE" ]; then
            cp "$BASE_ENV_FILE" "$ENV_FILE"
        else
            cp .env.example "$ENV_FILE"
        fi
        
        # 更新环境变量
        sed -i "s/^EXTERNAL_IP=.*/EXTERNAL_IP=$EXTERNAL_IP/" "$ENV_FILE"
        
        # 生成随机JWT密钥
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$ENV_FILE"
        
        log_success "环境变量配置完成"
        log_warn "如需自定义，请编辑 $ENV_FILE"
    else
        log_warn "$ENV_FILE 已存在，跳过初始化"
    fi
}

# 创建必要目录
setup_directories() {
    log_info "创建必要目录..."
    
    mkdir -p var/logs var/data var/run
    
    log_success "目录创建完成"
}

# 拉取镜像
pull_images() {
    log_info "拉取 Docker 镜像..."
    
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
    
    log_success "镜像拉取完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    echo -n "等待 PostgreSQL"
    for i in {1..30}; do
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U openchat -d openchat &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    echo -n "等待 Redis"
    for i in {1..30}; do
        if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T redis redis-cli -a redis_password ping &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    echo -n "等待悟空IM"
    for i in {1..60}; do
        if curl -s http://localhost:5001/health &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    echo -n "等待 OpenChat Server"
    for i in {1..60}; do
        if curl -s http://localhost:3000/health &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    log_success "所有服务已就绪"
}

# 显示访问信息
show_access_info() {
    echo
    echo "============================================"
    echo "  🎉 部署成功！"
    echo "============================================"
    echo
    echo "服务访问地址:"
    echo "  • OpenChat API:    http://$EXTERNAL_IP:3000"
    echo "  • 悟空IM Demo:     http://$EXTERNAL_IP:5172"
    echo "  • 悟空IM 管理后台: http://$EXTERNAL_IP:5300/web"
    echo "  • Prometheus:      http://$EXTERNAL_IP:9090"
    echo
    echo "端口说明:"
    echo "  • 3000  - OpenChat Server API"
    echo "  • 5100  - 悟空IM TCP 端口"
    echo "  • 5200  - 悟空IM WebSocket 端口"
    echo "  • 5172  - 悟空IM Demo"
    echo "  • 5300  - 悟空IM 管理后台"
    echo "  • 5001  - 悟空IM HTTP API (仅限内网)"
    echo
    echo "常用命令:"
    echo "  • 查看日志:    docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
    echo "  • 停止服务:    docker compose --env-file $ENV_FILE -f $COMPOSE_FILE down"
    echo "  • 重启服务:    docker compose --env-file $ENV_FILE -f $COMPOSE_FILE restart"
    echo "  • 查看状态:    docker compose --env-file $ENV_FILE -f $COMPOSE_FILE ps"
    echo
    echo "安全提示:"
    echo "  ⚠️  快速体验环境文件: $ENV_FILE"
    echo "  ⚠️  建议配置防火墙，限制 5001 端口仅内网访问"
    echo "  ⚠️  建议启用 HTTPS"
    echo
    echo "============================================"
}

# 主程序
main() {
    show_banner
    
    check_docker
    get_server_ip
    setup_env
    setup_directories
    pull_images
    start_services
    wait_for_services
    show_access_info
}

# 运行主程序
main "$@"
