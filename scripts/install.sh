#!/bin/bash
# ============================================
# OpenChat - 统一安装脚本
# 版本: 2.0.0
# 支持: Linux / macOS
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
INSTALL_DIR="${INSTALL_DIR:-/opt/openchat}"

# 安装模式
INSTALL_MODE="${1:-interactive}"

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

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
    echo "║                     Version ${APP_VERSION}                           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  interactive    交互式安装（默认）"
    echo "  docker         Docker 快速安装"
    echo "  kubernetes     Kubernetes 安装"
    echo "  standalone     独立服务安装"
    echo "  uninstall      卸载 OpenChat"
    echo "  upgrade        升级 OpenChat"
    echo "  --help, -h     显示帮助信息"
    echo
    echo "示例:"
    echo "  $0                    # 交互式安装"
    echo "  $0 docker             # Docker 快速安装"
    echo "  $0 standalone         # 独立服务安装"
    echo
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_NAME=$NAME
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ -f /etc/debian_version ]; then
        OS="debian"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    log_info "检测到操作系统: ${OS_NAME:-$OS} ${OS_VERSION:-}"
}

# 检查是否为 root
check_root() {
    if [ "$EUID" -ne 0 ] && [ "$INSTALL_MODE" != "docker" ]; then
        log_error "请使用 root 权限运行安装脚本"
        echo "示例: sudo $0"
        exit 1
    fi
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 检查系统要求
check_requirements() {
    log_step "检查系统要求..."
    local missing=()
    
    # 检查 Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js 版本过低 (当前: $(node --version))，需要 18+"
            missing+=("nodejs")
        else
            log_success "Node.js $(node --version)"
        fi
    else
        log_warn "未找到 Node.js"
        missing+=("nodejs")
    fi
    
    # 检查 npm
    if command_exists npm; then
        log_success "npm $(npm --version)"
    else
        log_warn "未找到 npm"
        missing+=("npm")
    fi
    
    # 检查 Docker（仅 Docker 模式需要）
    if [ "$INSTALL_MODE" == "docker" ]; then
        if command_exists docker; then
            DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            log_success "Docker $DOCKER_VERSION"
        else
            log_error "未找到 Docker，Docker 模式需要安装 Docker"
            missing+=("docker")
        fi
        
        if command_exists docker-compose || docker compose version &> /dev/null; then
            log_success "Docker Compose 已安装"
        else
            log_error "未找到 Docker Compose"
            missing+=("docker-compose")
        fi
    fi
    
    # 检查 PostgreSQL（仅独立模式需要）
    if [ "$INSTALL_MODE" == "standalone" ]; then
        if command_exists psql; then
            log_success "PostgreSQL 已安装"
        else
            log_warn "未找到 PostgreSQL，请确保已安装并运行"
        fi
        
        if command_exists redis-cli; then
            log_success "Redis 已安装"
        else
            log_warn "未找到 Redis，请确保已安装并运行"
        fi
    fi
    
    # 返回缺失的依赖
    if [ ${#missing[@]} -gt 0 ]; then
        echo "${missing[*]}"
        return 1
    fi
    
    return 0
}

# 安装依赖
install_dependencies() {
    local missing=("$@")
    
    if [ ${#missing[@]} -eq 0 ]; then
        return 0
    fi
    
    log_step "安装缺失的依赖..."
    
    read -p "是否自动安装缺失的依赖? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "请手动安装以下依赖: ${missing[*]}"
        exit 1
    fi
    
    for dep in "${missing[@]}"; do
        case $dep in
            nodejs|npm)
                install_nodejs
                ;;
            docker)
                install_docker
                ;;
            docker-compose)
                install_docker_compose
                ;;
        esac
    done
}

# 安装 Node.js
install_nodejs() {
    log_info "安装 Node.js..."
    
    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
            ;;
        rhel|centos|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
            ;;
        macos)
            if command_exists brew; then
                brew install node@18
            else
                log_error "请先安装 Homebrew: https://brew.sh/"
                exit 1
            fi
            ;;
        *)
            log_error "不支持的操作系统，请手动安装 Node.js"
            exit 1
            ;;
    esac
    
    log_success "Node.js 安装完成"
}

# 安装 Docker
install_docker() {
    log_info "安装 Docker..."
    
    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y ca-certificates curl gnupg
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        rhel|centos|fedora)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        macos)
            log_error "macOS 请手动安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
            exit 1
            ;;
        *)
            log_error "不支持的操作系统，请手动安装 Docker"
            exit 1
            ;;
    esac
    
    log_success "Docker 安装完成"
}

# 安装 Docker Compose
install_docker_compose() {
    log_info "安装 Docker Compose..."
    
    if command_exists docker && docker compose version &> /dev/null; then
        log_success "Docker Compose 已作为 Docker 插件安装"
        return
    fi
    
    local COMPOSE_VERSION="v2.24.0"
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose 安装完成"
}

# Docker 安装模式
install_docker_mode() {
    log_step "Docker 模式安装..."
    
    # 检查 Docker 服务
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    
    # 检查端口冲突
    check_port_conflicts
    
    # 获取服务器 IP
    get_server_ip
    
    # 配置环境变量
    setup_env
    
    # 创建必要目录
    mkdir -p var/logs var/data var/run
    
    # 拉取镜像
    log_info "拉取 Docker 镜像..."
    docker compose -f docker-compose.quick.yml pull
    
    # 启动服务
    log_info "启动服务..."
    docker compose -f docker-compose.quick.yml up -d
    
    # 等待服务就绪
    wait_for_services
    
    # 显示访问信息
    show_access_info
}

# 检查端口冲突
check_port_conflicts() {
    log_info "检查端口冲突..."
    
    local ports=("3000:OpenChat API" "5432:PostgreSQL" "6379:Redis" "5001:WukongIM API" "5100:WukongIM TCP" "5200:WukongIM WebSocket" "5300:WukongIM Manager")
    local conflicts=()
    
    for port_info in "${ports[@]}"; do
        local port="${port_info%%:*}"
        local service="${port_info#*:}"
        
        if command -v lsof &> /dev/null; then
            if lsof -i ":$port" &> /dev/null; then
                conflicts+=("$port ($service)")
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                conflicts+=("$port ($service)")
            fi
        elif command -v ss &> /dev/null; then
            if ss -tuln 2>/dev/null | grep -q ":$port "; then
                conflicts+=("$port ($service)")
            fi
        fi
    done
    
    if [ ${#conflicts[@]} -gt 0 ]; then
        log_warn "检测到端口冲突:"
        for conflict in "${conflicts[@]}"; do
            echo "  - $conflict 已被占用"
        done
        echo
        log_warn "您可以:"
        echo "  1. 停止占用端口的服务"
        echo "  2. 修改 .env 文件中的端口配置"
        echo
        read -p "是否继续安装? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "端口检查通过"
    fi
}

# 独立服务安装模式
install_standalone_mode() {
    log_step "独立服务模式安装..."
    
    # 创建用户
    create_user
    
    # 创建目录
    create_directories
    
    # 复制文件
    copy_files
    
    # 安装依赖
    install_npm_dependencies
    
    # 构建应用
    build_application
    
    # 创建系统服务
    create_systemd_service
    
    # 初始化数据库
    init_database
    
    # 显示安装信息
    show_install_info
}

# 获取服务器 IP
get_server_ip() {
    log_info "检测服务器 IP 地址..."
    
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
    
    log_info "检测到服务器 IP: $EXTERNAL_IP"
    
    read -p "请确认服务器外网 IP [$EXTERNAL_IP]: " input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    export EXTERNAL_IP
}

# 配置环境变量
setup_env() {
    log_info "配置环境变量..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        
        # 更新环境变量
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/EXTERNAL_IP=127.0.0.1/EXTERNAL_IP=$EXTERNAL_IP/" .env 2>/dev/null || true
            sed -i '' "s/your-secret-key-change-this-in-production/$(openssl rand -base64 32)/" .env 2>/dev/null || true
        else
            sed -i "s/EXTERNAL_IP=127.0.0.1/EXTERNAL_IP=$EXTERNAL_IP/" .env 2>/dev/null || true
            sed -i "s/your-secret-key-change-this-in-production/$(openssl rand -base64 32)/" .env 2>/dev/null || true
        fi
        
        log_success "环境变量配置完成"
        log_warn "请编辑 .env 文件修改默认密码"
    else
        log_warn ".env 文件已存在，跳过配置"
    fi
}

# 创建用户
create_user() {
    local SERVICE_USER="${SERVICE_USER:-openchat}"
    
    log_info "创建服务用户: $SERVICE_USER"
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_warn "用户 $SERVICE_USER 已存在"
    else
        useradd -r -s /bin/false -d "$INSTALL_DIR" "$SERVICE_USER"
        log_success "用户 $SERVICE_USER 创建成功"
    fi
}

# 创建目录
create_directories() {
    log_info "创建目录结构..."
    
    mkdir -p "$INSTALL_DIR"/{bin,etc,var/{logs,run,data},scripts}
    
    # 设置权限
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR"
    chmod 750 "$INSTALL_DIR/var/logs"
    chmod 750 "$INSTALL_DIR/var/data"
    
    log_success "目录结构创建完成"
}

# 复制文件
copy_files() {
    log_info "复制应用程序文件..."
    
    # 复制必要文件
    cp -r "$SCRIPT_DIR/dist" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/bin" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/etc" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/database" "$INSTALL_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/" 2>/dev/null || true
    
    # 设置权限
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/bin/openchat"
    
    log_success "文件复制完成"
}

# 安装 npm 依赖
install_npm_dependencies() {
    log_info "安装 Node.js 依赖..."
    
    cd "$INSTALL_DIR"
    
    if [ -f "package.json" ]; then
        npm install --production
        log_success "依赖安装完成"
    else
        log_warn "未找到 package.json，跳过依赖安装"
    fi
}

# 构建应用
build_application() {
    log_info "构建应用程序..."
    
    cd "$INSTALL_DIR"
    
    if [ -f "package.json" ]; then
        npm run build
        log_success "应用构建完成"
    else
        log_warn "未找到 package.json，跳过构建"
    fi
}

# 创建 systemd 服务
create_systemd_service() {
    local SERVICE_NAME="openchat"
    local SERVICE_USER="${SERVICE_USER:-openchat}"
    
    log_info "创建 systemd 服务..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=OpenChat Instant Messaging Server
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="NODE_ENV=production"
Environment="OPENCHAT_HOME=$INSTALL_DIR"
ExecStart=/usr/bin/node dist/main.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=5
TimeoutStartSec=30
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log_success "systemd 服务创建完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    read -p "是否初始化数据库? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "数据库名称 [openchat]: " DB_NAME
        DB_NAME=${DB_NAME:-openchat}
        
        read -p "数据库用户 [openchat]: " DB_USERNAME
        DB_USERNAME=${DB_USERNAME:-openchat}
        
        read -sp "数据库密码: " DB_PASS
        echo
        
        # 创建数据库
        sudo -u postgres psql << EOF
CREATE USER $DB_USERNAME WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USERNAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USERNAME;
EOF
        
        # 执行 DDL
        if [ -f "$INSTALL_DIR/database/schema.sql" ]; then
            sudo -u postgres psql -d "$DB_NAME" -f "$INSTALL_DIR/database/schema.sql"
            log_success "数据库表结构创建完成"
        fi
        
        log_success "数据库初始化完成"
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local services=("postgres" "redis" "wukongim" "app")
    local ports=("5432" "6379" "5001" "3000")
    
    for i in "${!services[@]}"; do
        local service="${services[$i]}"
        local port="${ports[$i]}"
        
        echo -n "等待 $service"
        for j in {1..60}; do
            if docker compose exec -T "$service" sh -c "exit 0" &> /dev/null 2>&1; then
                echo " ✓"
                break
            fi
            echo -n "."
            sleep 1
        done
    done
    
    log_success "所有服务已就绪"
}

# 显示访问信息
show_access_info() {
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🎉 安装成功！                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}服务访问地址:${NC}"
    echo "  • OpenChat API:    http://$EXTERNAL_IP:3000"
    echo "  • API 文档:        http://$EXTERNAL_IP:3000/api/docs"
    echo "  • 健康检查:        http://$EXTERNAL_IP:3000/health"
    echo "  • 悟空IM Demo:     http://$EXTERNAL_IP:5172"
    echo "  • 悟空IM 管理后台: http://$EXTERNAL_IP:5300/web"
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
}

# 显示安装信息（独立模式）
show_install_info() {
    local SERVICE_NAME="openchat"
    
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🎉 安装成功！                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}安装信息:${NC}"
    echo "  • 安装目录: $INSTALL_DIR"
    echo "  • 服务用户: $SERVICE_USER"
    echo
    echo -e "${BOLD}常用命令:${NC}"
    echo "  • 启动服务: systemctl start $SERVICE_NAME"
    echo "  • 停止服务: systemctl stop $SERVICE_NAME"
    echo "  • 重启服务: systemctl restart $SERVICE_NAME"
    echo "  • 查看状态: systemctl status $SERVICE_NAME"
    echo "  • 查看日志: journalctl -u $SERVICE_NAME -f"
    echo
    echo -e "${BOLD}配置文件:${NC}"
    echo "  • 主配置: $INSTALL_DIR/etc/config.json"
    echo "  • 环境变量: $INSTALL_DIR/.env"
    echo "  • 日志目录: $INSTALL_DIR/var/logs"
    echo
}

# 交互式安装
interactive_install() {
    show_banner
    
    echo -e "${BOLD}请选择安装模式:${NC}"
    echo
    echo "  1) Docker 快速安装（推荐）"
    echo "  2) 独立服务安装"
    echo "  3) Kubernetes 安装"
    echo "  4) 退出"
    echo
    read -p "请输入选项 [1-4]: " choice
    
    case $choice in
        1)
            INSTALL_MODE="docker"
            check_root
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_docker_mode
            ;;
        2)
            INSTALL_MODE="standalone"
            check_root
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_standalone_mode
            ;;
        3)
            INSTALL_MODE="kubernetes"
            log_info "Kubernetes 安装请参考: docs/deploy/kubernetes.md"
            log_info "快速部署: kubectl apply -k k8s/overlays/production"
            ;;
        4)
            log_info "已取消安装"
            exit 0
            ;;
        *)
            log_error "无效选项"
            exit 1
            ;;
    esac
}

# 卸载
uninstall() {
    log_warn "即将卸载 OpenChat..."
    
    read -p "确认卸载? 此操作不可恢复! (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 停止服务
        systemctl stop openchat 2>/dev/null || true
        systemctl disable openchat 2>/dev/null || true
        rm -f /etc/systemd/system/openchat.service
        systemctl daemon-reload
        
        # 停止 Docker 容器
        docker compose down 2>/dev/null || true
        
        # 删除用户
        userdel -r openchat 2>/dev/null || true
        
        # 删除目录
        read -p "是否删除数据目录 $INSTALL_DIR? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        fi
        
        log_success "卸载完成"
    else
        log_info "已取消卸载"
    fi
}

# 主程序
main() {
    case "$INSTALL_MODE" in
        -h|--help|help)
            show_help
            exit 0
            ;;
        docker)
            show_banner
            check_root
            detect_os
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_docker_mode
            ;;
        standalone)
            show_banner
            check_root
            detect_os
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_standalone_mode
            ;;
        kubernetes)
            show_banner
            log_info "Kubernetes 安装请参考: docs/deploy/kubernetes.md"
            log_info "快速部署: kubectl apply -k k8s/overlays/production"
            ;;
        uninstall)
            uninstall
            ;;
        upgrade)
            log_info "升级功能开发中..."
            ;;
        *)
            interactive_install
            ;;
    esac
}

# 运行主程序
main "$@"
