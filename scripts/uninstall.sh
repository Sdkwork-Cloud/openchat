#!/bin/bash
# ============================================
# OpenChat - 卸载脚本
# 安全卸载 OpenChat 及相关组件
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
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 卸载选项
REMOVE_CONFIG=false
REMOVE_DATA=false
REMOVE_DATABASE=false
REMOVE_DOCKER_VOLUMES=false
KEEP_BACKUP=true

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  --config         删除配置文件"
    echo "  --data           删除数据目录"
    echo "  --database       删除数据库（需要确认）"
    echo "  --volumes        删除 Docker 卷"
    echo "  --all            完全卸载（包括所有数据）"
    echo "  --no-backup      不创建备份"
    echo "  --help, -h       显示帮助信息"
    echo
    echo "示例:"
    echo "  $0                        # 交互式卸载"
    echo "  $0 --config --data        # 删除配置和数据"
    echo "  $0 --all                  # 完全卸载"
    echo
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --config)
            REMOVE_CONFIG=true
            shift
            ;;
        --data)
            REMOVE_DATA=true
            shift
            ;;
        --database)
            REMOVE_DATABASE=true
            shift
            ;;
        --volumes)
            REMOVE_DOCKER_VOLUMES=true
            shift
            ;;
        --all)
            REMOVE_CONFIG=true
            REMOVE_DATA=true
            REMOVE_DATABASE=true
            REMOVE_DOCKER_VOLUMES=true
            shift
            ;;
        --no-backup)
            KEEP_BACKUP=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 显示横幅
show_banner() {
    echo -e "${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║               OpenChat 卸载工具                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 检查安装状态
check_installation() {
    log_info "检查安装状态..."
    
    local found=false
    
    # 检查 Docker 容器
    if command -v docker &> /dev/null; then
        if docker ps -a --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
            log_warn "发现 OpenChat Docker 容器"
            found=true
        fi
    fi
    
    # 检查配置文件
    if [ -f ".env" ]; then
        log_warn "发现 .env 配置文件"
        found=true
    fi
    
    # 检查数据目录
    if [ -d "var/data" ] || [ -d "var/logs" ]; then
        log_warn "发现数据目录"
        found=true
    fi
    
    # 检查 PM2 进程
    if command -v pm2 &> /dev/null; then
        if pm2 list 2>/dev/null | grep -q "openchat"; then
            log_warn "发现 PM2 管理的 OpenChat 进程"
            found=true
        fi
    fi
    
    if [ "$found" = false ]; then
        log_info "未检测到 OpenChat 安装"
        exit 0
    fi
}

# 交互式选择
interactive_select() {
    echo
    echo -e "${BOLD}请选择要卸载的组件:${NC}"
    echo
    echo "  1) 仅停止服务（保留所有数据）"
    echo "  2) 停止服务并删除配置文件"
    echo "  3) 停止服务、删除配置和数据目录"
    echo "  4) 完全卸载（包括数据库）"
    echo "  5) 取消"
    echo
    read -p "请选择 [1-5]: " choice
    
    case $choice in
        1)
            log_info "仅停止服务"
            ;;
        2)
            REMOVE_CONFIG=true
            ;;
        3)
            REMOVE_CONFIG=true
            REMOVE_DATA=true
            ;;
        4)
            REMOVE_CONFIG=true
            REMOVE_DATA=true
            REMOVE_DATABASE=true
            REMOVE_DOCKER_VOLUMES=true
            ;;
        5)
            log_info "已取消卸载"
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
    if [ "$KEEP_BACKUP" = false ]; then
        return 0
    fi
    
    log_info "创建备份..."
    
    local backup_time=$(date +%Y%m%d_%H%M%S)
    local backup_dir="var/backups/uninstall_$backup_time"
    
    mkdir -p "$backup_dir"
    
    # 备份配置
    if [ -f ".env" ]; then
        cp ".env" "$backup_dir/.env"
        log_success "备份配置文件"
    fi
    
    # 备份数据库
    if [ -f ".env" ] && [ "$REMOVE_DATABASE" = true ]; then
        source .env
        if command -v pg_dump &> /dev/null && [ -n "$DB_HOST" ]; then
            PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" "${DB_NAME:-openchat}" > "$backup_dir/database.sql" 2>/dev/null
            if [ $? -eq 0 ]; then
                log_success "备份数据库"
            fi
        fi
    fi
    
    # 备份日志
    if [ -d "var/logs" ]; then
        cp -r var/logs "$backup_dir/"
        log_success "备份日志文件"
    fi
    
    log_success "备份完成: $backup_dir"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    # 停止 Docker 容器
    if command -v docker &> /dev/null; then
        if docker ps --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
            log_info "停止 Docker 容器..."
            docker compose down 2>/dev/null || true
            log_success "Docker 容器已停止"
        fi
    fi
    
    # 停止 PM2 进程
    if command -v pm2 &> /dev/null; then
        if pm2 list 2>/dev/null | grep -q "openchat"; then
            log_info "停止 PM2 进程..."
            pm2 stop openchat 2>/dev/null || true
            pm2 delete openchat 2>/dev/null || true
            log_success "PM2 进程已停止"
        fi
    fi
    
    # 停止 systemd 服务
    if command -v systemctl &> /dev/null; then
        if systemctl is-active openchat &>/dev/null; then
            log_info "停止 systemd 服务..."
            sudo systemctl stop openchat 2>/dev/null || true
            sudo systemctl disable openchat 2>/dev/null || true
            log_success "systemd 服务已停止"
        fi
    fi
}

# 删除 Docker 资源
remove_docker_resources() {
    if [ "$REMOVE_DOCKER_VOLUMES" = false ]; then
        return 0
    fi
    
    log_info "删除 Docker 资源..."
    
    # 删除容器
    if docker ps -a --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
        docker compose down -v --rmi local 2>/dev/null || true
        log_success "删除 Docker 容器和卷"
    fi
    
    # 删除镜像
    local images=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep "openchat" 2>/dev/null || true)
    if [ -n "$images" ]; then
        echo "$images" | xargs docker rmi -f 2>/dev/null || true
        log_success "删除 Docker 镜像"
    fi
}

# 删除配置文件
remove_config() {
    if [ "$REMOVE_CONFIG" = false ]; then
        return 0
    fi
    
    log_info "删除配置文件..."
    
    # 删除 .env
    if [ -f ".env" ]; then
        rm -f ".env"
        log_success "删除 .env"
    fi
    
    # 删除 Docker Compose 覆盖配置
    if [ -f "docker-compose.override.yml" ]; then
        rm -f "docker-compose.override.yml"
        log_success "删除 docker-compose.override.yml"
    fi
    
    # 删除安装状态文件
    if [ -f ".openchat-install-state" ]; then
        rm -f ".openchat-install-state"
        log_success "删除安装状态文件"
    fi
    
    # 删除 systemd 服务文件
    if [ -f "/etc/systemd/system/openchat.service" ]; then
        sudo rm -f "/etc/systemd/system/openchat.service"
        sudo systemctl daemon-reload
        log_success "删除 systemd 服务文件"
    fi
}

# 删除数据目录
remove_data() {
    if [ "$REMOVE_DATA" = false ]; then
        return 0
    fi
    
    log_info "删除数据目录..."
    
    # 删除数据目录
    if [ -d "var/data" ]; then
        rm -rf "var/data"
        log_success "删除 var/data"
    fi
    
    # 删除日志目录
    if [ -d "var/logs" ]; then
        rm -rf "var/logs"
        log_success "删除 var/logs"
    fi
    
    # 删除运行时目录
    if [ -d "var/run" ]; then
        rm -rf "var/run"
        log_success "删除 var/run"
    fi
}

# 删除数据库
remove_database() {
    if [ "$REMOVE_DATABASE" = false ]; then
        return 0
    fi
    
    log_warn "即将删除数据库，此操作不可恢复！"
    read -p "确认删除数据库? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "跳过数据库删除"
        return 0
    fi
    
    if [ ! -f ".env" ]; then
        log_warn "未找到 .env 文件，无法删除数据库"
        return 0
    fi
    
    source .env
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
        log_warn "数据库配置不完整，跳过删除"
        return 0
    fi
    
    log_info "删除数据库..."
    
    # 删除数据库
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_success "数据库已删除"
    else
        log_warn "数据库删除失败，可能需要手动删除"
    fi
    
    # 询问是否删除用户
    read -p "是否删除数据库用户 ${DB_USER}? (y/N): " del_user
    if [[ $del_user =~ ^[Yy]$ ]]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" -d postgres -c "DROP USER IF EXISTS ${DB_USER};" 2>/dev/null
        log_success "数据库用户已删除"
    fi
}

# 显示卸载结果
show_result() {
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    卸载完成                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    if [ "$KEEP_BACKUP" = true ]; then
        echo -e "${YELLOW}备份文件保存在 var/backups/ 目录${NC}"
        echo
    fi
    
    if [ "$REMOVE_DATABASE" = false ]; then
        echo -e "${YELLOW}数据库未删除，如需删除请手动操作${NC}"
        echo
    fi
    
    echo "感谢使用 OpenChat！"
    echo
}

# 主程序
main() {
    cd "$SCRIPT_DIR"
    
    show_banner
    
    # 检查安装
    check_installation
    
    # 如果没有指定选项，进入交互模式
    if [ "$REMOVE_CONFIG" = false ] && [ "$REMOVE_DATA" = false ] && [ "$REMOVE_DATABASE" = false ] && [ "$REMOVE_DOCKER_VOLUMES" = false ]; then
        interactive_select
    fi
    
    # 确认卸载
    echo
    echo -e "${BOLD}卸载选项:${NC}"
    [ "$REMOVE_CONFIG" = true ] && echo "  • 删除配置文件"
    [ "$REMOVE_DATA" = true ] && echo "  • 删除数据目录"
    [ "$REMOVE_DATABASE" = true ] && echo "  • 删除数据库"
    [ "$REMOVE_DOCKER_VOLUMES" = true ] && echo "  • 删除 Docker 卷"
    [ "$KEEP_BACKUP" = true ] && echo "  • 创建备份"
    echo
    
    read -p "确认执行卸载? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "已取消卸载"
        exit 0
    fi
    
    # 执行卸载
    backup_data
    stop_services
    remove_docker_resources
    remove_database
    remove_config
    remove_data
    
    # 显示结果
    show_result
}

# 运行主程序
main
