#!/bin/bash
# ============================================
# OpenChat - 一键安装脚本
# 快速体验 OpenChat
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
    echo "║                     一键安装脚本                              ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 检查 Docker
check_docker() {
    if ! command_exists docker; then
        echo -e "${RED}错误: 未找到 Docker${NC}"
        echo
        echo "请先安装 Docker:"
        echo "  - Linux: curl -fsSL https://get.docker.com | sh"
        echo "  - macOS: https://docs.docker.com/desktop/install/mac-install/"
        echo "  - Windows: https://docs.docker.com/desktop/install/windows-install/"
        echo
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}错误: Docker 服务未运行${NC}"
        echo "请启动 Docker 服务后重试"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 已安装并运行${NC}"
}

# 检查 Docker Compose
check_docker_compose() {
    if docker compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
    elif command_exists docker-compose; then
        echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
    else
        echo -e "${RED}错误: 未找到 Docker Compose${NC}"
        echo "请安装 Docker Compose 后重试"
        exit 1
    fi
}

# 获取服务器 IP
get_server_ip() {
    echo -e "${BLUE}检测服务器 IP 地址...${NC}"
    
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
    
    echo -e "${CYAN}检测到服务器 IP: $EXTERNAL_IP${NC}"
    
    read -p "请确认服务器外网 IP [$EXTERNAL_IP]: " input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    export EXTERNAL_IP
}

# 配置环境变量
setup_env() {
    echo -e "${BLUE}配置环境变量...${NC}"
    
    if [ ! -f ".env" ]; then
        # 下载 .env.example 或创建默认配置
        if [ -f ".env.example" ]; then
            cp .env.example .env
        else
            # 创建默认配置
            cat > .env << EOF
# OpenChat 环境配置
# 自动生成于 $(date)

# 服务器配置
EXTERNAL_IP=${EXTERNAL_IP}
PORT=3000

# 数据库配置
DB_USER=openchat
DB_PASSWORD=$(openssl rand -base64 16)
DB_NAME=openchat
DB_PORT=5432

# Redis 配置
REDIS_PASSWORD=$(openssl rand -base64 16)
REDIS_PORT=6379

# JWT 密钥
JWT_SECRET=$(openssl rand -base64 32)

# 悟空IM 配置
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://${EXTERNAL_IP}:5200
EOF
        fi
        
        # 更新环境变量
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/EXTERNAL_IP=.*/EXTERNAL_IP=${EXTERNAL_IP}/" .env 2>/dev/null || true
            sed -i '' "s|WS_URL=.*|WS_URL=ws://${EXTERNAL_IP}:5200|" .env 2>/dev/null || true
        else
            sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=${EXTERNAL_IP}/" .env 2>/dev/null || true
            sed -i "s|WS_URL=.*|WS_URL=ws://${EXTERNAL_IP}:5200|" .env 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✓ 环境变量配置完成${NC}"
    else
        echo -e "${YELLOW}!.env 文件已存在，跳过配置${NC}"
    fi
}

# 拉取镜像
pull_images() {
    echo -e "${BLUE}拉取 Docker 镜像...${NC}"
    echo -e "${CYAN}这可能需要几分钟，请耐心等待...${NC}"
    
    docker compose -f docker-compose.quick.yml pull
    
    echo -e "${GREEN}✓ 镜像拉取完成${NC}"
}

# 启动服务
start_services() {
    echo -e "${BLUE}启动服务...${NC}"
    
    docker compose -f docker-compose.quick.yml up -d
    
    echo -e "${GREEN}✓ 服务启动完成${NC}"
}

# 等待服务就绪
wait_for_services() {
    echo -e "${BLUE}等待服务就绪...${NC}"
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OpenChat 服务已就绪${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}服务启动超时，请检查日志${NC}"
    return 1
}

# 显示访问信息
show_access_info() {
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🎉 安装成功！                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}服务访问地址:${NC}"
    echo "  • OpenChat API:    http://${EXTERNAL_IP}:3000"
    echo "  • API 文档:        http://${EXTERNAL_IP}:3000/api/docs"
    echo "  • 健康检查:        http://${EXTERNAL_IP}:3000/health"
    echo "  • 悟空IM Demo:     http://${EXTERNAL_IP}:5172"
    echo "  • 悟空IM 管理后台: http://${EXTERNAL_IP}:5300/web"
    echo
    echo -e "${BOLD}默认账号:${NC}"
    echo "  • 用户名: admin"
    echo "  • 密码: admin123"
    echo
    echo -e "${BOLD}常用命令:${NC}"
    echo "  • 查看日志:    docker compose logs -f"
    echo "  • 停止服务:    docker compose down"
    echo "  • 重启服务:    docker compose restart"
    echo "  • 查看状态:    docker compose ps"
    echo
    echo -e "${YELLOW}安全提示:${NC}"
    echo "  ⚠️  生产环境请修改 .env 文件中的默认密码"
    echo "  ⚠️  建议配置防火墙，限制数据库端口仅内网访问"
    echo "  ⚠️  建议启用 HTTPS"
    echo
    echo -e "${CYAN}文档: https://github.com/Sdkwork-Cloud/openchat${NC}"
    echo
}

# 主程序
main() {
    show_banner
    
    echo -e "${BOLD}开始一键安装 OpenChat...${NC}"
    echo
    
    # 检查环境
    check_docker
    check_docker_compose
    echo
    
    # 配置
    get_server_ip
    setup_env
    echo
    
    # 安装
    pull_images
    start_services
    echo
    
    # 等待就绪
    wait_for_services
    echo
    
    # 显示信息
    show_access_info
}

# 运行主程序
main "$@"
