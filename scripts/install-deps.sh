#!/bin/bash
# ============================================
# OpenChat - 依赖安装脚本
# 自动安装缺失的依赖
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
        OS="unknown"
    fi
    echo -e "${BLUE}检测到操作系统: ${OS_NAME:-$OS}${NC}"
}

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 检查是否为 root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行此脚本"
        echo "示例: sudo $0"
        exit 1
    fi
}

# 安装 Docker
install_docker() {
    log_step "安装 Docker..."
    
    case $OS in
        ubuntu|debian)
            log_info "更新软件包索引..."
            apt-get update
            
            log_info "安装依赖..."
            apt-get install -y ca-certificates curl gnupg lsb-release
            
            log_info "添加 Docker 官方 GPG 密钥..."
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
            
            log_info "添加 Docker 软件源..."
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            log_info "安装 Docker..."
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            
            log_info "启动 Docker 服务..."
            systemctl enable docker
            systemctl start docker
            ;;
            
        centos|rhel|rocky|almalinux)
            log_info "安装依赖..."
            yum install -y yum-utils
            
            log_info "添加 Docker 软件源..."
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            
            log_info "安装 Docker..."
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            
            log_info "启动 Docker 服务..."
            systemctl enable docker
            systemctl start docker
            ;;
            
        fedora)
            log_info "安装依赖..."
            dnf install -y dnf-plugins-core
            
            log_info "添加 Docker 软件源..."
            dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            
            log_info "安装 Docker..."
            dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            
            log_info "启动 Docker 服务..."
            systemctl enable docker
            systemctl start docker
            ;;
            
        macos)
            log_error "macOS 请手动安装 Docker Desktop"
            echo "下载地址: https://www.docker.com/products/docker-desktop"
            exit 1
            ;;
            
        *)
            log_error "不支持的操作系统: $OS"
            echo "请手动安装 Docker: https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
    
    # 验证安装
    if command_exists docker; then
        log_success "Docker 安装成功: $(docker --version)"
    else
        log_error "Docker 安装失败"
        exit 1
    fi
}

# 安装 Docker Compose（独立版本）
install_docker_compose() {
    log_step "安装 Docker Compose..."
    
    # 检查是否已通过 Docker 插件安装
    if docker compose version &>/dev/null; then
        log_success "Docker Compose 已作为 Docker 插件安装"
        return 0
    fi
    
    local COMPOSE_VERSION="v2.24.0"
    local COMPOSE_URL="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"
    
    log_info "下载 Docker Compose $COMPOSE_VERSION..."
    curl -L "$COMPOSE_URL" -o /usr/local/bin/docker-compose
    
    log_info "设置执行权限..."
    chmod +x /usr/local/bin/docker-compose
    
    # 验证安装
    if command_exists docker-compose; then
        log_success "Docker Compose 安装成功: $(docker-compose --version)"
    else
        log_error "Docker Compose 安装失败"
        exit 1
    fi
}

# 安装 Node.js
install_nodejs() {
    log_step "安装 Node.js..."
    
    local NODE_VERSION=${1:-18}
    
    case $OS in
        ubuntu|debian)
            log_info "添加 NodeSource 软件源..."
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
            
            log_info "安装 Node.js..."
            apt-get install -y nodejs
            ;;
            
        centos|rhel|rocky|almalinux)
            log_info "添加 NodeSource 软件源..."
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
            
            log_info "安装 Node.js..."
            yum install -y nodejs
            ;;
            
        fedora)
            log_info "安装 Node.js..."
            dnf install -y nodejs
            ;;
            
        macos)
            if command_exists brew; then
                log_info "使用 Homebrew 安装 Node.js..."
                brew install node@${NODE_VERSION}
            else
                log_error "请先安装 Homebrew: https://brew.sh/"
                exit 1
            fi
            ;;
            
        *)
            log_error "不支持的操作系统: $OS"
            echo "请手动安装 Node.js: https://nodejs.org/"
            exit 1
            ;;
    esac
    
    # 验证安装
    if command_exists node; then
        log_success "Node.js 安装成功: $(node --version)"
        log_success "npm 版本: $(npm --version)"
    else
        log_error "Node.js 安装失败"
        exit 1
    fi
}

# 安装 PostgreSQL 客户端工具
install_postgresql_client() {
    log_step "安装 PostgreSQL 客户端工具..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y postgresql-client
            ;;
            
        centos|rhel|rocky|almalinux)
            yum install -y postgresql
            ;;
            
        fedora)
            dnf install -y postgresql
            ;;
            
        macos)
            if command_exists brew; then
                brew install postgresql
            else
                log_error "请先安装 Homebrew: https://brew.sh/"
                exit 1
            fi
            ;;
            
        *)
            log_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac
    
    if command_exists psql; then
        log_success "PostgreSQL 客户端安装成功"
    else
        log_error "PostgreSQL 客户端安装失败"
        exit 1
    fi
}

# 安装 Redis 客户端工具
install_redis_client() {
    log_step "安装 Redis 客户端工具..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y redis-tools
            ;;
            
        centos|rhel|rocky|almalinux)
            yum install -y redis
            ;;
            
        fedora)
            dnf install -y redis
            ;;
            
        macos)
            if command_exists brew; then
                brew install redis
            else
                log_error "请先安装 Homebrew: https://brew.sh/"
                exit 1
            fi
            ;;
            
        *)
            log_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac
    
    if command_exists redis-cli; then
        log_success "Redis 客户端安装成功"
    else
        log_error "Redis 客户端安装失败"
        exit 1
    fi
}

# 安装常用工具
install_common_tools() {
    log_step "安装常用工具..."
    
    local tools=()
    
    case $OS in
        ubuntu|debian)
            tools=(curl wget git vim htop net-tools lsof)
            apt-get update
            apt-get install -y "${tools[@]}"
            ;;
            
        centos|rhel|rocky|almalinux)
            tools=(curl wget git vim htop net-tools lsof)
            yum install -y "${tools[@]}"
            ;;
            
        fedora)
            tools=(curl wget git vim htop net-tools lsof)
            dnf install -y "${tools[@]}"
            ;;
            
        macos)
            if command_exists brew; then
                brew install curl wget git htop
            fi
            ;;
    esac
    
    log_success "常用工具安装完成"
}

# 将用户加入 docker 组
add_user_to_docker_group() {
    local user=${1:-$SUDO_USER}
    
    if [ -z "$user" ]; then
        user=$(whoami)
    fi
    
    log_step "将用户 $user 加入 docker 组..."
    
    if getent group docker > /dev/null 2>&1; then
        usermod -aG docker "$user"
        log_success "用户 $user 已加入 docker 组"
        log_warn "请注销后重新登录以生效"
    else
        groupadd docker
        usermod -aG docker "$user"
        log_success "已创建 docker 组并添加用户 $user"
    fi
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  docker           安装 Docker"
    echo "  docker-compose   安装 Docker Compose"
    echo "  nodejs [版本]    安装 Node.js (默认版本 18)"
    echo "  psql             安装 PostgreSQL 客户端"
    echo "  redis            安装 Redis 客户端"
    echo "  all              安装所有依赖"
    echo "  --help, -h       显示帮助信息"
    echo
    echo "示例:"
    echo "  $0 docker              # 安装 Docker"
    echo "  $0 nodejs 20           # 安装 Node.js 20"
    echo "  $0 all                 # 安装所有依赖"
    echo
}

# 安装所有依赖
install_all() {
    log_info "安装所有依赖..."
    
    if ! command_exists docker; then
        install_docker
    else
        log_success "Docker 已安装"
    fi
    
    if ! docker compose version &>/dev/null && ! command_exists docker-compose; then
        install_docker_compose
    else
        log_success "Docker Compose 已安装"
    fi
    
    if ! command_exists curl; then
        install_common_tools
    fi
    
    log_success "所有依赖安装完成"
}

# 主程序
main() {
    local action=${1:-help}
    
    # 检测操作系统
    detect_os
    
    # macOS 不需要 root
    if [ "$OS" != "macos" ]; then
        check_root
    fi
    
    case $action in
        docker)
            install_docker
            add_user_to_docker_group
            ;;
        docker-compose)
            install_docker_compose
            ;;
        nodejs)
            install_nodejs ${2:-18}
            ;;
        psql|postgresql)
            install_postgresql_client
            ;;
        redis)
            install_redis_client
            ;;
        tools)
            install_common_tools
            ;;
        all)
            install_all
            ;;
        --help|-h|help)
            show_help
            ;;
        *)
            log_error "未知选项: $action"
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"
