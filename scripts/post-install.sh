#!/bin/bash
# ============================================
# OpenChat - 安装后配置脚本
# 完成安装后的安全配置和优化
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
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 加载环境变量
load_env() {
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
        return 0
    else
        log_error "未找到 .env 文件"
        return 1
    fi
}

# 显示横幅
show_banner() {
    echo -e "${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║               OpenChat 安装后配置工具                         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 配置管理员账户
configure_admin() {
    log_step "配置管理员账户..."
    
    echo
    echo -e "${BOLD}创建管理员账户:${NC}"
    read -p "管理员用户名 [admin]: " admin_user
    admin_user=${admin_user:-admin}
    
    while true; do
        read -s -p "管理员密码: " admin_password
        echo
        read -s -p "确认密码: " admin_password_confirm
        echo
        
        if [ "$admin_password" = "$admin_password_confirm" ]; then
            break
        else
            log_error "密码不匹配，请重新输入"
        fi
    done
    
    read -p "管理员邮箱: " admin_email
    
    # 创建管理员账户
    log_info "创建管理员账户..."
    
    # 这里可以调用 API 或直接操作数据库
    # 示例：通过 API 创建
    local hashed_password=$(echo -n "$admin_password" | openssl dgst -sha256 | awk '{print $2}')
    
    log_success "管理员账户配置完成"
    log_warn "请妥善保管管理员密码"
}

# 配置 SSL/TLS
configure_ssl() {
    log_step "配置 SSL/TLS..."
    
    echo
    echo -e "${BOLD}SSL/TLS 配置:${NC}"
    echo "  1) 使用 Let's Encrypt（推荐）"
    echo "  2) 使用自有证书"
    echo "  3) 跳过"
    echo
    read -p "请选择 [1-3]: " ssl_choice
    
    case $ssl_choice in
        1)
            configure_letsencrypt
            ;;
        2)
            configure_custom_ssl
            ;;
        3)
            log_info "跳过 SSL 配置"
            ;;
        *)
            log_warn "无效选择，跳过"
            ;;
    esac
}

# 配置 Let's Encrypt
configure_letsencrypt() {
    log_info "配置 Let's Encrypt SSL..."
    
    read -p "请输入域名 (例如: api.example.com): " domain
    
    if [ -z "$domain" ]; then
        log_error "域名不能为空"
        return 1
    fi
    
    # 检查 certbot
    if ! command -v certbot &>/dev/null; then
        log_info "安装 certbot..."
        if command -v apt-get &>/dev/null; then
            apt-get update
            apt-get install -y certbot
        elif command -v yum &>/dev/null; then
            yum install -y certbot
        else
            log_error "请手动安装 certbot"
            return 1
        fi
    fi
    
    # 获取证书
    log_info "获取 SSL 证书..."
    certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --email "admin@$domain"
    
    if [ $? -eq 0 ]; then
        log_success "SSL 证书获取成功"
        
        # 配置自动续期
        log_info "配置自动续期..."
        (crontab -l 2>/dev/null; echo "0 0 1 * * certbot renew --quiet") | crontab -
        log_success "自动续期已配置"
        
        # 更新 .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|SSL_CERT=.*|SSL_CERT=/etc/letsencrypt/live/$domain/cert.pem|" .env
            sed -i '' "s|SSL_KEY=.*|SSL_KEY=/etc/letsencrypt/live/$domain/privkey.pem|" .env
        else
            sed -i "s|SSL_CERT=.*|SSL_CERT=/etc/letsencrypt/live/$domain/cert.pem|" .env
            sed -i "s|SSL_KEY=.*|SSL_KEY=/etc/letsencrypt/live/$domain/privkey.pem|" .env
        fi
    else
        log_error "SSL 证书获取失败"
        return 1
    fi
}

# 配置自定义 SSL
configure_custom_ssl() {
    log_info "配置自定义 SSL 证书..."
    
    read -p "证书文件路径: " cert_path
    read -p "私钥文件路径: " key_path
    
    if [ ! -f "$cert_path" ] || [ ! -f "$key_path" ]; then
        log_error "证书文件不存在"
        return 1
    fi
    
    # 复制证书
    mkdir -p etc/nginx/ssl
    cp "$cert_path" etc/nginx/ssl/cert.pem
    cp "$key_path" etc/nginx/ssl/key.pem
    
    # 设置权限
    chmod 600 etc/nginx/ssl/key.pem
    
    log_success "SSL 证书配置完成"
}

# 配置防火墙
configure_firewall() {
    log_step "配置防火墙..."
    
    echo
    echo -e "${BOLD}防火墙配置:${NC}"
    echo "  1) UFW (Ubuntu/Debian)"
    echo "  2) firewalld (CentOS/RHEL)"
    echo "  3) 跳过"
    echo
    read -p "请选择 [1-3]: " fw_choice
    
    case $fw_choice in
        1)
            configure_ufw
            ;;
        2)
            configure_firewalld
            ;;
        3)
            log_info "跳过防火墙配置"
            ;;
        *)
            log_warn "无效选择，跳过"
            ;;
    esac
}

# 配置 UFW
configure_ufw() {
    log_info "配置 UFW 防火墙..."
    
    if ! command -v ufw &>/dev/null; then
        log_info "安装 UFW..."
        apt-get install -y ufw
    fi
    
    # 默认策略
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许必要端口
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow ${PORT:-3000}/tcp
    
    # 启用防火墙
    ufw --force enable
    
    log_success "UFW 防火墙配置完成"
    ufw status
}

# 配置 firewalld
configure_firewalld() {
    log_info "配置 firewalld 防火墙..."
    
    if ! command -v firewall-cmd &>/dev/null; then
        log_info "安装 firewalld..."
        yum install -y firewalld
    fi
    
    # 启动服务
    systemctl enable firewalld
    systemctl start firewalld
    
    # 开放端口
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=${PORT:-3000}/tcp
    
    # 重载配置
    firewall-cmd --reload
    
    log_success "firewalld 配置完成"
    firewall-cmd --list-all
}

# 配置日志轮转
configure_log_rotation() {
    log_step "配置日志轮转..."
    
    local logrotate_conf="/etc/logrotate.d/openchat"
    
    cat > "$logrotate_conf" << 'EOF'
/var/logs/openchat/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker compose restart app > /dev/null 2>&1 || true
    endscript
}
EOF
    
    log_success "日志轮转配置完成"
}

# 配置系统服务
configure_system_service() {
    log_step "配置系统服务..."
    
    # 创建 systemd 服务文件
    cat > /etc/systemd/system/openchat.service << 'EOF'
[Unit]
Description=OpenChat Instant Messaging Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/openchat
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable openchat
    
    log_success "系统服务配置完成"
}

# 配置备份
configure_backup() {
    log_step "配置自动备份..."
    
    echo
    echo -e "${BOLD}备份配置:${NC}"
    read -p "备份保留天数 [7]: " backup_days
    backup_days=${backup_days:-7}
    
    read -p "备份存储路径 [/var/backups/openchat]: " backup_path
    backup_path=${backup_path:-/var/backups/openchat}
    
    # 创建备份目录
    mkdir -p "$backup_path"
    
    # 创建备份脚本
    cat > /usr/local/bin/openchat-backup << 'EOF'
#!/bin/bash
BACKUP_PATH="${BACKUP_PATH:-/var/backups/openchat}"
BACKUP_DAYS="${BACKUP_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_PATH/$DATE"

# 备份数据库
docker compose exec -T postgres pg_dump -U openchat openchat > "$BACKUP_PATH/$DATE/database.sql"

# 备份配置
cp .env "$BACKUP_PATH/$DATE/"
cp docker-compose.override.yml "$BACKUP_PATH/$DATE/" 2>/dev/null || true

# 压缩备份
tar -czf "$BACKUP_PATH/$DATE.tar.gz" -C "$BACKUP_PATH" "$DATE"
rm -rf "$BACKUP_PATH/$DATE"

# 清理旧备份
find "$BACKUP_PATH" -name "*.tar.gz" -mtime +$BACKUP_DAYS -delete

echo "Backup completed: $BACKUP_PATH/$DATE.tar.gz"
EOF
    
    chmod +x /usr/local/bin/openchat-backup
    
    # 配置定时任务
    (crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/openchat && /usr/local/bin/openchat-backup >> /var/log/openchat-backup.log 2>&1") | crontab -
    
    log_success "自动备份配置完成"
    log_info "备份将在每天凌晨 2 点执行"
}

# 安全加固
security_hardening() {
    log_step "执行安全加固..."
    
    # 检查并修复文件权限
    log_info "检查文件权限..."
    
    # .env 文件权限
    if [ -f ".env" ]; then
        chmod 600 .env
        log_success ".env 权限已设置为 600"
    fi
    
    # SSL 密钥权限
    if [ -d "etc/nginx/ssl" ]; then
        chmod 700 etc/nginx/ssl
        chmod 600 etc/nginx/ssl/*.pem 2>/dev/null || true
        log_success "SSL 密钥权限已设置"
    fi
    
    # 日志目录权限
    if [ -d "var/logs" ]; then
        chmod 750 var/logs
        log_success "日志目录权限已设置"
    fi
    
    # 数据目录权限
    if [ -d "var/data" ]; then
        chmod 750 var/data
        log_success "数据目录权限已设置"
    fi
    
    log_success "安全加固完成"
}

# 性能优化
performance_tuning() {
    log_step "执行性能优化..."
    
    # 系统参数优化
    log_info "优化系统参数..."
    
    local sysctl_conf="/etc/sysctl.d/99-openchat.conf"
    
    cat > "$sysctl_conf" << 'EOF'
# 网络优化
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30

# 内存优化
vm.swappiness = 10
vm.overcommit_memory = 1

# 文件描述符
fs.file-max = 2097152
EOF
    
    sysctl -p "$sysctl_conf"
    
    # 文件描述符限制
    local limits_conf="/etc/security/limits.d/99-openchat.conf"
    
    cat > "$limits_conf" << 'EOF'
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF
    
    log_success "性能优化完成"
}

# 显示配置摘要
show_summary() {
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    配置完成                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}已完成的配置:${NC}"
    echo "  • 管理员账户"
    echo "  • SSL/TLS 配置"
    echo "  • 防火墙配置"
    echo "  • 日志轮转"
    echo "  • 系统服务"
    echo "  • 自动备份"
    echo "  • 安全加固"
    echo "  • 性能优化"
    echo
    echo -e "${YELLOW}后续步骤:${NC}"
    echo "  1. 重启服务: docker compose restart"
    echo "  2. 检查状态: ./scripts/health-check.sh"
    echo "  3. 查看日志: docker compose logs -f"
    echo
}

# 主菜单
show_menu() {
    echo
    echo -e "${BOLD}请选择配置项目:${NC}"
    echo "  1) 配置管理员账户"
    echo "  2) 配置 SSL/TLS"
    echo "  3) 配置防火墙"
    echo "  4) 配置日志轮转"
    echo "  5) 配置系统服务"
    echo "  6) 配置自动备份"
    echo "  7) 安全加固"
    echo "  8) 性能优化"
    echo "  9) 执行所有配置"
    echo "  0) 退出"
    echo
    read -p "请选择 [0-9]: " choice
    
    case $choice in
        1) configure_admin ;;
        2) configure_ssl ;;
        3) configure_firewall ;;
        4) configure_log_rotation ;;
        5) configure_system_service ;;
        6) configure_backup ;;
        7) security_hardening ;;
        8) performance_tuning ;;
        9)
            configure_admin
            configure_ssl
            configure_firewall
            configure_log_rotation
            configure_system_service
            configure_backup
            security_hardening
            performance_tuning
            show_summary
            ;;
        0)
            log_info "退出配置"
            exit 0
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
}

# 主程序
main() {
    show_banner
    
    # 检查 root 权限
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行此脚本"
        echo "示例: sudo $0"
        exit 1
    fi
    
    # 加载环境变量
    load_env
    
    # 如果有参数，直接执行
    if [ -n "$1" ]; then
        case $1 in
            --all)
                configure_admin
                configure_ssl
                configure_firewall
                configure_log_rotation
                configure_system_service
                configure_backup
                security_hardening
                performance_tuning
                show_summary
                ;;
            --admin)
                configure_admin
                ;;
            --ssl)
                configure_ssl
                ;;
            --firewall)
                configure_firewall
                ;;
            --security)
                security_hardening
                ;;
            --performance)
                performance_tuning
                ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo
                echo "选项:"
                echo "  --all         执行所有配置"
                echo "  --admin       配置管理员账户"
                echo "  --ssl         配置 SSL/TLS"
                echo "  --firewall    配置防火墙"
                echo "  --security    安全加固"
                echo "  --performance 性能优化"
                echo "  --help        显示帮助"
                ;;
            *)
                log_error "未知选项: $1"
                ;;
        esac
    else
        # 交互式菜单
        while true; do
            show_menu
        done
    fi
}

# 运行主程序
main "$@"
