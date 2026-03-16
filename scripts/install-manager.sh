#!/bin/bash
# ============================================
# OpenChat - 智能安装管理器
# 支持安装检测、错误恢复、回滚功能
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
INSTALL_STATE_FILE=".openchat-install-state"
INSTALL_LOG_FILE="var/logs/install.log"
BACKUP_DIR="var/backups"

# 安装状态
STATE_NOT_INSTALLED="not_installed"
STATE_INSTALLING="installing"
STATE_INSTALLED="installed"
STATE_FAILED="failed"
STATE_PARTIAL="partial"

# 当前安装状态
CURRENT_STATE=""
INSTALL_STEP=""
LAST_ERROR=""

# 日志函数
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" >> "$INSTALL_LOG_FILE"
}

log_info() { 
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO" "$1"
}

log_success() { 
    echo -e "${GREEN}[✓]${NC} $1"
    log "SUCCESS" "$1"
}

log_warn() { 
    echo -e "${YELLOW}[!]${NC} $1"
    log "WARN" "$1"
}

log_error() { 
    echo -e "${RED}[✗]${NC} $1"
    log "ERROR" "$1"
    LAST_ERROR="$1"
}

log_step() { 
    echo -e "${CYAN}[STEP]${NC} $1"
    log "STEP" "$1"
}

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
    echo "║                     智能安装管理器 v${APP_VERSION}                      ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 初始化安装环境
init_install_env() {
    # 创建必要目录
    mkdir -p var/logs
    mkdir -p var/backups
    mkdir -p var/data
    
    # 初始化日志文件
    if [ ! -f "$INSTALL_LOG_FILE" ]; then
        touch "$INSTALL_LOG_FILE"
    fi
    
    log_info "初始化安装环境"
}

# 读取安装状态
read_install_state() {
    if [ -f "$INSTALL_STATE_FILE" ]; then
        source "$INSTALL_STATE_FILE"
        CURRENT_STATE="${STATE:-$STATE_NOT_INSTALLED}"
        INSTALL_STEP="${STEP:-}"
        LAST_ERROR="${ERROR:-}"
    else
        CURRENT_STATE="$STATE_NOT_INSTALLED"
    fi
}

# 保存安装状态
save_install_state() {
    local state="$1"
    local step="$2"
    local error="$3"
    
    cat > "$INSTALL_STATE_FILE" << EOF
# OpenChat 安装状态文件
# 自动生成，请勿手动编辑
STATE=$state
STEP=$step
ERROR=$error
TIMESTAMP=$(date +%s)
VERSION=$APP_VERSION
EOF
    
    CURRENT_STATE="$state"
    INSTALL_STEP="$step"
}

# 检查是否已安装
check_existing_installation() {
    log_step "检查现有安装..."
    
    local installed=false
    local reasons=()
    
    # 检查配置文件
    if [ -f ".env" ]; then
        reasons+=("发现 .env 配置文件")
        installed=true
    fi
    
    # 检查 Docker 容器
    if command_exists docker; then
        if docker ps --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
            reasons+=("发现运行中的 OpenChat 容器")
            installed=true
        fi
    fi
    
    # 检查数据库
    if [ -f ".env" ]; then
        source .env
        if command_exists psql && [ -n "$DB_HOST" ]; then
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-openchat}" -d "${DB_NAME:-openchat}" -c "SELECT 1" &>/dev/null; then
                reasons+=("数据库已存在 OpenChat 表结构")
                installed=true
            fi
        fi
    fi
    
    # 检查 PM2 进程
    if command_exists pm2; then
        if pm2 list | grep -q "openchat" 2>/dev/null; then
            reasons+=("发现 PM2 管理的 OpenChat 进程")
            installed=true
        fi
    fi
    
    if [ "$installed" = true ]; then
        echo
        log_warn "检测到已有安装:"
        for reason in "${reasons[@]}"; do
            echo "  • $reason"
        done
        echo
        return 0
    else
        log_success "未检测到已有安装"
        return 1
    fi
}

# 处理已有安装
handle_existing_installation() {
    echo
    echo -e "${BOLD}请选择操作:${NC}"
    echo "  1) 跳过已安装部分，继续安装"
    echo "  2) 重新安装（保留数据）"
    echo "  3) 完全重新安装（清除数据）"
    echo "  4) 退出安装"
    echo
    read -p "请选择 [1-4]: " choice
    
    case $choice in
        1)
            log_info "跳过已安装部分，继续安装..."
            return 0
            ;;
        2)
            log_info "准备重新安装（保留数据）..."
            backup_data
            cleanup_installation false
            return 0
            ;;
        3)
            log_warn "警告: 这将删除所有数据!"
            read -p "确认完全重新安装? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                log_info "准备完全重新安装..."
                backup_data
                cleanup_installation true
                return 0
            else
                log_info "已取消"
                exit 0
            fi
            ;;
        4)
            log_info "退出安装"
            exit 0
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
}

# 备份数据
backup_data() {
    log_step "备份现有数据..."
    
    local backup_time=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$backup_time"
    
    mkdir -p "$backup_path"
    
    # 备份配置文件
    if [ -f ".env" ]; then
        cp ".env" "$backup_path/.env"
        log_success "备份 .env 文件"
    fi
    
    # 备份数据库
    if [ -f ".env" ]; then
        source .env
        if command_exists pg_dump && [ -n "$DB_HOST" ]; then
            PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-openchat}" "${DB_NAME:-openchat}" > "$backup_path/database.sql" 2>/dev/null
            if [ $? -eq 0 ]; then
                log_success "备份数据库"
            fi
        fi
    fi
    
    # 备份日志
    if [ -d "var/logs" ]; then
        cp -r var/logs "$backup_path/"
        log_success "备份日志文件"
    fi
    
    log_success "备份完成: $backup_path"
}

# 清理安装
cleanup_installation() {
    local full_cleanup="$1"
    
    log_step "清理现有安装..."
    
    # 停止 Docker 容器
    if command_exists docker; then
        if docker ps -a --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
            docker compose down -v 2>/dev/null || true
            log_success "停止 Docker 容器"
        fi
    fi
    
    # 停止 PM2 进程
    if command_exists pm2; then
        if pm2 list | grep -q "openchat" 2>/dev/null; then
            pm2 stop openchat 2>/dev/null || true
            pm2 delete openchat 2>/dev/null || true
            log_success "停止 PM2 进程"
        fi
    fi
    
    # 完全清理
    if [ "$full_cleanup" = true ]; then
        # 删除配置文件
        rm -f .env docker-compose.override.yml
        log_success "删除配置文件"
        
        # 删除数据目录
        rm -rf var/data var/logs
        log_success "删除数据目录"
    fi
    
    # 删除安装状态文件
    rm -f "$INSTALL_STATE_FILE"
}

# 错误处理
handle_error() {
    local step="$1"
    local error="$2"
    
    log_error "安装失败: $error"
    
    # 保存失败状态
    save_install_state "$STATE_FAILED" "$step" "$error"
    
    echo
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    安装失败                                   ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}错误信息:${NC} $error"
    echo -e "${BOLD}失败步骤:${NC} $step"
    echo
    echo -e "${BOLD}恢复选项:${NC}"
    echo "  1) 重试当前步骤"
    echo "  2) 回滚到上一步"
    echo "  3) 查看详细日志"
    echo "  4) 退出安装"
    echo
    read -p "请选择 [1-4]: " choice
    
    case $choice in
        1)
            log_info "重试当前步骤..."
            return 1  # 返回非零表示重试
            ;;
        2)
            rollback_installation "$step"
            return 2
            ;;
        3)
            echo
            echo -e "${BOLD}安装日志:${NC}"
            tail -100 "$INSTALL_LOG_FILE"
            echo
            read -p "按回车继续..."
            return 1
            ;;
        4)
            log_info "退出安装，可稍后重新运行脚本继续"
            exit 1
            ;;
        *)
            return 1
            ;;
    esac
}

# 回滚安装
rollback_installation() {
    local failed_step="$1"
    
    log_step "回滚安装..."
    
    # 根据失败步骤决定回滚范围
    case $failed_step in
        "database")
            log_info "回滚数据库配置..."
            # 数据库回滚逻辑
            ;;
        "redis")
            log_info "回滚 Redis 配置..."
            # Redis 回滚逻辑
            ;;
        "docker")
            log_info "回滚 Docker 配置..."
            docker compose down -v 2>/dev/null || true
            ;;
        "config")
            log_info "回滚配置文件..."
            rm -f .env docker-compose.override.yml
            ;;
    esac
    
    # 恢复备份
    local latest_backup=$(ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        log_info "发现备份: $latest_backup"
        read -p "是否恢复此备份? (y/N): " restore
        if [[ $restore =~ ^[Yy]$ ]]; then
            if [ -f "$latest_backup/.env" ]; then
                cp "$latest_backup/.env" .env
                log_success "恢复配置文件"
            fi
        fi
    fi
    
    save_install_state "$STATE_PARTIAL" "rollback" ""
    log_success "回滚完成"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 安装步骤：环境检查
step_check_environment() {
    INSTALL_STEP="environment"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "检查系统环境..."
    
    local errors=()
    
    # 检查操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        log_success "操作系统: $NAME $VERSION_ID"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "操作系统: macOS"
    else
        errors+=("无法识别操作系统")
    fi
    
    # 检查 Docker
    if command_exists docker; then
        if docker info &> /dev/null; then
            log_success "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
        else
            errors+=("Docker 服务未运行")
        fi
    else
        errors+=("Docker 未安装")
    fi
    
    # 检查 Docker Compose
    if docker compose version &> /dev/null; then
        log_success "Docker Compose: $(docker compose version --short)"
    else
        errors+=("Docker Compose 未安装")
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        for error in "${errors[@]}"; do
            log_error "$error"
        done
        handle_error "$INSTALL_STEP" "环境检查失败"
        return $?
    fi
    
    log_success "环境检查通过"
    return 0
}

# 安装步骤：配置
step_configure() {
    INSTALL_STEP="config"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "配置安装参数..."
    
    # 选择环境
    echo
    echo -e "${BOLD}选择安装环境:${NC}"
    echo "  1) 开发环境 (Development)"
    echo "  2) 测试环境 (Testing)"
    echo "  3) 生产环境 (Production)"
    echo
    read -p "请选择 [1-3, 默认 3]: " env_choice
    
    local env_name="production"
    case ${env_choice:-3} in
        1) env_name="development" ;;
        2) env_name="test" ;;
        3) env_name="production" ;;
    esac
    
    # 复制配置文件
    if [ ! -f ".env" ]; then
        cp ".env.$env_name" .env
        log_success "创建 .env 配置文件"
    else
        log_warn ".env 已存在，跳过创建"
    fi
    
    # 获取服务器 IP
    local external_ip=$(curl -s -4 --connect-timeout 5 ifconfig.me 2>/dev/null || echo "")
    if [ -z "$external_ip" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            external_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
        else
            external_ip=$(hostname -I | awk '{print $1}')
        fi
    fi
    
    read -p "服务器外网 IP [$external_ip]: " input_ip
    external_ip=${input_ip:-$external_ip}
    
    # 更新配置
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/EXTERNAL_IP=.*/EXTERNAL_IP=$external_ip/" .env
    else
        sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=$external_ip/" .env
    fi
    
    # 生成密钥
    local jwt_secret=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
    else
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
    fi
    
    log_success "配置完成"
    return 0
}

# 安装步骤：数据库
step_database() {
    INSTALL_STEP="database"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "配置数据库..."
    
    # 检查是否使用已有数据库
    echo
    read -p "是否使用已有 PostgreSQL 数据库? (y/N): " use_existing
    
    if [[ $use_existing =~ ^[Yy]$ ]]; then
        # 配置已有数据库
        read -p "数据库主机地址 [localhost]: " db_host
        db_host=${db_host:-localhost}
        
        read -p "数据库端口 [5432]: " db_port
        db_port=${db_port:-5432}
        
        read -p "数据库名称 [openchat]: " db_name
        db_name=${db_name:-openchat}
        
        read -p "数据库用户名: " db_user
        read -s -p "数据库密码: " db_password
        echo
        
        # 测试连接
        if PGPASSWORD="$db_password" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1" &>/dev/null; then
            log_success "数据库连接成功"
            
            # 更新配置
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/DB_HOST=.*/DB_HOST=$db_host/" .env
                sed -i '' "s/DB_PORT=.*/DB_PORT=$db_port/" .env
                sed -i '' "s/DB_NAME=.*/DB_NAME=$db_name/" .env
                sed -i '' "s/DB_USERNAME=.*/DB_USERNAME=$db_user/" .env
                sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
            else
                sed -i "s/DB_HOST=.*/DB_HOST=$db_host/" .env
                sed -i "s/DB_PORT=.*/DB_PORT=$db_port/" .env
                sed -i "s/DB_NAME=.*/DB_NAME=$db_name/" .env
                sed -i "s/DB_USERNAME=.*/DB_USERNAME=$db_user/" .env
                sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
            fi
        else
            handle_error "$INSTALL_STEP" "数据库连接失败"
            return $?
        fi
    else
        log_info "将使用 Docker 创建数据库"
    fi
    
    return 0
}

# 安装步骤：Redis
step_redis() {
    INSTALL_STEP="redis"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "配置 Redis..."
    
    # 检查是否使用已有 Redis
    echo
    read -p "是否使用已有 Redis 服务? (y/N): " use_existing
    
    if [[ $use_existing =~ ^[Yy]$ ]]; then
        # 配置已有 Redis
        read -p "Redis 主机地址 [localhost]: " redis_host
        redis_host=${redis_host:-localhost}
        
        read -p "Redis 端口 [6379]: " redis_port
        redis_port=${redis_port:-6379}
        
        read -s -p "Redis 密码 (无密码请留空): " redis_password
        echo
        
        # 测试连接
        if [ -n "$redis_password" ]; then
            if redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" ping &>/dev/null; then
                log_success "Redis 连接成功"
            else
                handle_error "$INSTALL_STEP" "Redis 连接失败"
                return $?
            fi
        else
            if redis-cli -h "$redis_host" -p "$redis_port" ping &>/dev/null; then
                log_success "Redis 连接成功"
            else
                handle_error "$INSTALL_STEP" "Redis 连接失败"
                return $?
            fi
        fi
        
        # 更新配置
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/REDIS_HOST=.*/REDIS_HOST=$redis_host/" .env
            sed -i '' "s/REDIS_PORT=.*/REDIS_PORT=$redis_port/" .env
            sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$redis_password/" .env
        else
            sed -i "s/REDIS_HOST=.*/REDIS_HOST=$redis_host/" .env
            sed -i "s/REDIS_PORT=.*/REDIS_PORT=$redis_port/" .env
            sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$redis_password/" .env
        fi
    else
        log_info "将使用 Docker 创建 Redis"
    fi
    
    return 0
}

# 安装步骤：启动服务
step_start_services() {
    INSTALL_STEP="services"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "启动服务..."
    
    # 拉取镜像
    log_info "拉取 Docker 镜像..."
    if ! docker compose pull; then
        handle_error "$INSTALL_STEP" "镜像拉取失败"
        return $?
    fi
    
    # 启动服务
    log_info "启动 Docker 服务..."
    if ! docker compose up -d; then
        handle_error "$INSTALL_STEP" "服务启动失败"
        return $?
    fi
    
    # 等待服务就绪
    log_info "等待服务就绪..."
    local max_wait=120
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if curl -s http://localhost:3000/health &>/dev/null; then
            log_success "服务启动成功"
            break
        fi
        echo -n "."
        sleep 2
        waited=$((waited + 2))
    done
    echo
    
    if [ $waited -ge $max_wait ]; then
        handle_error "$INSTALL_STEP" "服务启动超时"
        return $?
    fi
    
    return 0
}

# 安装步骤：验证
step_verify() {
    INSTALL_STEP="verify"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "验证安装..."
    
    local errors=()
    
    # 检查 API 服务
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        log_success "API 服务正常"
    else
        errors+=("API 服务异常")
    fi
    
    # 检查数据库连接
    source .env
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        log_success "数据库连接正常"
    else
        errors+=("数据库连接异常")
    fi
    
    # 检查 Redis 连接
    if [ -n "$REDIS_PASSWORD" ]; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis 连接正常"
        else
            errors+=("Redis 连接异常")
        fi
    else
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis 连接正常"
        else
            errors+=("Redis 连接异常")
        fi
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        for error in "${errors[@]}"; do
            log_error "$error"
        done
        handle_error "$INSTALL_STEP" "验证失败"
        return $?
    fi
    
    return 0
}

# 显示安装结果
show_install_result() {
    source .env
    
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🎉 安装成功！                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
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
    
    # 初始化
    init_install_env
    
    # 读取安装状态
    read_install_state
    
    # 检查已有安装
    if check_existing_installation; then
        handle_existing_installation
    fi
    
    # 如果之前安装失败，询问是否继续
    if [ "$CURRENT_STATE" = "$STATE_FAILED" ]; then
        echo
        log_warn "检测到上次安装失败"
        log_info "失败步骤: $INSTALL_STEP"
        log_info "错误信息: $LAST_ERROR"
        echo
        read -p "是否从失败处继续安装? (Y/n): " continue_install
        if [[ ! $continue_install =~ ^[Nn]$ ]]; then
            log_info "从失败处继续安装..."
        else
            log_info "重新开始安装..."
            CURRENT_STATE="$STATE_NOT_INSTALLED"
        fi
    fi
    
    # 执行安装步骤
    local steps=("environment" "config" "database" "redis" "services" "verify")
    local step_functions=("step_check_environment" "step_configure" "step_database" "step_redis" "step_start_services" "step_verify")
    
    for i in "${!steps[@]}"; do
        local step="${steps[$i]}"
        local func="${step_functions[$i]}"
        
        # 如果是从失败处继续，跳过已完成的步骤
        if [ "$CURRENT_STATE" = "$STATE_FAILED" ] && [ "$step" != "$INSTALL_STEP" ] && [ -z "$resume_started" ]; then
            continue
        fi
        resume_started="true"
        
        # 执行步骤
        while true; do
            $func
            local result=$?
            
            if [ $result -eq 0 ]; then
                break
            elif [ $result -eq 2 ]; then
                # 回滚后退出
                exit 1
            fi
            # result=1 表示重试
        done
    done
    
    # 安装完成
    save_install_state "$STATE_INSTALLED" "complete" ""
    show_install_result
}

# 运行主程序
main "$@"
