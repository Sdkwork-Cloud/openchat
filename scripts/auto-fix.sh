#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/var/logs"
BACKUP_DIR="${PROJECT_ROOT}/var/backups"
STATE_FILE="${PROJECT_ROOT}/.openchat-install-state"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FIX_LOG="${LOG_DIR}/auto-fix-$(date +%Y%m%d_%H%M%S).log"

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "${FIX_LOG}"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

FIXED_ISSUES=()
FAILED_FIXES=()
MANUAL_ACTIONS=()

check_docker_service() {
    log_info "检查Docker服务状态..."
    
    if ! docker info &>/dev/null; then
        log_warn "Docker服务未运行，尝试启动..."
        
        if command -v systemctl &>/dev/null; then
            sudo systemctl start docker
            sudo systemctl enable docker
        elif command -v service &>/dev/null; then
            sudo service docker start
        else
            log_error "无法启动Docker服务，请手动启动"
            MANUAL_ACTIONS+=("手动启动Docker服务")
            return 1
        fi
        
        sleep 3
        if docker info &>/dev/null; then
            log_success "Docker服务已启动"
            FIXED_ISSUES+=("Docker服务启动")
            return 0
        else
            log_error "Docker服务启动失败"
            return 1
        fi
    fi
    
    log_info "Docker服务运行正常"
    return 0
}

fix_docker_permissions() {
    log_info "检查Docker权限..."
    
    if ! docker ps &>/dev/null 2>&1; then
        log_warn "当前用户无Docker权限，尝试修复..."
        
        if getent group docker &>/dev/null; then
            sudo usermod -aG docker "$USER"
            log_warn "已将用户添加到docker组，需要重新登录生效"
            MANUAL_ACTIONS+=("重新登录或重启终端以获取Docker权限")
        else
            sudo groupadd docker
            sudo usermod -aG docker "$USER"
            log_warn "已创建docker组并添加用户，需要重新登录生效"
            MANUAL_ACTIONS+=("重新登录或重启终端以获取Docker权限")
        fi
        
        FIXED_ISSUES+=("Docker权限配置")
    fi
    
    return 0
}

fix_stopped_containers() {
    log_info "检查停止的容器..."
    
    local stopped_containers
    stopped_containers=$(docker ps -a --filter "name=openchat" --filter "status=exited" -q 2>/dev/null || true)
    
    if [[ -n "$stopped_containers" ]]; then
        log_warn "发现停止的OpenChat容器，尝试重启..."
        
        for container_id in $stopped_containers; do
            local container_name
            container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^//')
            log_info "重启容器: ${container_name}"
            
            if docker start "$container_id"; then
                log_success "容器 ${container_name} 已重启"
                FIXED_ISSUES+=("容器重启: ${container_name}")
            else
                log_error "容器 ${container_name} 重启失败"
                FAILED_FIXES+=("容器重启: ${container_name}")
            fi
        done
    else
        log_info "没有发现停止的OpenChat容器"
    fi
    
    return 0
}

fix_unhealthy_containers() {
    log_info "检查不健康的容器..."
    
    local unhealthy
    unhealthy=$(docker ps --filter "name=openchat" --filter "health=unhealthy" -q 2>/dev/null || true)
    
    if [[ -n "$unhealthy" ]]; then
        log_warn "发现不健康的容器，尝试重建..."
        
        for container_id in $unhealthy; do
            local container_name
            container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^//')
            log_info "重建容器: ${container_name}"
            
            docker rm -f "$container_id" 2>/dev/null || true
            
            FIXED_ISSUES+=("容器重建: ${container_name}")
        done
        
        log_info "重新创建容器..."
        cd "${PROJECT_ROOT}"
        docker-compose up -d
        
        return 0
    fi
    
    log_info "所有容器健康状态正常"
    return 0
}

fix_network_issues() {
    log_info "检查Docker网络..."
    
    local networks=("openchat-network" "openchat_default")
    local network_exists=false
    
    for network in "${networks[@]}"; do
        if docker network inspect "$network" &>/dev/null; then
            network_exists=true
            log_info "Docker网络 ${network} 存在"
            break
        fi
    done
    
    if [[ "$network_exists" == false ]]; then
        log_warn "Docker网络不存在，尝试创建..."
        
        if docker network create openchat-network; then
            log_success "Docker网络已创建"
            FIXED_ISSUES+=("Docker网络创建")
        else
            log_error "Docker网络创建失败"
            FAILED_FIXES+=("Docker网络创建")
            return 1
        fi
    fi
    
    return 0
}

fix_volume_permissions() {
    log_info "检查数据卷权限..."
    
    local volumes=(
        "${PROJECT_ROOT}/var/postgres"
        "${PROJECT_ROOT}/var/redis"
        "${PROJECT_ROOT}/var/logs"
        "${PROJECT_ROOT}/var/uploads"
    )
    
    for volume in "${volumes[@]}"; do
        if [[ -d "$volume" ]]; then
            if [[ ! -r "$volume" || ! -w "$volume" ]]; then
                log_warn "修复目录权限: ${volume}"
                sudo chmod -R 755 "$volume"
                sudo chown -R "$USER:$USER" "$volume"
                FIXED_ISSUES+=("权限修复: ${volume}")
            fi
        else
            log_info "创建目录: ${volume}"
            mkdir -p "$volume"
            chmod 755 "$volume"
            FIXED_ISSUES+=("目录创建: ${volume}")
        fi
    done
    
    return 0
}

fix_env_file() {
    log_info "检查环境配置文件..."
    
    local env_file="${PROJECT_ROOT}/.env"
    
    if [[ ! -f "$env_file" ]]; then
        log_warn ".env文件不存在，尝试创建..."
        
        local env_template=""
        if [[ -f "${PROJECT_ROOT}/.env.production" ]]; then
            env_template="${PROJECT_ROOT}/.env.production"
        elif [[ -f "${PROJECT_ROOT}/.env.development" ]]; then
            env_template="${PROJECT_ROOT}/.env.development"
        fi
        
        if [[ -n "$env_template" ]]; then
            cp "$env_template" "$env_file"
            log_success "已从模板创建.env文件"
            FIXED_ISSUES+=(".env文件创建")
            MANUAL_ACTIONS+=("请编辑.env文件配置正确的参数")
        else
            log_error "找不到环境配置模板"
            FAILED_FIXES+=(".env文件创建")
            return 1
        fi
    fi
    
    local required_vars=("DB_HOST" "DB_PORT" "DB_USERNAME" "DB_PASSWORD" "DB_DATABASE" "REDIS_HOST" "REDIS_PORT" "JWT_SECRET")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warn "缺少必要的环境变量: ${missing_vars[*]}"
        MANUAL_ACTIONS+=("请在.env文件中配置: ${missing_vars[*]}")
    fi
    
    return 0
}

fix_database_connection() {
    log_info "检查数据库连接..."
    
    local db_container="openchat-postgres"
    
    if docker ps --filter "name=${db_container}" --filter "status=running" -q | grep -q .; then
        log_info "数据库容器运行中"
        
        local max_retries=30
        local retry=0
        
        while [[ $retry -lt $max_retries ]]; do
            if docker exec "${db_container}" pg_isready -U postgres &>/dev/null; then
                log_success "数据库已就绪"
                return 0
            fi
            ((retry++))
            sleep 1
        done
        
        log_warn "数据库未就绪，尝试重启..."
        docker restart "${db_container}"
        sleep 5
        
        if docker exec "${db_container}" pg_isready -U postgres &>/dev/null; then
            log_success "数据库重启后已就绪"
            FIXED_ISSUES+=("数据库重启")
            return 0
        else
            log_error "数据库连接失败"
            FAILED_FIXES+=("数据库连接")
            return 1
        fi
    else
        log_warn "数据库容器未运行"
        return 1
    fi
}

fix_redis_connection() {
    log_info "检查Redis连接..."
    
    local redis_container="openchat-redis"
    
    if docker ps --filter "name=${redis_container}" --filter "status=running" -q | grep -q .; then
        log_info "Redis容器运行中"
        
        if docker exec "${redis_container}" redis-cli ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis连接正常"
            return 0
        else
            log_warn "Redis未响应，尝试重启..."
            docker restart "${redis_container}"
            sleep 3
            
            if docker exec "${redis_container}" redis-cli ping 2>/dev/null | grep -q "PONG"; then
                log_success "Redis重启后连接正常"
                FIXED_ISSUES+=("Redis重启")
                return 0
            else
                log_error "Redis连接失败"
                FAILED_FIXES+=("Redis连接")
                return 1
            fi
        fi
    else
        log_warn "Redis容器未运行"
        return 1
    fi
}

fix_port_conflicts() {
    log_info "检查端口冲突..."
    
    local ports=("3000:3000" "5432:5432" "6379:6379" "80:80" "443:443")
    local conflicts=()
    
    for port_mapping in "${ports[@]}"; do
        local port="${port_mapping#*:}"
        
        if lsof -i ":${port}" &>/dev/null; then
            local process
            process=$(lsof -t -i ":${port}" 2>/dev/null | head -1)
            if [[ -n "$process" ]]; then
                conflicts+=("${port}:${process}")
            fi
        fi
    done
    
    if [[ ${#conflicts[@]} -gt 0 ]]; then
        log_warn "发现端口冲突: ${conflicts[*]}"
        
        for conflict in "${conflicts[@]}"; do
            local port="${conflict%%:*}"
            local pid="${conflict##*:}"
            
            log_warn "终止占用端口 ${port} 的进程 ${pid}"
            
            if kill -9 "$pid" 2>/dev/null; then
                log_success "已终止进程 ${pid}"
                FIXED_ISSUES+=("端口冲突解决: ${port}")
            else
                log_error "无法终止进程 ${pid}"
                MANUAL_ACTIONS+=("手动解决端口 ${port} 冲突")
            fi
        done
    else
        log_info "没有发现端口冲突"
    fi
    
    return 0
}

fix_disk_space() {
    log_info "检查磁盘空间..."
    
    local available
    available=$(df -BG "${PROJECT_ROOT}" | awk 'NR==2 {print $4}' | tr -d 'G')
    
    if [[ "$available" -lt 5 ]]; then
        log_warn "磁盘空间不足 (${available}GB)，尝试清理..."
        
        docker system prune -af --volumes 2>/dev/null || true
        
        local new_available
        new_available=$(df -BG "${PROJECT_ROOT}" | awk 'NR==2 {print $4}' | tr -d 'G')
        
        if [[ "$new_available" -gt "$available" ]]; then
            log_success "已清理Docker缓存，释放 $((new_available - available))GB"
            FIXED_ISSUES+=("磁盘空间清理")
        else
            log_warn "磁盘空间仍然不足"
            MANUAL_ACTIONS+=("请手动清理磁盘空间，当前仅剩 ${new_available}GB")
        fi
    else
        log_info "磁盘空间充足 (${available}GB)"
    fi
    
    return 0
}

fix_log_rotation() {
    log_info "检查日志轮转配置..."
    
    local logrotate_conf="/etc/logrotate.d/openchat"
    
    if [[ ! -f "$logrotate_conf" ]]; then
        log_info "创建日志轮转配置..."
        
        sudo tee "$logrotate_conf" > /dev/null << 'EOF'
/var/logs/openchat/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        docker kill -s USR1 openchat-server 2>/dev/null || true
    endscript
}
EOF
        
        log_success "日志轮转配置已创建"
        FIXED_ISSUES+=("日志轮转配置")
    fi
    
    return 0
}

fix_broken_state() {
    log_info "检查安装状态文件..."
    
    if [[ -f "$STATE_FILE" ]]; then
        local state
        state=$(grep "^STATE=" "$STATE_FILE" 2>/dev/null | cut -d'=' -f2)
        
        case "$state" in
            "installing"|"partial"|"failed")
                log_warn "检测到中断的安装，状态: ${state}"
                
                local backup_time
                backup_time=$(date +%Y%m%d_%H%M%S)
                
                if [[ -d "${PROJECT_ROOT}/var" ]]; then
                    mkdir -p "${BACKUP_DIR}"
                    cp -r "${PROJECT_ROOT}/var" "${BACKUP_DIR}/var_${backup_time}" 2>/dev/null || true
                fi
                
                log_info "已备份当前状态，尝试恢复安装..."
                
                sed -i 's/^STATE=.*/STATE=not_installed/' "$STATE_FILE" 2>/dev/null || true
                
                FIXED_ISSUES+=("安装状态重置")
                MANUAL_ACTIONS+=("请重新运行安装程序: ./scripts/install.sh")
                ;;
            "installed")
                log_info "安装状态正常"
                ;;
            *)
                log_warn "未知的安装状态: ${state}"
                ;;
        esac
    fi
    
    return 0
}

fix_ssl_certs() {
    log_info "检查SSL证书..."
    
    local ssl_dir="${PROJECT_ROOT}/var/ssl"
    local cert_file="${ssl_dir}/cert.pem"
    local key_file="${ssl_dir}/key.pem"
    
    if [[ -d "${PROJECT_ROOT}/nginx" ]]; then
        if [[ ! -f "$cert_file" || ! -f "$key_file" ]]; then
            log_warn "SSL证书不存在，生成自签名证书..."
            
            mkdir -p "$ssl_dir"
            
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$key_file" \
                -out "$cert_file" \
                -subj "/C=CN/ST=State/L=City/O=OpenChat/CN=localhost" 2>/dev/null
            
            if [[ -f "$cert_file" && -f "$key_file" ]]; then
                log_success "自签名SSL证书已生成"
                FIXED_ISSUES+=("SSL证书生成")
                MANUAL_ACTIONS+=("建议在生产环境使用正式SSL证书")
            else
                log_error "SSL证书生成失败"
                FAILED_FIXES+=("SSL证书生成")
            fi
        fi
    fi
    
    return 0
}

fix_container_restart_policy() {
    log_info "检查容器重启策略..."
    
    local containers
    containers=$(docker ps -a --filter "name=openchat" -q 2>/dev/null || true)
    
    for container_id in $containers; do
        local policy
        policy=$(docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$container_id" 2>/dev/null)
        
        if [[ "$policy" != "always" && "$policy" != "unless-stopped" ]]; then
            local container_name
            container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^//')
            
            log_warn "设置容器 ${container_name} 重启策略为 always"
            docker update --restart=always "$container_id"
            
            FIXED_ISSUES+=("重启策略设置: ${container_name}")
        fi
    done
    
    return 0
}

run_all_fixes() {
    log_info "=========================================="
    log_info "开始自动修复..."
    log_info "=========================================="
    
    mkdir -p "${LOG_DIR}"
    
    check_docker_service
    fix_docker_permissions
    fix_network_issues
    fix_port_conflicts
    fix_disk_space
    fix_volume_permissions
    fix_env_file
    fix_stopped_containers
    fix_unhealthy_containers
    fix_database_connection
    fix_redis_connection
    fix_container_restart_policy
    fix_log_rotation
    fix_ssl_certs
    fix_broken_state
    
    log_info "=========================================="
    log_info "修复完成"
    log_info "=========================================="
    
    if [[ ${#FIXED_ISSUES[@]} -gt 0 ]]; then
        log_success "已修复的问题 (${#FIXED_ISSUES[@]}):"
        for issue in "${FIXED_ISSUES[@]}"; do
            log_success "  ✓ ${issue}"
        done
    fi
    
    if [[ ${#FAILED_FIXES[@]} -gt 0 ]]; then
        log_error "修复失败 (${#FAILED_FIXES[@]}):"
        for issue in "${FAILED_FIXES[@]}"; do
            log_error "  ✗ ${issue}"
        done
    fi
    
    if [[ ${#MANUAL_ACTIONS[@]} -gt 0 ]]; then
        log_warn "需要手动处理 (${#MANUAL_ACTIONS[@]}):"
        for action in "${MANUAL_ACTIONS[@]}"; do
            log_warn "  ! ${action}"
        done
    fi
    
    log_info "修复日志已保存到: ${FIX_LOG}"
    
    if [[ ${#FAILED_FIXES[@]} -gt 0 || ${#MANUAL_ACTIONS[@]} -gt 0 ]]; then
        return 1
    fi
    
    return 0
}

show_help() {
    cat << EOF
OpenChat 自动修复工具

用法: $(basename "$0") [选项]

选项:
    -a, --all           运行所有修复
    -d, --docker        修复Docker相关问题
    -c, --containers    修复容器相关问题
    -n, --network       修复网络问题
    -p, --permissions   修复权限问题
    -e, --env           修复环境配置
    -D, --database      修复数据库连接
    -r, --redis         修复Redis连接
    -P, --ports         修复端口冲突
    -s, --space         清理磁盘空间
    -S, --ssl           修复SSL证书
    --state             修复安装状态
    -h, --help          显示帮助信息

示例:
    $(basename "$0") --all           # 运行所有修复
    $(basename "$0") -d -c           # 修复Docker和容器问题
    $(basename "$0") --database      # 仅修复数据库问题

EOF
}

main() {
    local run_all=false
    local fix_docker=false
    local fix_containers=false
    local fix_network=false
    local fix_perms=false
    local fix_env=false
    local fix_db=false
    local fix_redis=false
    local fix_ports=false
    local fix_space=false
    local fix_ssl=false
    local fix_state=false
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -a|--all)
                run_all=true
                shift
                ;;
            -d|--docker)
                fix_docker=true
                shift
                ;;
            -c|--containers)
                fix_containers=true
                shift
                ;;
            -n|--network)
                fix_network=true
                shift
                ;;
            -p|--permissions)
                fix_perms=true
                shift
                ;;
            -e|--env)
                fix_env=true
                shift
                ;;
            -D|--database)
                fix_db=true
                shift
                ;;
            -r|--redis)
                fix_redis=true
                shift
                ;;
            -P|--ports)
                fix_ports=true
                shift
                ;;
            -s|--space)
                fix_space=true
                shift
                ;;
            -S|--ssl)
                fix_ssl=true
                shift
                ;;
            --state)
                fix_state=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    mkdir -p "${LOG_DIR}"
    
    if [[ "$run_all" == true ]]; then
        run_all_fixes
        exit $?
    fi
    
    if [[ "$fix_docker" == false && "$fix_containers" == false && \
          "$fix_network" == false && "$fix_perms" == false && \
          "$fix_env" == false && "$fix_db" == false && \
          "$fix_redis" == false && "$fix_ports" == false && \
          "$fix_space" == false && "$fix_ssl" == false && \
          "$fix_state" == false ]]; then
        run_all_fixes
        exit $?
    fi
    
    log_info "开始选择性修复..."
    
    [[ "$fix_docker" == true ]] && { check_docker_service; fix_docker_permissions; }
    [[ "$fix_containers" == true ]] && { fix_stopped_containers; fix_unhealthy_containers; fix_container_restart_policy; }
    [[ "$fix_network" == true ]] && fix_network_issues
    [[ "$fix_perms" == true ]] && fix_volume_permissions
    [[ "$fix_env" == true ]] && fix_env_file
    [[ "$fix_db" == true ]] && fix_database_connection
    [[ "$fix_redis" == true ]] && fix_redis_connection
    [[ "$fix_ports" == true ]] && fix_port_conflicts
    [[ "$fix_space" == true ]] && fix_disk_space
    [[ "$fix_ssl" == true ]] && fix_ssl_certs
    [[ "$fix_state" == true ]] && fix_broken_state
    
    log_info "修复完成"
    
    if [[ ${#FIXED_ISSUES[@]} -gt 0 ]]; then
        log_success "已修复的问题:"
        for issue in "${FIXED_ISSUES[@]}"; do
            log_success "  ✓ ${issue}"
        done
    fi
    
    if [[ ${#MANUAL_ACTIONS[@]} -gt 0 ]]; then
        log_warn "需要手动处理:"
        for action in "${MANUAL_ACTIONS[@]}"; do
            log_warn "  ! ${action}"
        done
    fi
}

main "$@"
