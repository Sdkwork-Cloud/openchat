#!/bin/bash
# ============================================
# OpenChat - 安装脚本
# 版本: 1.0.0
# 支持: Linux / macOS
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 应用配置
APP_NAME="OpenChat"
APP_VERSION="1.0.0"
INSTALL_DIR="${INSTALL_DIR:-/opt/openchat}"
SERVICE_USER="${SERVICE_USER:-openchat}"
SERVICE_NAME="openchat"

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否为 root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行安装脚本"
        echo "示例: sudo $0"
        exit 1
    fi
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "未找到 Node.js，请先安装 Node.js 16+"
        log_info "安装指南: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        log_error "Node.js 版本过低，需要 16+"
        exit 1
    fi
    log_success "Node.js 版本: $(node --version)"
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "未找到 npm"
        exit 1
    fi
    log_success "npm 版本: $(npm --version)"
    
    # 检查 PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_warn "未找到 PostgreSQL，请确保已安装并运行"
    else
        log_success "PostgreSQL 已安装"
    fi
}

# 创建用户
create_user() {
    log_info "创建服务用户: $SERVICE_USER"
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_warn "用户 $SERVICE_USER 已存在"
    else
        useradd -r -s /bin/false -d "$INSTALL_DIR" "$SERVICE_USER"
        log_success "用户 $SERVICE_USER 创建成功"
    fi
}

# 创建目录结构
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

# 安装依赖
install_dependencies() {
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

# 复制文件
copy_files() {
    log_info "复制应用程序文件..."
    
    # 获取脚本所在目录
    SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
    
    # 复制必要文件
    cp -r "$SCRIPT_DIR/dist" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/bin" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/etc" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/scripts" "$INSTALL_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/" 2>/dev/null || true
    
    # 设置权限
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/bin/openchat"
    
    log_success "文件复制完成"
}

# 创建 systemd 服务
create_systemd_service() {
    log_info "创建 systemd 服务..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=OpenChat
After=network.target postgresql.service redis.service
Wants=postgresql.service

[Service]
Type=forking
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="NODE_ENV=production"
Environment="OPENCHAT_HOME=$INSTALL_DIR"
PIDFile=$INSTALL_DIR/var/run/openchat.pid
ExecStart=$INSTALL_DIR/bin/openchat start
ExecStop=$INSTALL_DIR/bin/openchat stop
ExecReload=$INSTALL_DIR/bin/openchat restart
TimeoutStartSec=30
TimeoutStopSec=30
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
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
        
        read -p "数据库用户 [openchat]: " DB_USER
        DB_USER=${DB_USER:-openchat}
        
        read -sp "数据库密码: " DB_PASS
        echo
        
        # 创建数据库
        sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
        
        # 执行 DDL
        if [ -f "$INSTALL_DIR/database/schema.sql" ]; then
            sudo -u postgres psql -d "$DB_NAME" -f "$INSTALL_DIR/database/schema.sql"
            log_success "数据库表结构创建完成"
        fi
        
        # 更新配置文件
        sed -i "s/\"database\": \"openchat\"/\"database\": \"$DB_NAME\"/" "$INSTALL_DIR/etc/config.json"
        sed -i "s/\"username\": \"openchat\"/\"username\": \"$DB_USER\"/" "$INSTALL_DIR/etc/config.json"
        sed -i "s/\"password\": \"your-password\"/\"password\": \"$DB_PASS\"/" "$INSTALL_DIR/etc/config.json"
        
        log_success "数据库初始化完成"
    fi
}

# 显示安装信息
show_install_info() {
    echo
    echo "============================================"
    echo "  $APP_NAME 安装完成"
    echo "============================================"
    echo
    echo "安装目录: $INSTALL_DIR"
    echo "服务用户: $SERVICE_USER"
    echo
    echo "常用命令:"
    echo "  启动服务: systemctl start $SERVICE_NAME"
    echo "  停止服务: systemctl stop $SERVICE_NAME"
    echo "  重启服务: systemctl restart $SERVICE_NAME"
    echo "  查看状态: systemctl status $SERVICE_NAME"
    echo "  查看日志: journalctl -u $SERVICE_NAME -f"
    echo
    echo "或者直接使用:"
    echo "  $INSTALL_DIR/bin/openchat start"
    echo "  $INSTALL_DIR/bin/openchat stop"
    echo "  $INSTALL_DIR/bin/openchat status"
    echo
    echo "配置文件: $INSTALL_DIR/etc/config.json"
    echo "日志目录: $INSTALL_DIR/var/logs"
    echo
    echo "============================================"
}

# 主程序
main() {
    echo "============================================"
    echo "  $APP_NAME v$APP_VERSION 安装程序"
    echo "============================================"
    echo
    
    check_root
    check_requirements
    create_user
    create_directories
    copy_files
    install_dependencies
    build_application
    create_systemd_service
    init_database
    
    show_install_info
    
    log_success "安装完成!"
}

# 运行主程序
main "$@"
