#!/bin/bash
# ============================================
# OpenChat - 错误诊断脚本
# 自动诊断安装和运行中的问题
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

# 诊断结果
ISSUES=()
WARNINGS=()
SUGGESTIONS=()

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_diag() { echo -e "${CYAN}[DIAG]${NC} $1"; }

# 显示横幅
show_banner() {
    echo -e "${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║               OpenChat 错误诊断工具                           ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
}

# 添加问题
add_issue() {
    ISSUES+=("$1")
    SUGGESTIONS+=("$2")
}

# 添加警告
add_warning() {
    WARNINGS+=("$1")
}

# ============================================
# Docker 诊断
# ============================================
diagnose_docker() {
    echo
    echo -e "${BOLD}━━━ Docker 诊断 ━━━${NC}"
    
    # 检查 Docker 安装
    log_diag "检查 Docker 安装状态..."
    if ! command -v docker &>/dev/null; then
        log_error "Docker 未安装"
        add_issue "Docker 未安装" "运行: ./scripts/install-deps.sh docker"
        return 1
    fi
    log_success "Docker 已安装"
    
    # 检查 Docker 服务
    log_diag "检查 Docker 服务状态..."
    if ! docker info &>/dev/null; then
        log_error "Docker 服务未运行"
        add_issue "Docker 服务未运行" "运行: systemctl start docker"
        
        # 诊断原因
        log_diag "诊断 Docker 服务未启动原因..."
        if systemctl is-enabled docker &>/dev/null; then
            log_info "Docker 服务已启用但未运行"
        else
            log_warn "Docker 服务未设置开机启动"
        fi
        return 1
    fi
    log_success "Docker 服务运行正常"
    
    # 检查 Docker 权限
    log_diag "检查 Docker 权限..."
    if ! docker ps &>/dev/null; then
        log_error "当前用户无 Docker 权限"
        add_issue "用户无 Docker 权限" "运行: sudo usermod -aG docker \$USER"
        return 1
    fi
    log_success "Docker 权限正常"
    
    # 检查 Docker 存储
    log_diag "检查 Docker 存储驱动..."
    local storage_driver=$(docker info 2>/dev/null | grep "Storage Driver" | awk '{print $3}')
    if [ "$storage_driver" != "overlay2" ]; then
        log_warn "存储驱动为 $storage_driver，建议使用 overlay2"
        add_warning "Docker 存储驱动建议使用 overlay2"
    else
        log_success "存储驱动: $storage_driver"
    fi
    
    # 检查 Docker 磁盘空间
    log_diag "检查 Docker 磁盘空间..."
    local docker_root=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
    if [ -n "$docker_root" ]; then
        local available=$(df -BG "$docker_root" 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
        if [ "$available" -lt 5 ]; then
            log_error "Docker 磁盘空间不足: ${available}GB"
            add_issue "Docker 磁盘空间不足" "清理无用镜像: docker system prune -a"
        else
            log_success "Docker 磁盘空间: ${available}GB"
        fi
    fi
    
    # 检查 Docker 网络
    log_diag "检查 Docker 网络..."
    if ! docker network ls | grep -q "bridge"; then
        log_error "Docker 默认网络异常"
        add_issue "Docker 网络异常" "重启 Docker 服务: systemctl restart docker"
    else
        log_success "Docker 网络正常"
    fi
}

# ============================================
# 容器诊断
# ============================================
diagnose_containers() {
    echo
    echo -e "${BOLD}━━━ 容器诊断 ━━━${NC}"
    
    local containers=("openchat" "openchat-postgres" "openchat-redis" "openchat-wukongim")
    
    for container in "${containers[@]}"; do
        log_diag "检查容器 $container..."
        
        local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
        
        case $status in
            running)
                local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
                if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                    log_success "$container: 运行中"
                else
                    log_warn "$container: 运行中但健康检查失败 ($health)"
                    add_warning "容器 $container 健康检查失败"
                    
                    # 获取健康检查日志
                    log_diag "获取健康检查日志..."
                    docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' "$container" 2>/dev/null | tail -5
                fi
                ;;
            exited)
                log_error "$container: 已退出"
                local exit_code=$(docker inspect --format='{{.State.ExitCode}}' "$container" 2>/dev/null)
                add_issue "容器 $container 已退出 (退出码: $exit_code)" "查看日志: docker logs $container"
                
                # 获取退出原因
                log_diag "获取容器退出日志..."
                docker logs --tail 20 "$container" 2>/dev/null
                ;;
            not_found)
                log_warn "$container: 不存在"
                add_warning "容器 $container 不存在"
                ;;
            *)
                log_error "$container: 状态异常 ($status)"
                add_issue "容器 $container 状态异常" "重启容器: docker compose restart $container"
                ;;
        esac
    done
}

# ============================================
# 数据库诊断
# ============================================
diagnose_database() {
    echo
    echo -e "${BOLD}━━━ 数据库诊断 ━━━${NC}"
    
    # 加载环境变量
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    # 检查数据库连接
    log_diag "检查数据库连接..."
    
    if [ -z "$DB_HOST" ]; then
        log_warn "未配置数据库主机"
        add_warning "数据库配置缺失"
        return 0
    fi
    
    # 检查端口
    log_diag "检查数据库端口 $DB_HOST:${DB_PORT:-5432}..."
    if ! nc -z -w 5 "$DB_HOST" "${DB_PORT:-5432}" 2>/dev/null; then
        log_error "数据库端口不可达"
        add_issue "数据库端口不可达" "检查数据库服务是否运行"
        
        # 诊断原因
        if [ "$DB_HOST" = "postgres" ] || [ "$DB_HOST" = "localhost" ]; then
            log_diag "检查本地数据库容器..."
            if ! docker ps | grep -q "postgres"; then
                log_warn "PostgreSQL 容器未运行"
            fi
        fi
        return 1
    fi
    log_success "数据库端口可达"
    
    # 检查数据库认证
    if command -v psql &>/dev/null; then
        log_diag "检查数据库认证..."
        if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" -d "${DB_NAME:-openchat}" -c "SELECT 1" &>/dev/null; then
            log_error "数据库认证失败"
            add_issue "数据库认证失败" "检查 DB_USER 和 DB_PASSWORD 配置"
            return 1
        fi
        log_success "数据库认证成功"
        
        # 检查数据库大小
        log_diag "检查数据库大小..."
        local db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" -d "${DB_NAME:-openchat}" -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME:-openchat}'))" -t 2>/dev/null | tr -d ' ')
        log_info "数据库大小: $db_size"
        
        # 检查连接数
        log_diag "检查数据库连接数..."
        local connections=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" -d "${DB_NAME:-openchat}" -c "SELECT count(*) FROM pg_stat_activity" -t 2>/dev/null | tr -d ' ')
        log_info "当前连接数: $connections"
        
        # 检查表是否存在
        log_diag "检查必要表是否存在..."
        local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-openchat}" -d "${DB_NAME:-openchat}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" -t 2>/dev/null | tr -d ' ')
        if [ "$table_count" -lt 5 ]; then
            log_warn "数据库表数量较少 ($table_count)，可能未完成初始化"
            add_warning "数据库可能未完成初始化"
        else
            log_success "数据库表数量: $table_count"
        fi
    else
        log_warn "psql 未安装，跳过数据库认证检查"
    fi
}

# ============================================
# Redis 诊断
# ============================================
diagnose_redis() {
    echo
    echo -e "${BOLD}━━━ Redis 诊断 ━━━${NC}"
    
    # 加载环境变量
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    # 检查 Redis 连接
    log_diag "检查 Redis 连接..."
    
    if [ -z "$REDIS_HOST" ]; then
        log_warn "未配置 Redis 主机"
        add_warning "Redis 配置缺失"
        return 0
    fi
    
    # 检查端口
    log_diag "检查 Redis 端口 ${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}..."
    if ! nc -z -w 5 "${REDIS_HOST:-localhost}" "${REDIS_PORT:-6379}" 2>/dev/null; then
        log_error "Redis 端口不可达"
        add_issue "Redis 端口不可达" "检查 Redis 服务是否运行"
        return 1
    fi
    log_success "Redis 端口可达"
    
    # 检查 Redis 认证
    if command -v redis-cli &>/dev/null; then
        log_diag "检查 Redis 认证..."
        local result
        if [ -n "$REDIS_PASSWORD" ]; then
            result=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" -a "$REDIS_PASSWORD" ping 2>/dev/null)
        else
            result=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping 2>/dev/null)
        fi
        
        if [ "$result" != "PONG" ]; then
            log_error "Redis 认证失败"
            add_issue "Redis 认证失败" "检查 REDIS_PASSWORD 配置"
            return 1
        fi
        log_success "Redis 认证成功"
        
        # 检查 Redis 内存
        log_diag "检查 Redis 内存使用..."
        local mem_info
        if [ -n "$REDIS_PASSWORD" ]; then
            mem_info=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" -a "$REDIS_PASSWORD" INFO memory 2>/dev/null)
        else
            mem_info=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" INFO memory 2>/dev/null)
        fi
        local used_memory=$(echo "$mem_info" | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        log_info "Redis 内存使用: $used_memory"
        
        # 检查 Redis 连接数
        log_diag "检查 Redis 连接数..."
        local connected_clients
        if [ -n "$REDIS_PASSWORD" ]; then
            connected_clients=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" -a "$REDIS_PASSWORD" INFO clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
        else
            connected_clients=$(redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" INFO clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
        fi
        log_info "Redis 连接数: $connected_clients"
    else
        log_warn "redis-cli 未安装，跳过 Redis 认证检查"
    fi
}

# ============================================
# 网络诊断
# ============================================
diagnose_network() {
    echo
    echo -e "${BOLD}━━━ 网络诊断 ━━━${NC}"
    
    # 检查端口监听
    log_diag "检查端口监听状态..."
    local ports=("3000" "5432" "6379" "5001" "5100" "5200")
    
    for port in "${ports[@]}"; do
        if ss -tuln 2>/dev/null | grep -q ":$port " || netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_success "端口 $port: 正在监听"
        else
            log_warn "端口 $port: 未监听"
        fi
    done
    
    # 检查防火墙
    log_diag "检查防火墙状态..."
    if command -v ufw &>/dev/null; then
        local ufw_status=$(ufw status 2>/dev/null | head -1 | awk '{print $2}')
        if [ "$ufw_status" = "active" ]; then
            log_warn "UFW 防火墙已启用"
            add_warning "防火墙已启用，请确保开放必要端口"
        else
            log_success "UFW 防火墙未启用"
        fi
    fi
    
    # 检查 DNS
    log_diag "检查 DNS 解析..."
    if nslookup docker.com &>/dev/null || host docker.com &>/dev/null; then
        log_success "DNS 解析正常"
    else
        log_error "DNS 解析失败"
        add_issue "DNS 解析失败" "检查 /etc/resolv.conf 配置"
    fi
    
    # 检查外网连接
    log_diag "检查外网连接..."
    if curl -s --connect-timeout 5 https://www.google.com &>/dev/null || curl -s --connect-timeout 5 https://www.baidu.com &>/dev/null; then
        log_success "外网连接正常"
    else
        log_warn "外网连接失败"
        add_warning "外网连接失败，部分功能可能受限"
    fi
}

# ============================================
# 配置诊断
# ============================================
diagnose_config() {
    echo
    echo -e "${BOLD}━━━ 配置诊断 ━━━${NC}"
    
    # 检查 .env 文件
    log_diag "检查 .env 文件..."
    if [ ! -f ".env" ]; then
        log_error ".env 文件不存在"
        add_issue ".env 文件不存在" "复制模板: cp .env.example .env"
        return 1
    fi
    log_success ".env 文件存在"
    
    # 检查必要配置
    log_diag "检查必要配置项..."
    local required_vars=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "REDIS_HOST" "JWT_SECRET" "EXTERNAL_IP")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "缺少配置项: ${missing_vars[*]}"
        add_issue "缺少必要配置项" "编辑 .env 文件添加缺失配置"
    else
        log_success "所有必要配置项已设置"
    fi
    
    # 检查 JWT 密钥强度
    log_diag "检查 JWT 密钥强度..."
    local jwt_secret=$(grep "^JWT_SECRET=" .env 2>/dev/null | cut -d= -f2)
    if [ ${#jwt_secret} -lt 32 ]; then
        log_warn "JWT 密钥长度不足 (${#jwt_secret} 字符)"
        add_warning "JWT 密钥建议至少 32 个字符"
    else
        log_success "JWT 密钥长度: ${#jwt_secret} 字符"
    fi
    
    # 检查默认密码
    log_diag "检查默认密码..."
    local db_password=$(grep "^DB_PASSWORD=" .env 2>/dev/null | cut -d= -f2)
    if [[ "$db_password" == *"password"* ]] || [[ "$db_password" == *"123456"* ]] || [[ "$db_password" == *"admin"* ]]; then
        log_warn "检测到弱密码"
        add_warning "数据库密码过于简单，建议修改"
    fi
    
    # 检查文件权限
    log_diag "检查文件权限..."
    if [ -f ".env" ]; then
        local env_perms=$(stat -c %a .env 2>/dev/null || stat -f %OLp .env 2>/dev/null)
        if [ "$env_perms" != "600" ]; then
            log_warn ".env 文件权限过于开放 ($env_perms)"
            add_warning "建议设置 .env 权限为 600: chmod 600 .env"
        else
            log_success ".env 文件权限正确"
        fi
    fi
}

# ============================================
# 日志诊断
# ============================================
diagnose_logs() {
    echo
    echo -e "${BOLD}━━━ 日志诊断 ━━━${NC}"
    
    # 检查应用日志
    log_diag "检查应用日志..."
    if [ -f "var/logs/openchat.log" ]; then
        local error_count=$(grep -c "error\|Error\|ERROR" var/logs/openchat.log 2>/dev/null || echo 0)
        local warn_count=$(grep -c "warn\|Warn\|WARN" var/logs/openchat.log 2>/dev/null || echo 0)
        
        log_info "错误日志: $error_count 条"
        log_info "警告日志: $warn_count 条"
        
        if [ "$error_count" -gt 10 ]; then
            log_warn "错误日志较多，显示最近 5 条:"
            grep -i "error" var/logs/openchat.log | tail -5
        fi
    else
        log_info "应用日志文件不存在"
    fi
    
    # 检查 Docker 日志
    log_diag "检查 Docker 容器日志..."
    for container in openchat openchat-postgres openchat-redis; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            local restart_count=$(docker inspect --format='{{.RestartCount}}' "$container" 2>/dev/null || echo 0)
            if [ "$restart_count" -gt 0 ]; then
                log_warn "$container 重启次数: $restart_count"
                add_warning "容器 $container 重启次数较多"
            fi
        fi
    done
}

# ============================================
# 显示诊断结果
# ============================================
show_diagnosis_result() {
    echo
    echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║                    诊断结果汇总                               ║${NC}"
    echo -e "${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # 显示问题
    if [ ${#ISSUES[@]} -gt 0 ]; then
        echo -e "${RED}发现 ${#ISSUES[@]} 个问题:${NC}"
        for i in "${!ISSUES[@]}"; do
            echo -e "  ${RED}$((i+1)).${NC} ${ISSUES[$i]}"
            echo -e "     ${CYAN}建议:${NC} ${SUGGESTIONS[$i]}"
        done
        echo
    fi
    
    # 显示警告
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo -e "${YELLOW}发现 ${#WARNINGS[@]} 个警告:${NC}"
        for i in "${!WARNINGS[@]}"; do
            echo -e "  ${YELLOW}$((i+1)).${NC} ${WARNINGS[$i]}"
        done
        echo
    fi
    
    # 总结
    if [ ${#ISSUES[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
        echo -e "${GREEN}未发现问题，系统运行正常${NC}"
    elif [ ${#ISSUES[@]} -eq 0 ]; then
        echo -e "${YELLOW}存在警告，建议检查${NC}"
    else
        echo -e "${RED}存在问题，请按建议修复${NC}"
        echo
        echo -e "${CYAN}运行自动修复: ./scripts/auto-fix.sh${NC}"
    fi
}

# ============================================
# 生成诊断报告
# ============================================
generate_report() {
    local report_file="var/logs/diagnosis-report-$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p var/logs
    
    {
        echo "OpenChat 诊断报告"
        echo "生成时间: $(date)"
        echo
        echo "系统信息:"
        echo "  操作系统: $(uname -a)"
        echo "  Docker 版本: $(docker --version 2>/dev/null || echo '未安装')"
        echo
        if [ ${#ISSUES[@]} -gt 0 ]; then
            echo "问题列表:"
            for i in "${!ISSUES[@]}"; do
                echo "  $((i+1)). ${ISSUES[$i]}"
                echo "     建议: ${SUGGESTIONS[$i]}"
            done
            echo
        fi
        if [ ${#WARNINGS[@]} -gt 0 ]; then
            echo "警告列表:"
            for i in "${!WARNINGS[@]}"; do
                echo "  $((i+1)). ${WARNINGS[$i]}"
            done
        fi
    } > "$report_file"
    
    log_info "诊断报告已保存: $report_file"
}

# ============================================
# 主程序
# ============================================
main() {
    show_banner
    
    # 执行所有诊断
    diagnose_docker
    diagnose_containers
    diagnose_database
    diagnose_redis
    diagnose_network
    diagnose_config
    diagnose_logs
    
    # 生成报告
    generate_report
    
    # 显示结果
    show_diagnosis_result
}

# 运行主程序
main "$@"
