#!/bin/bash
# ============================================
# OpenChat - 安装前检查脚本
# 检查系统环境和依赖
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 检查结果
PASS=0
WARN=0
FAIL=0

# 打印函数
print_header() {
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${CYAN}=========================================${NC}"
}

print_result() {
    local status=$1
    local message=$2
    local detail=$3
    
    case $status in
        "pass")
            echo -e "${GREEN}✓${NC} $message ${detail:+[$detail]}"
            ((PASS++))
            ;;
        "warn")
            echo -e "${YELLOW}!${NC} $message ${detail:+[$detail]}"
            ((WARN++))
            ;;
        "fail")
            echo -e "${RED}✗${NC} $message ${detail:+[$detail]}"
            ((FAIL++))
            ;;
    esac
}

# 检查操作系统
check_os() {
    print_header "操作系统检查"
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_result "pass" "操作系统" "$NAME $VERSION_ID"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_result "pass" "操作系统" "macOS $(sw_vers -productVersion)"
    else
        print_result "warn" "操作系统" "未知"
    fi
    
    # 检查架构
    local arch=$(uname -m)
    if [[ "$arch" == "x86_64" || "$arch" == "arm64" || "$arch" == "aarch64" ]]; then
        print_result "pass" "系统架构" "$arch"
    else
        print_result "warn" "系统架构" "$arch (可能不兼容)"
    fi
    
    # 检查内存
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local mem=$(sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024/1024)}')
    else
        local mem=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}')
    fi
    
    if [[ "$mem" -ge 4 ]]; then
        print_result "pass" "内存大小" "${mem}GB"
    elif [[ "$mem" -ge 2 ]]; then
        print_result "warn" "内存大小" "${mem}GB (建议 4GB+)"
    else
        print_result "fail" "内存大小" "${mem}GB (不足)"
    fi
    
    # 检查磁盘空间
    local disk=$(df -BG . 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ "$disk" -ge 20 ]]; then
        print_result "pass" "磁盘空间" "${disk}GB 可用"
    elif [[ "$disk" -ge 10 ]]; then
        print_result "warn" "磁盘空间" "${disk}GB 可用 (建议 20GB+)"
    else
        print_result "fail" "磁盘空间" "${disk}GB 可用 (不足)"
    fi
}

# 检查依赖
check_dependencies() {
    print_header "依赖检查"
    
    # Docker
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
        print_result "pass" "Docker" "v$docker_version"
        
        # 检查 Docker 服务
        if docker info &> /dev/null; then
            print_result "pass" "Docker 服务" "运行中"
        else
            print_result "fail" "Docker 服务" "未运行"
        fi
    else
        print_result "fail" "Docker" "未安装"
    fi
    
    # Docker Compose
    if docker compose version &> /dev/null; then
        local compose_version=$(docker compose version --short 2>/dev/null)
        print_result "pass" "Docker Compose" "v$compose_version"
    elif command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
        print_result "pass" "Docker Compose" "v$compose_version"
    else
        print_result "fail" "Docker Compose" "未安装"
    fi
    
    # Git
    if command -v git &> /dev/null; then
        print_result "pass" "Git" "$(git --version | awk '{print $3}')"
    else
        print_result "warn" "Git" "未安装 (可选)"
    fi
    
    # curl
    if command -v curl &> /dev/null; then
        print_result "pass" "curl" "已安装"
    else
        print_result "warn" "curl" "未安装"
    fi
}

# 检查端口
check_ports() {
    print_header "端口检查"
    
    local ports=("3000:OpenChat API" "5432:PostgreSQL" "6379:Redis" "5001:WukongIM API" "5100:WukongIM TCP" "5200:WukongIM WebSocket" "5300:WukongIM Manager")
    local port_available=0
    local port_conflict=0
    
    for port_info in "${ports[@]}"; do
        local port="${port_info%%:*}"
        local service="${port_info#*:}"
        
        local in_use=false
        if command -v lsof &> /dev/null; then
            lsof -i ":$port" &> /dev/null && in_use=true
        elif command -v ss &> /dev/null; then
            ss -tuln 2>/dev/null | grep -q ":$port " && in_use=true
        elif command -v netstat &> /dev/null; then
            netstat -tuln 2>/dev/null | grep -q ":$port " && in_use=true
        fi
        
        if $in_use; then
            print_result "warn" "端口 $port ($service)" "已被占用"
            ((port_conflict++))
        else
            print_result "pass" "端口 $port ($service)" "可用"
            ((port_available++))
        fi
    done
    
    if [[ $port_conflict -gt 0 ]]; then
        echo ""
        echo -e "${YELLOW}提示: 端口冲突可通过修改 .env 文件解决${NC}"
    fi
}

# 检查网络
check_network() {
    print_header "网络检查"
    
    # 检查外网连接
    if curl -s --connect-timeout 5 https://www.google.com &> /dev/null; then
        print_result "pass" "外网连接" "正常"
    elif curl -s --connect-timeout 5 https://www.baidu.com &> /dev/null; then
        print_result "pass" "外网连接" "正常 (国内网络)"
    else
        print_result "warn" "外网连接" "无法访问 (可能影响镜像拉取)"
    fi
    
    # 检查 Docker 镜像源
    if docker info 2>/dev/null | grep -q "Registry Mirrors"; then
        print_result "pass" "Docker 镜像加速" "已配置"
    else
        print_result "warn" "Docker 镜像加速" "未配置 (拉取可能较慢)"
    fi
}

# 显示总结
show_summary() {
    print_header "检查结果总结"
    
    echo ""
    echo -e "通过: ${GREEN}$PASS${NC}  警告: ${YELLOW}$WARN${NC}  失败: ${RED}$FAIL${NC}"
    echo ""
    
    if [[ $FAIL -gt 0 ]]; then
        echo -e "${RED}存在必须解决的问题，请先修复后再安装${NC}"
        echo ""
        echo "常见问题解决方法:"
        echo "  • 安装 Docker: curl -fsSL https://get.docker.com | sh"
        echo "  • 启动 Docker: systemctl start docker"
        echo "  • 安装 Docker Compose: apt install docker-compose-plugin"
        return 1
    elif [[ $WARN -gt 0 ]]; then
        echo -e "${YELLOW}存在警告项，建议处理后再安装${NC}"
        echo ""
        echo "是否继续安装? (y/N)"
        read -r answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            return 1
        fi
    else
        echo -e "${GREEN}所有检查通过，可以开始安装${NC}"
    fi
    
    return 0
}

# 主函数
main() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              OpenChat 安装前检查                              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_os
    check_dependencies
    check_ports
    check_network
    show_summary
}

main "$@"
