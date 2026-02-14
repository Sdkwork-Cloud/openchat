#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/var/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ERROR_PATTERNS=(
    "error"
    "Error"
    "ERROR"
    "exception"
    "Exception"
    "EXCEPTION"
    "failed"
    "Failed"
    "FAILED"
    "fatal"
    "Fatal"
    "FATAL"
    "timeout"
    "Timeout"
    "TIMEOUT"
    "connection refused"
    "ECONNREFUSED"
    "ENOTFOUND"
    "ETIMEDOUT"
    "SIGKILL"
    "SIGTERM"
    "out of memory"
    "OOM"
    "segfault"
)

WARN_PATTERNS=(
    "warn"
    "Warn"
    "WARN"
    "warning"
    "Warning"
    "WARNING"
    "deprecated"
    "Deprecated"
    "DEPRECATED"
    "slow"
    "Slow"
    "retry"
    "Retry"
)

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              OpenChat 日志分析工具                              ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

analyze_log_file() {
    local log_file="$1"
    local output_file="$2"
    
    if [[ ! -f "$log_file" ]]; then
        echo -e "${RED}日志文件不存在: ${log_file}${NC}"
        return 1
    fi
    
    local total_lines=0
    local error_count=0
    local warn_count=0
    local info_count=0
    
    total_lines=$(wc -l < "$log_file")
    
    local error_pattern=$(IFS="|"; echo "${ERROR_PATTERNS[*]}")
    local warn_pattern=$(IFS="|"; echo "${WARN_PATTERNS[*]}")
    
    error_count=$(grep -cE "$error_pattern" "$log_file" 2>/dev/null || echo 0)
    warn_count=$(grep -cE "$warn_pattern" "$log_file" 2>/dev/null || echo 0)
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}文件: ${log_file}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  总行数:     ${total_lines}"
    echo -e "  错误数:     ${RED}${error_count}${NC}"
    echo -e "  警告数:     ${YELLOW}${warn_count}${NC}"
    
    if [[ "$error_count" -gt 0 ]]; then
        echo -e "\n${RED}最近错误 (最多显示20条):${NC}"
        grep -E "$error_pattern" "$log_file" | tail -20 | while read -r line; do
            echo -e "  ${RED}►${NC} ${line:0:200}"
        done
    fi
    
    if [[ "$warn_count" -gt 0 ]]; then
        echo -e "\n${YELLOW}最近警告 (最多显示10条):${NC}"
        grep -E "$warn_pattern" "$log_file" | tail -10 | while read -r line; do
            echo -e "  ${YELLOW}►${NC} ${line:0:200}"
        done
    fi
    
    if [[ -n "$output_file" ]]; then
        {
            echo "=== 日志分析报告 ==="
            echo "文件: ${log_file}"
            echo "分析时间: $(date)"
            echo "总行数: ${total_lines}"
            echo "错误数: ${error_count}"
            echo "警告数: ${warn_count}"
            echo ""
            if [[ "$error_count" -gt 0 ]]; then
                echo "=== 错误详情 ==="
                grep -E "$error_pattern" "$log_file"
                echo ""
            fi
            if [[ "$warn_count" -gt 0 ]]; then
                echo "=== 警告详情 ==="
                grep -E "$warn_pattern" "$log_file"
            fi
        } >> "$output_file"
    fi
    
    return 0
}

analyze_docker_logs() {
    local container_name="$1"
    local lines="${2:-500}"
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Docker容器日志: ${container_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if ! docker ps -a --filter "name=${container_name}" -q | grep -q .; then
        echo -e "${YELLOW}容器 ${container_name} 不存在${NC}"
        return 1
    fi
    
    local logs
    logs=$(docker logs --tail "$lines" "${container_name}" 2>&1)
    
    if [[ -z "$logs" ]]; then
        echo -e "${GREEN}容器日志为空${NC}"
        return 0
    fi
    
    local error_pattern=$(IFS="|"; echo "${ERROR_PATTERNS[*]}")
    local warn_pattern=$(IFS="|"; echo "${WARN_PATTERNS[*]}")
    
    local error_count
    local warn_count
    
    error_count=$(echo "$logs" | grep -cE "$error_pattern" 2>/dev/null || echo 0)
    warn_count=$(echo "$logs" | grep -cE "$warn_pattern" 2>/dev/null || echo 0)
    
    echo -e "  错误数:     ${RED}${error_count}${NC}"
    echo -e "  警告数:     ${YELLOW}${warn_count}${NC}"
    
    if [[ "$error_count" -gt 0 ]]; then
        echo -e "\n${RED}最近错误:${NC}"
        echo "$logs" | grep -E "$error_pattern" | tail -15 | while read -r line; do
            echo -e "  ${RED}►${NC} ${line:0:200}"
        done
    fi
    
    if [[ "$warn_count" -gt 0 && "$error_count" -eq 0 ]]; then
        echo -e "\n${YELLOW}最近警告:${NC}"
        echo "$logs" | grep -E "$warn_pattern" | tail -10 | while read -r line; do
            echo -e "  ${YELLOW}►${NC} ${line:0:200}"
        done
    fi
    
    if [[ "$error_count" -eq 0 && "$warn_count" -eq 0 ]]; then
        echo -e "\n${GREEN}✓ 没有发现错误或警告${NC}"
    fi
    
    return 0
}

analyze_all_containers() {
    local containers=("openchat-server" "openchat-postgres" "openchat-redis" "openchat-nginx" "openchat-wukongim")
    
    echo -e "\n${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Docker容器日志分析${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    
    for container in "${containers[@]}"; do
        analyze_docker_logs "$container" 200
    done
}

analyze_error_frequency() {
    local log_file="$1"
    
    if [[ ! -f "$log_file" ]]; then
        return 1
    fi
    
    echo -e "\n${BLUE}错误频率分析:${NC}"
    
    local error_pattern=$(IFS="|"; echo "${ERROR_PATTERNS[*]}")
    
    grep -E "$error_pattern" "$log_file" 2>/dev/null | \
        sed 's/\[[0-9\- :]*\]//' | \
        sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}//' | \
        sort | uniq -c | sort -rn | head -10 | \
    while read -r count message; do
        echo -e "  ${RED}${count}次${NC} - ${message:0:100}"
    done
}

analyze_time_distribution() {
    local log_file="$1"
    
    if [[ ! -f "$log_file" ]]; then
        return 1
    fi
    
    echo -e "\n${BLUE}错误时间分布 (按小时):${NC}"
    
    local error_pattern=$(IFS="|"; echo "${ERROR_PATTERNS[*]}")
    
    grep -E "$error_pattern" "$log_file" 2>/dev/null | \
        grep -oE '[0-9]{2}:[0-9]{2}:[0-9]{2}' | \
        cut -d: -f1 | \
        sort | uniq -c | sort -k2 -n | \
    while read -r count hour; do
        local bar=""
        local i=0
        while [[ $i -lt $((count / 2)) ]]; do
            bar="${bar}█"
            ((i++))
        done
        echo -e "  ${hour}:00 - ${RED}${bar}${NC} (${count})"
    done
}

generate_report() {
    local report_file="${LOG_DIR}/log-analysis-$(date +%Y%m%d_%H%M%S).txt"
    
    echo -e "${CYAN}生成详细分析报告...${NC}"
    
    {
        echo "=========================================="
        echo "OpenChat 日志分析报告"
        echo "生成时间: $(date)"
        echo "=========================================="
        echo ""
        
        echo "=== 系统信息 ==="
        echo "主机名: $(hostname)"
        echo "系统: $(uname -a)"
        echo "Docker版本: $(docker --version 2>/dev/null || echo '未安装')"
        echo ""
        
        echo "=== 容器状态 ==="
        docker ps -a --filter "name=openchat" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "无法获取容器状态"
        echo ""
        
        echo "=== 磁盘使用 ==="
        df -h "${PROJECT_ROOT}" 2>/dev/null || echo "无法获取磁盘信息"
        echo ""
        
        echo "=== 内存使用 ==="
        free -h 2>/dev/null || echo "无法获取内存信息"
        echo ""
        
        echo "=== 日志文件分析 ==="
        
        for log_file in "${LOG_DIR}"/*.log; do
            if [[ -f "$log_file" ]]; then
                echo ""
                echo "--- $(basename "$log_file") ---"
                local total_lines error_count warn_count
                total_lines=$(wc -l < "$log_file")
                error_count=$(grep -cE "$(IFS="|"; echo "${ERROR_PATTERNS[*]}")" "$log_file" 2>/dev/null || echo 0)
                warn_count=$(grep -cE "$(IFS="|"; echo "${WARN_PATTERNS[*]}")" "$log_file" 2>/dev/null || echo 0)
                echo "总行数: ${total_lines}"
                echo "错误数: ${error_count}"
                echo "警告数: ${warn_count}"
            fi
        done
        
        echo ""
        echo "=== Docker容器日志摘要 ==="
        
        local containers=("openchat-server" "openchat-postgres" "openchat-redis")
        for container in "${containers[@]}"; do
            if docker ps -a --filter "name=${container}" -q | grep -q . 2>/dev/null; then
                echo ""
                echo "--- ${container} ---"
                docker logs --tail 50 "${container}" 2>&1 | tail -20
            fi
        done
        
        echo ""
        echo "=== 最近错误汇总 ==="
        docker logs --tail 500 openchat-server 2>&1 | grep -iE "error|exception|fatal" | tail -20 2>/dev/null || echo "无错误记录"
        
    } > "$report_file"
    
    echo -e "${GREEN}报告已生成: ${report_file}${NC}"
    
    return 0
}

tail_logs() {
    local container="${1:-openchat-server}"
    
    echo -e "${CYAN}实时查看 ${container} 日志 (Ctrl+C 退出)...${NC}"
    echo ""
    
    docker logs -f --tail 100 "$container" 2>&1
}

search_logs() {
    local pattern="$1"
    local scope="${2:-all}"
    
    echo -e "${CYAN}搜索日志: ${pattern}${NC}"
    echo ""
    
    if [[ "$scope" == "all" ]]; then
        echo -e "${BLUE}=== 应用日志 ===${NC}"
        for log_file in "${LOG_DIR}"/*.log; do
            if [[ -f "$log_file" ]]; then
                local matches
                matches=$(grep -i "$pattern" "$log_file" 2>/dev/null | head -10)
                if [[ -n "$matches" ]]; then
                    echo -e "\n${YELLOW}$(basename "$log_file"):${NC}"
                    echo "$matches"
                fi
            fi
        done
        
        echo -e "\n${BLUE}=== Docker容器日志 ===${NC}"
        local containers=("openchat-server" "openchat-postgres" "openchat-redis")
        for container in "${containers[@]}"; do
            if docker ps --filter "name=${container}" -q | grep -q . 2>/dev/null; then
                local matches
                matches=$(docker logs --tail 500 "$container" 2>&1 | grep -i "$pattern" | head -10)
                if [[ -n "$matches" ]]; then
                    echo -e "\n${YELLOW}${container}:${NC}"
                    echo "$matches"
                fi
            fi
        done
    else
        if docker ps --filter "name=${scope}" -q | grep -q . 2>/dev/null; then
            docker logs --tail 500 "$scope" 2>&1 | grep -i "$pattern"
        else
            echo -e "${RED}容器 ${scope} 不存在或未运行${NC}"
        fi
    fi
}

show_help() {
    cat << EOF
OpenChat 日志分析工具

用法: $(basename "$0") [命令] [选项]

命令:
    analyze [文件]          分析指定日志文件
    containers              分析所有Docker容器日志
    container <名称>        分析指定容器日志
    report                  生成详细分析报告
    tail [容器名]           实时查看日志
    search <关键词> [范围]  搜索日志内容
    frequency <文件>        分析错误频率
    timeline <文件>         分析错误时间分布
    help                    显示帮助信息

选项:
    -l, --lines <数量>      指定分析的日志行数 (默认: 500)
    -o, --output <文件>     输出分析结果到文件

示例:
    $(basename "$0") analyze                    # 分析所有日志文件
    $(basename "$0") containers                 # 分析所有容器日志
    $(basename "$0") container openchat-server  # 分析指定容器
    $(basename "$0") tail openchat-server       # 实时查看容器日志
    $(basename "$0") search "error"             # 搜索包含error的日志
    $(basename "$0") report                     # 生成详细报告
    $(basename "$0") frequency app.log          # 分析错误频率

EOF
}

main() {
    mkdir -p "${LOG_DIR}"
    
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        analyze)
            print_header
            if [[ -n "$1" && -f "$1" ]]; then
                analyze_log_file "$1"
            else
                echo -e "${CYAN}分析应用日志文件...${NC}"
                for log_file in "${LOG_DIR}"/*.log; do
                    if [[ -f "$log_file" ]]; then
                        analyze_log_file "$log_file"
                    fi
                done
            fi
            ;;
        containers)
            print_header
            analyze_all_containers
            ;;
        container)
            if [[ -z "$1" ]]; then
                echo -e "${RED}请指定容器名称${NC}"
                exit 1
            fi
            print_header
            analyze_docker_logs "$1" "${2:-500}"
            ;;
        report)
            print_header
            generate_report
            ;;
        tail)
            print_header
            tail_logs "${1:-openchat-server}"
            ;;
        search)
            if [[ -z "$1" ]]; then
                echo -e "${RED}请指定搜索关键词${NC}"
                exit 1
            fi
            print_header
            search_logs "$1" "${2:-all}"
            ;;
        frequency)
            if [[ -z "$1" ]]; then
                echo -e "${RED}请指定日志文件${NC}"
                exit 1
            fi
            print_header
            analyze_error_frequency "$1"
            ;;
        timeline)
            if [[ -z "$1" ]]; then
                echo -e "${RED}请指定日志文件${NC}"
                exit 1
            fi
            print_header
            analyze_time_distribution "$1"
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
