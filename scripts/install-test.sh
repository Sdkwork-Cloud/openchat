#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/var/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TEST_PASSED=0
TEST_FAILED=0
TEST_SKIPPED=0
TEST_RESULTS=()

log_test() {
    local name="$1"
    local status="$2"
    local message="${3:-}"
    
    case "$status" in
        "PASS")
            ((TEST_PASSED++))
            echo -e "${GREEN}✓ PASS${NC} ${name}"
            ;;
        "FAIL")
            ((TEST_FAILED++))
            echo -e "${RED}✗ FAIL${NC} ${name}"
            [[ -n "$message" ]] && echo -e "  ${RED}→ ${message}${NC}"
            ;;
        "SKIP")
            ((TEST_SKIPPED++))
            echo -e "${YELLOW}○ SKIP${NC} ${name}"
            [[ -n "$message" ]] && echo -e "  ${YELLOW}→ ${message}${NC}"
            ;;
    esac
    
    TEST_RESULTS+=("${status}: ${name} - ${message}")
}

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              OpenChat 安装测试工具                              ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

test_docker_installed() {
    echo -e "\n${BLUE}=== Docker 测试 ===${NC}"
    
    if command -v docker &>/dev/null; then
        local version
        version=$(docker --version)
        log_test "Docker 安装" "PASS" "$version"
    else
        log_test "Docker 安装" "FAIL" "Docker 未安装"
        return 1
    fi
    
    if command -v docker-compose &>/dev/null; then
        local version
        version=$(docker-compose --version)
        log_test "Docker Compose 安装" "PASS" "$version"
    elif docker compose version &>/dev/null; then
        local version
        version=$(docker compose version)
        log_test "Docker Compose (插件) 安装" "PASS" "$version"
    else
        log_test "Docker Compose 安装" "FAIL" "Docker Compose 未安装"
        return 1
    fi
    
    if docker info &>/dev/null; then
        log_test "Docker 服务运行" "PASS"
    else
        log_test "Docker 服务运行" "FAIL" "Docker 服务未运行"
        return 1
    fi
    
    return 0
}

test_docker_permissions() {
    if docker ps &>/dev/null; then
        log_test "Docker 权限" "PASS"
    else
        log_test "Docker 权限" "FAIL" "当前用户无Docker权限"
    fi
}

test_required_files() {
    echo -e "\n${BLUE}=== 文件检查 ===${NC}"
    
    local required_files=(
        "docker-compose.yml"
        "Dockerfile"
        ".env"
        "package.json"
        "nest-cli.json"
        "tsconfig.json"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "${PROJECT_ROOT}/${file}" ]]; then
            log_test "文件存在: ${file}" "PASS"
        else
            log_test "文件存在: ${file}" "FAIL" "文件不存在"
        fi
    done
    
    local required_dirs=(
        "src"
        "scripts"
        "var/logs"
        "var/uploads"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [[ -d "${PROJECT_ROOT}/${dir}" ]]; then
            log_test "目录存在: ${dir}" "PASS"
        else
            log_test "目录存在: ${dir}" "FAIL" "目录不存在"
        fi
    done
}

test_env_configuration() {
    echo -e "\n${BLUE}=== 环境配置测试 ===${NC}"
    
    local env_file="${PROJECT_ROOT}/.env"
    
    if [[ ! -f "$env_file" ]]; then
        log_test "环境配置文件" "FAIL" ".env 文件不存在"
        return 1
    fi
    
    log_test "环境配置文件存在" "PASS"
    
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DB_HOST"
        "DB_PORT"
        "DB_USERNAME"
        "DB_PASSWORD"
        "DB_DATABASE"
        "REDIS_HOST"
        "REDIS_PORT"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" "$env_file" 2>/dev/null; then
            local value
            value=$(grep "^${var}=" "$env_file" | cut -d'=' -f2)
            if [[ -n "$value" && "$value" != "your_"* && "$value" != "change_"* ]]; then
                log_test "环境变量: ${var}" "PASS"
            else
                log_test "环境变量: ${var}" "FAIL" "值未配置或使用默认值"
            fi
        else
            log_test "环境变量: ${var}" "FAIL" "变量不存在"
        fi
    done
    
    local jwt_secret
    jwt_secret=$(grep "^JWT_SECRET=" "$env_file" 2>/dev/null | cut -d'=' -f2)
    
    if [[ ${#jwt_secret} -ge 32 ]]; then
        log_test "JWT密钥强度" "PASS" "长度: ${#jwt_secret}"
    else
        log_test "JWT密钥强度" "FAIL" "密钥长度不足 (当前: ${#jwt_secret}, 建议: >=32)"
    fi
}

test_containers() {
    echo -e "\n${BLUE}=== 容器测试 ===${NC}"
    
    local containers=("openchat-server" "openchat-postgres" "openchat-redis")
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=${container}" --filter "status=running" -q | grep -q .; then
            log_test "容器运行: ${container}" "PASS"
            
            local health
            health=$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
            
            case "$health" in
                "healthy")
                    log_test "容器健康: ${container}" "PASS"
                    ;;
                "unhealthy")
                    log_test "容器健康: ${container}" "FAIL" "容器状态不健康"
                    ;;
                "starting")
                    log_test "容器健康: ${container}" "SKIP" "容器正在启动中"
                    ;;
                *)
                    log_test "容器健康: ${container}" "SKIP" "无健康检查配置"
                    ;;
            esac
        else
            if docker ps -a --filter "name=${container}" -q | grep -q .; then
                local status
                status=$(docker inspect --format '{{.State.Status}}' "$container" 2>/dev/null)
                log_test "容器运行: ${container}" "FAIL" "容器状态: ${status}"
            else
                log_test "容器运行: ${container}" "SKIP" "容器不存在"
            fi
        fi
    done
}

test_database_connection() {
    echo -e "\n${BLUE}=== 数据库测试 ===${NC}"
    
    local db_container="openchat-postgres"
    
    if ! docker ps --filter "name=${db_container}" --filter "status=running" -q | grep -q .; then
        log_test "数据库连接" "SKIP" "数据库容器未运行"
        return 0
    fi
    
    if docker exec "${db_container}" pg_isready -U postgres &>/dev/null; then
        log_test "数据库就绪" "PASS"
    else
        log_test "数据库就绪" "FAIL" "数据库未就绪"
        return 1
    fi
    
    local env_file="${PROJECT_ROOT}/.env"
    local db_name
    db_name=$(grep "^DB_DATABASE=" "$env_file" 2>/dev/null | cut -d'=' -f2)
    db_name="${db_name:-openchat}"
    
    if docker exec "${db_container}" psql -U postgres -d "$db_name" -c "SELECT 1" &>/dev/null; then
        log_test "数据库连接" "PASS"
    else
        log_test "数据库连接" "FAIL" "无法连接到数据库"
        return 1
    fi
    
    local tables
    tables=$(docker exec "${db_container}" psql -U postgres -d "$db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')
    
    if [[ "$tables" -gt 0 ]]; then
        log_test "数据库表" "PASS" "表数量: ${tables}"
    else
        log_test "数据库表" "FAIL" "数据库为空，可能未执行迁移"
    fi
}

test_redis_connection() {
    echo -e "\n${BLUE}=== Redis测试 ===${NC}"
    
    local redis_container="openchat-redis"
    
    if ! docker ps --filter "name=${redis_container}" --filter "status=running" -q | grep -q .; then
        log_test "Redis连接" "SKIP" "Redis容器未运行"
        return 0
    fi
    
    if docker exec "${redis_container}" redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_test "Redis连接" "PASS"
    else
        log_test "Redis连接" "FAIL" "Redis未响应"
        return 1
    fi
    
    local test_key="__openchat_test__"
    local test_value="test_$(date +%s)"
    
    docker exec "${redis_container}" redis-cli SET "$test_key" "$test_value" EX 10 &>/dev/null
    local retrieved
    retrieved=$(docker exec "${redis_container}" redis-cli GET "$test_key" 2>/dev/null)
    
    if [[ "$retrieved" == "$test_value" ]]; then
        log_test "Redis读写" "PASS"
        docker exec "${redis_container}" redis-cli DEL "$test_key" &>/dev/null
    else
        log_test "Redis读写" "FAIL" "读写测试失败"
    fi
    
    local memory
    memory=$(docker exec "${redis_container}" redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    log_test "Redis内存使用" "PASS" "使用: ${memory}"
}

test_api_endpoints() {
    echo -e "\n${BLUE}=== API端点测试 ===${NC}"
    
    local base_url="${API_URL:-http://localhost:3000}"
    local timeout=5
    
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "${base_url}/health" 2>/dev/null || echo "000")
    
    case "$response" in
        "200")
            log_test "健康检查端点" "PASS" "HTTP ${response}"
            ;;
        "404")
            log_test "健康检查端点" "FAIL" "端点不存在 (HTTP 404)"
            ;;
        "000")
            log_test "健康检查端点" "FAIL" "无法连接到服务"
            ;;
        *)
            log_test "健康检查端点" "FAIL" "HTTP ${response}"
            ;;
    esac
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "${base_url}/api" 2>/dev/null || echo "000")
    
    case "$response" in
        "200"|"404")
            log_test "API端点" "PASS" "HTTP ${response}"
            ;;
        "000")
            log_test "API端点" "FAIL" "无法连接"
            ;;
        *)
            log_test "API端点" "SKIP" "HTTP ${response}"
            ;;
    esac
}

test_network() {
    echo -e "\n${BLUE}=== 网络测试 ===${NC}"
    
    local networks=("openchat-network" "openchat_default")
    local network_found=false
    
    for network in "${networks[@]}"; do
        if docker network inspect "$network" &>/dev/null; then
            log_test "Docker网络: ${network}" "PASS"
            network_found=true
            break
        fi
    done
    
    if [[ "$network_found" == false ]]; then
        log_test "Docker网络" "FAIL" "OpenChat网络不存在"
    fi
    
    local ports=("3000" "5432" "6379")
    
    for port in "${ports[@]}"; do
        if lsof -i ":${port}" &>/dev/null || netstat -tuln 2>/dev/null | grep -q ":${port}"; then
            log_test "端口监听: ${port}" "PASS"
        else
            log_test "端口监听: ${port}" "FAIL" "端口未监听"
        fi
    done
}

test_disk_space() {
    echo -e "\n${BLUE}=== 磁盘空间测试 ===${NC}"
    
    local available
    available=$(df -BG "${PROJECT_ROOT}" 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'G')
    
    if [[ "$available" -ge 10 ]]; then
        log_test "磁盘空间" "PASS" "可用: ${available}GB"
    elif [[ "$available" -ge 5 ]]; then
        log_test "磁盘空间" "PASS" "可用: ${available}GB (警告: 空间较低)"
    else
        log_test "磁盘空间" "FAIL" "可用: ${available}GB (空间不足)"
    fi
    
    local docker_usage
    docker_usage=$(docker system df 2>/dev/null | grep "Images" | awk '{print $3}' | head -1)
    log_test "Docker镜像空间" "PASS" "使用: ${docker_usage}"
}

test_permissions() {
    echo -e "\n${BLUE}=== 权限测试 ===${NC}"
    
    local dirs=(
        "${PROJECT_ROOT}/var/logs"
        "${PROJECT_ROOT}/var/uploads"
        "${PROJECT_ROOT}/var/postgres"
        "${PROJECT_ROOT}/var/redis"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            if [[ -r "$dir" && -w "$dir" && -x "$dir" ]]; then
                log_test "目录权限: $(basename "$dir")" "PASS"
            else
                log_test "目录权限: $(basename "$dir")" "FAIL" "权限不足"
            fi
        else
            log_test "目录权限: $(basename "$dir")" "SKIP" "目录不存在"
        fi
    done
}

test_ssl_certificates() {
    echo -e "\n${BLUE}=== SSL证书测试 ===${NC}"
    
    local ssl_dir="${PROJECT_ROOT}/var/ssl"
    
    if [[ -d "$ssl_dir" ]]; then
        if [[ -f "${ssl_dir}/cert.pem" && -f "${ssl_dir}/key.pem" ]]; then
            local cert_expiry
            cert_expiry=$(openssl x509 -enddate -noout -in "${ssl_dir}/cert.pem" 2>/dev/null | cut -d= -f2)
            
            local expiry_epoch
            expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$cert_expiry" +%s 2>/dev/null)
            local current_epoch
            current_epoch=$(date +%s)
            
            if [[ $expiry_epoch -gt $current_epoch ]]; then
                log_test "SSL证书有效期" "PASS" "过期时间: ${cert_expiry}"
            else
                log_test "SSL证书有效期" "FAIL" "证书已过期"
            fi
        else
            log_test "SSL证书" "SKIP" "证书文件不存在"
        fi
    else
        log_test "SSL证书" "SKIP" "SSL目录不存在"
    fi
}

test_backup_system() {
    echo -e "\n${BLUE}=== 备份系统测试 ===${NC}"
    
    local backup_dir="${PROJECT_ROOT}/var/backups"
    
    if [[ -d "$backup_dir" ]]; then
        local backup_count
        backup_count=$(find "$backup_dir" -type f -name "*.sql.gz" 2>/dev/null | wc -l)
        
        if [[ "$backup_count" -gt 0 ]]; then
            log_test "备份文件" "PASS" "备份数量: ${backup_count}"
            
            local latest_backup
            latest_backup=$(find "$backup_dir" -type f -name "*.sql.gz" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
            
            if [[ -n "$latest_backup" ]]; then
                local backup_size
                backup_size=$(du -h "$latest_backup" 2>/dev/null | cut -f1)
                log_test "最新备份" "PASS" "大小: ${backup_size}"
            fi
        else
            log_test "备份文件" "SKIP" "无备份文件"
        fi
    else
        log_test "备份目录" "SKIP" "备份目录不存在"
    fi
}

test_log_rotation() {
    echo -e "\n${BLUE}=== 日志轮转测试 ===${NC}"
    
    if [[ -f "/etc/logrotate.d/openchat" ]]; then
        log_test "日志轮转配置" "PASS"
    else
        log_test "日志轮转配置" "SKIP" "未配置系统日志轮转"
    fi
    
    local log_count
    log_count=$(find "${LOG_DIR}" -type f -name "*.log" 2>/dev/null | wc -l)
    
    if [[ "$log_count" -gt 0 ]]; then
        local total_size
        total_size=$(du -sh "${LOG_DIR}" 2>/dev/null | cut -f1)
        log_test "日志文件" "PASS" "文件数: ${log_count}, 总大小: ${total_size}"
    else
        log_test "日志文件" "SKIP" "无日志文件"
    fi
}

run_quick_test() {
    print_header
    echo -e "${CYAN}执行快速测试...${NC}"
    
    test_docker_installed
    test_required_files
    test_containers
    test_api_endpoints
}

run_full_test() {
    print_header
    echo -e "${CYAN}执行完整测试...${NC}"
    
    test_docker_installed
    test_docker_permissions
    test_required_files
    test_env_configuration
    test_containers
    test_database_connection
    test_redis_connection
    test_api_endpoints
    test_network
    test_disk_space
    test_permissions
    test_ssl_certificates
    test_backup_system
    test_log_rotation
}

generate_report() {
    local report_file="${LOG_DIR}/install-test-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=========================================="
        echo "OpenChat 安装测试报告"
        echo "生成时间: $(date)"
        echo "=========================================="
        echo ""
        echo "测试摘要:"
        echo "  通过: ${TEST_PASSED}"
        echo "  失败: ${TEST_FAILED}"
        echo "  跳过: ${TEST_SKIPPED}"
        echo ""
        echo "详细结果:"
        for result in "${TEST_RESULTS[@]}"; do
            echo "  ${result}"
        done
        echo ""
        
        if [[ $TEST_FAILED -gt 0 ]]; then
            echo "状态: 失败"
            exit_code=1
        else
            echo "状态: 通过"
            exit_code=0
        fi
        
    } > "$report_file"
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}测试摘要${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}通过: ${TEST_PASSED}${NC}"
    echo -e "  ${RED}失败: ${TEST_FAILED}${NC}"
    echo -e "  ${YELLOW}跳过: ${TEST_SKIPPED}${NC}"
    echo ""
    echo -e "报告已保存: ${report_file}"
    
    if [[ $TEST_FAILED -gt 0 ]]; then
        echo -e "\n${RED}存在失败的测试，请检查上述错误信息${NC}"
        return 1
    else
        echo -e "\n${GREEN}所有测试通过！${NC}"
        return 0
    fi
}

show_help() {
    cat << EOF
OpenChat 安装测试工具

用法: $(basename "$0") [命令]

命令:
    quick       执行快速测试 (Docker、文件、容器、API)
    full        执行完整测试 (所有测试项)
    docker      仅测试Docker
    files       仅测试文件
    env         仅测试环境配置
    containers  仅测试容器
    database    仅测试数据库
    redis       仅测试Redis
    api         仅测试API端点
    network     仅测试网络
    report      生成测试报告
    help        显示帮助信息

示例:
    $(basename "$0") quick      # 快速测试
    $(basename "$0") full       # 完整测试
    $(basename "$0") database   # 仅测试数据库

EOF
}

main() {
    mkdir -p "${LOG_DIR}"
    
    local command="${1:-full}"
    
    case "$command" in
        quick)
            run_quick_test
            generate_report
            ;;
        full)
            run_full_test
            generate_report
            ;;
        docker)
            print_header
            test_docker_installed
            test_docker_permissions
            ;;
        files)
            print_header
            test_required_files
            ;;
        env)
            print_header
            test_env_configuration
            ;;
        containers)
            print_header
            test_containers
            ;;
        database)
            print_header
            test_database_connection
            ;;
        redis)
            print_header
            test_redis_connection
            ;;
        api)
            print_header
            test_api_endpoints
            ;;
        network)
            print_header
            test_network
            ;;
        report)
            run_full_test
            generate_report
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: ${command}${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
