#!/bin/bash

# ============================================
# OpenChat 鏈嶅姟鍋ュ悍妫€鏌ュ拰璇婃柇鑴氭湰
# ============================================

set -e

# 棰滆壊瀹氫箟
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 閰嶇疆
APP_URL="${APP_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
WUKONGIM_URL="${WUKONGIM_API_URL:-http://localhost:5001}"

# 鎵撳嵃鍒嗛殧绾?print_line() {
    echo -e "${CYAN}=========================================${NC}"
}

# 鎵撳嵃鏍囬
print_header() {
    echo ""
    print_line
    echo -e "${BLUE}$1${NC}"
    print_line
}

# 妫€鏌ユ湇鍔℃槸鍚﹁繍琛?check_service() {
    local service=$1
    local port=$2
    local url=$3
    
    echo -n "妫€鏌?$service ... "
    
    if [ -n "$url" ]; then
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}鉁?杩愯涓?{NC}"
            return 0
        else
            echo -e "${RED}鉁?涓嶅彲鐢?{NC}"
            return 1
        fi
    elif [ -n "$port" ]; then
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}鉁?杩愯涓?{NC}"
            return 0
        else
            echo -e "${RED}鉁?鏈繍琛?{NC}"
            return 1
        fi
    fi
    
    echo -e "${YELLOW}? 鏈煡${NC}"
    return 1
}

# 妫€鏌?Docker 瀹瑰櫒鐘舵€?check_docker_containers() {
    print_header "Docker 瀹瑰櫒鐘舵€?
    
    local containers=("openchat" "openchat-postgres" "openchat-redis" "openchat-wukongim")
    local all_running=true
    
    for container in "${containers[@]}"; do
        local status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
        local health=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        
        echo -n "  $container: "
        
        if [ "$status" = "running" ]; then
            if [ "$health" != "none" ] && [ "$health" != "" ]; then
                if [ "$health" = "healthy" ]; then
                    echo -e "${GREEN}杩愯涓?(鍋ュ悍)${NC}"
                else
                    echo -e "${YELLOW}杩愯涓?($health)${NC}"
                fi
            else
                echo -e "${GREEN}杩愯涓?{NC}"
            fi
        else
            echo -e "${RED}鏈繍琛?($status)${NC}"
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        return 0
    else
        return 1
    fi
}

# 妫€鏌ョ鍙?check_ports() {
    print_header "绔彛妫€鏌?
    
    local ports=(
        "3000:搴旂敤鏈嶅姟"
        "5432:PostgreSQL"
        "6379:Redis"
        "5001:WukongIM API"
        "5100:WukongIM TCP"
        "5200:WukongIM WS"
    )
    
    for item in "${ports[@]}"; do
        local port="${item%%:*}"
        local desc="${item##*:}"
        
        echo -n "  绔彛 $port ($desc): "
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}寮€鏀?{NC}"
        else
            echo -e "${YELLOW}鏈紑鏀?{NC}"
        fi
    done
}

# 妫€鏌ュ簲鐢ㄥ仴搴风姸鎬?check_app_health() {
    print_header "搴旂敤鍋ュ悍妫€鏌?
    
    echo -n "  搴旂敤鍋ュ悍绔偣: "
    if curl -sf "$APP_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}姝ｅ父${NC}"
        
        # 鑾峰彇璇︾粏鍋ュ悍淇℃伅
        echo ""
        echo "  鍋ュ悍璇︽儏:"
        curl -s "$APP_URL/health" | grep -o '"status":"[^"]*"' | sed 's/^/    /'
    else
        echo -e "${RED}寮傚父${NC}"
        echo -e "  ${YELLOW}鎻愮ず: 搴旂敤鍙兘姝ｅ湪鍚姩鎴栭厤缃湁闂${NC}"
    fi
    
    echo ""
    echo -n "  API 鏂囨。: "
    if curl -sf "$APP_URL/im/v3/docs" > /dev/null 2>&1; then
        echo -e "${GREEN}鍙敤${NC}"
    else
        echo -e "${YELLOW}涓嶅彲鐢?{NC}"
    fi
}

# 妫€鏌ユ暟鎹簱杩炴帴
check_database() {
    print_header "鏁版嵁搴撹繛鎺ユ鏌?
    
    echo -n "  PostgreSQL 杩炴帴: "
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}姝ｅ父${NC}"
        
        # 鑾峰彇鏁版嵁搴撲俊鎭?        echo ""
        echo "  鏁版嵁搴撲俊鎭?"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | head -20 | sed 's/^/    /'
    else
        echo -e "${RED}寮傚父${NC}"
        echo -e "  ${YELLOW}鎻愮ず: 妫€鏌?DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD 閰嶇疆${NC}"
    fi
}

# 妫€鏌?Redis 杩炴帴
check_redis() {
    print_header "Redis 杩炴帴妫€鏌?
    
    echo -n "  Redis 杩炴帴: "
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
        echo -e "${GREEN}姝ｅ父${NC}"
        
        # 鑾峰彇 Redis 淇℃伅
        echo ""
        echo "  Redis 淇℃伅:"
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info | grep -E "^(redis_version|connected_clients|used_memory_human)" | sed 's/^/    /'
    else
        echo -e "${RED}寮傚父${NC}"
        echo -e "  ${YELLOW}鎻愮ず: 妫€鏌?REDIS_HOST, REDIS_PORT, REDIS_PASSWORD 閰嶇疆${NC}"
    fi
}

# 妫€鏌?WukongIM 杩炴帴
check_wukongim() {
    print_header "WukongIM 杩炴帴妫€鏌?
    
    echo -n "  WukongIM API: "
    if curl -sf "$WUKONGIM_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}姝ｅ父${NC}"
        
        # 鑾峰彇 WukongIM 淇℃伅
        echo ""
        echo "  WukongIM 淇℃伅:"
        curl -s "$WUKONGIM_URL/varz" 2>/dev/null | grep -oE '"(online_user_count|channel_count)":[^,]*' | sed 's/^/    /' || echo "    鏃犳硶鑾峰彇璇︾粏淇℃伅"
    else
        echo -e "${RED}寮傚父${NC}"
        echo -e "  ${YELLOW}鎻愮ず: 妫€鏌?WUKONGIM_API_URL 閰嶇疆鎴?WukongIM 鏈嶅姟鏄惁鍚姩${NC}"
    fi
}

# 妫€鏌ョ綉缁滆繛鎺?check_network() {
    print_header "缃戠粶杩為€氭€?
    
    local hosts=(
        "google.com:浜掕仈缃戣繛鎺?
        "$DB_HOST:鏁版嵁搴撲富鏈?
        "$REDIS_HOST:Redis涓绘満"
    )
    
    for item in "${hosts[@]}"; do
        local host="${item%%:*}"
        local desc="${item##*:}"
        
        echo -n "  $desc: "
        if ping -c 1 -W 2 "$host" > /dev/null 2>&1 || nc -z "$host" 443 2>/dev/null; then
            echo -e "${GREEN}鍙揪${NC}"
        else
            echo -e "${YELLOW}涓嶅彲杈?{NC}"
        fi
    done
}

# 妫€鏌ユ棩蹇楅敊璇?check_logs() {
    print_header "鏈€杩戦敊璇棩蹇?
    
    local containers=("openchat" "openchat-postgres" "openchat-redis" "openchat-wukongim")
    
    for container in "${containers[@]}"; do
        local errors=$(docker logs --tail 20 "$container" 2>&1 | grep -iE "(error|fatal|exception)" | tail -5)
        
        if [ -n "$errors" ]; then
            echo ""
            echo -e "  ${RED}$container 閿欒:${NC}"
            echo "$errors" | sed 's/^/    /'
        fi
    done
}

# 妫€鏌ヨ祫婧愪娇鐢?check_resources() {
    print_header "璧勬簮浣跨敤鎯呭喌"
    
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "(CONTAINER|openchat|postgres|redis|wukongim)" | sed 's/^/  /'
}

# 妫€鏌ラ厤缃畬鏁存€?check_config() {
    print_header "閰嶇疆妫€鏌?
    
    local required_vars=(
        "DB_HOST:鏁版嵁搴撲富鏈?
        "DB_PORT:鏁版嵁搴撶鍙?
        "DB_USERNAME:鏁版嵁搴撶敤鎴?
        "DB_PASSWORD:鏁版嵁搴撳瘑鐮?
        "REDIS_HOST:Redis涓绘満"
        "REDIS_PORT:Redis绔彛"
        "JWT_SECRET:JWT瀵嗛挜"
    )
    
    local missing=()
    
    for item in "${required_vars[@]}"; do
        local var="${item%%:*}"
        local desc="${item##*:}"
        
        echo -n "  $desc: "
        if [ -n "${!var}" ]; then
            echo -e "${GREEN}宸查厤缃?{NC}"
        else
            echo -e "${RED}鏈厤缃?($var)${NC}"
            missing+=("$var")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        echo -e "  ${YELLOW}鎻愮ず: 缂哄皯蹇呰閰嶇疆锛岃妫€鏌?.env 鏂囦欢${NC}"
    fi
}

# 瀹屾暣璇婃柇
run_full_diagnosis() {
    print_header "OpenChat 瀹屾暣璇婃柇"
    
    echo -e "${BLUE}寮€濮嬭瘖鏂?..${NC}"
    echo ""
    
    check_docker_containers
    echo ""
    
    check_ports
    echo ""
    
    check_config
    echo ""
    
    check_app_health
    echo ""
    
    check_database
    echo ""
    
    check_redis
    echo ""
    
    check_wukongim
    echo ""
    
    check_network
    echo ""
    
    check_resources
    echo ""
    
    check_logs
    
    print_header "璇婃柇瀹屾垚"
}

# 蹇€熸鏌?run_quick_check() {
    echo -e "${BLUE}OpenChat 蹇€熸鏌?{NC}"
    echo ""
    
    check_docker_containers
    echo ""
    
    check_app_health
}

# 鏄剧ず甯姪
show_help() {
    echo -e "${BLUE}OpenChat 鍋ュ悍妫€鏌ュ拰璇婃柇鑴氭湰${NC}"
    echo ""
    echo "鐢ㄦ硶: $0 [閫夐」]"
    echo ""
    echo "閫夐」:"
    echo "  full         杩愯瀹屾暣璇婃柇"
    echo "  quick        蹇€熸鏌?
    echo "  containers   妫€鏌ュ鍣ㄧ姸鎬?
    echo "  ports        妫€鏌ョ鍙?
    echo "  app          妫€鏌ュ簲鐢?
    echo "  database     妫€鏌ユ暟鎹簱"
    echo "  redis        妫€鏌?Redis"
    echo "  wukongim     妫€鏌?WukongIM"
    echo "  config       妫€鏌ラ厤缃?
    echo "  resources    妫€鏌ヨ祫婧?
    echo "  logs         妫€鏌ユ棩蹇?
    echo "  help         鏄剧ず甯姪"
    echo ""
    echo "绀轰緥:"
    echo "  $0 full          # 瀹屾暣璇婃柇"
    echo "  $0 quick        # 蹇€熸鏌?
    echo "  $0 database     # 妫€鏌ユ暟鎹簱"
}

# 涓诲懡浠?COMMAND="${1:-quick}"

case "$COMMAND" in
    full)
        run_full_diagnosis
        ;;
    quick)
        run_quick_check
        ;;
    containers)
        check_docker_containers
        ;;
    ports)
        check_ports
        ;;
    app)
        check_app_health
        ;;
    database)
        check_database
        ;;
    redis)
        check_redis
        ;;
    wukongim)
        check_wukongim
        ;;
    config)
        check_config
        ;;
    resources)
        check_resources
        ;;
    logs)
        check_logs
        ;;
    network)
        check_network
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}鏈煡鍛戒护: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac

