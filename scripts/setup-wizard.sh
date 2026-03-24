#!/bin/bash
# ============================================
# OpenChat - 鏅鸿兘瀹夎鍚戝
# 鏀寔澶氱瀹夎鍦烘櫙
# ============================================

set -e

# 棰滆壊瀹氫箟
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 搴旂敤閰嶇疆
APP_NAME="OpenChat"
APP_VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 瀹夎閰嶇疆
INSTALL_ENV="production"
INSTALL_MODE="docker"
USE_EXISTING_DB=false
USE_EXISTING_REDIS=false
DB_HOST=""
DB_PORT=5432
DB_USERNAME=""
DB_PASSWORD=""
DB_NAME="openchat"
REDIS_HOST=""
REDIS_PORT=6379
REDIS_PASSWORD=""
EXTERNAL_IP=""

# 鏃ュ織鍑芥暟
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[鉁揮${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[鉁梋${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_ask() { echo -ne "${YELLOW}[?]${NC} $1"; }

# 鏄剧ず妯箙
show_banner() {
    clear
    echo -e "${BOLD}"
    echo "鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
    echo "鈺?                                                              鈺?
    echo "鈺?  鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈺?      鈺?
    echo "鈺? 鈻堚枅鈺斺晲鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺愨晲鈺濃枅鈻堚晹鈺愨晲鈻堚枅鈺椻暁鈺愨晲鈻堚枅鈺斺晲鈺愨暆鈻堚枅鈺斺晲鈺愨枅鈻堚晽鈻堚枅鈺?      鈺?
    echo "鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚枅鈻堚枅鈺? 鈻堚枅鈻堚枅鈻堚枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈻堚枅鈻堚枅鈻堚晳鈻堚枅鈺?      鈺?
    echo "鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺? 鈻堚枅鈺斺晲鈺愨枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈺斺晲鈺愨枅鈻堚晳鈻堚枅鈺?      鈺?
    echo "鈺? 鈺氣枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚晳  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺椻枅鈻堚晳  鈻堚枅鈺?  鈻堚枅鈺?  鈻堚枅鈺? 鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺? 鈺?
    echo "鈺?  鈺氣晲鈺愨晲鈺愨晲鈺?鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺濃暁鈺愨暆  鈺氣晲鈺?  鈺氣晲鈺?  鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺? 鈺?
    echo "鈺?                                                              鈺?
    echo "鈺?          Open Source Instant Messaging Platform              鈺?
    echo "鈺?                    鏅鸿兘瀹夎鍚戝 v${APP_VERSION}                      鈺?
    echo "鈺?                                                              鈺?
    echo "鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
    echo -e "${NC}"
    echo
}

# 妫€娴嬫搷浣滅郴缁?detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_NAME=$NAME
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        OS_NAME="macOS"
    else
        OS="linux"
        OS_NAME="Linux"
    fi
    log_info "妫€娴嬪埌鎿嶄綔绯荤粺: ${OS_NAME}"
}

# 妫€鏌ュ懡浠ゆ槸鍚﹀瓨鍦?command_exists() {
    command -v "$1" &> /dev/null
}

# 妫€娴嬪凡鏈夋暟鎹簱
detect_existing_database() {
    log_step "妫€娴嬪凡鏈夋暟鎹簱..."
    
    # 妫€鏌ユ湰鍦?PostgreSQL
    if command_exists psql; then
        if psql -U postgres -c "SELECT 1" &> /dev/null; then
            log_success "妫€娴嬪埌鏈湴 PostgreSQL 鏈嶅姟"
            return 0
        fi
    fi
    
    # 妫€鏌?Docker PostgreSQL 瀹瑰櫒
    if command_exists docker; then
        if docker ps --format '{{.Names}}' | grep -q "postgres"; then
            log_success "妫€娴嬪埌 Docker PostgreSQL 瀹瑰櫒"
            return 0
        fi
    fi
    
    log_info "鏈娴嬪埌宸叉湁 PostgreSQL 鏁版嵁搴?
    return 1
}

# 妫€娴嬪凡鏈?Redis
detect_existing_redis() {
    log_step "妫€娴嬪凡鏈?Redis..."
    
    # 妫€鏌ユ湰鍦?Redis
    if command_exists redis-cli; then
        if redis-cli ping &> /dev/null; then
            log_success "妫€娴嬪埌鏈湴 Redis 鏈嶅姟"
            return 0
        fi
    fi
    
    # 妫€鏌?Docker Redis 瀹瑰櫒
    if command_exists docker; then
        if docker ps --format '{{.Names}}' | grep -q "redis"; then
            log_success "妫€娴嬪埌 Docker Redis 瀹瑰櫒"
            return 0
        fi
    fi
    
    log_info "鏈娴嬪埌宸叉湁 Redis 鏈嶅姟"
    return 1
}

# 閫夋嫨瀹夎鐜
select_environment() {
    echo
    echo -e "${BOLD}璇烽€夋嫨瀹夎鐜:${NC}"
    echo "  1) 寮€鍙戠幆澧?(Development)"
    echo "  2) 娴嬭瘯鐜 (Testing)"
    echo "  3) 鐢熶骇鐜 (Production)"
    echo
    log_ask "璇烽€夋嫨 [1-3, 榛樿 3]: "
    read -r env_choice
    
    case ${env_choice:-3} in
        1)
            INSTALL_ENV="development"
            ;;
        2)
            INSTALL_ENV="test"
            ;;
        3)
            INSTALL_ENV="production"
            ;;
        *)
            log_warn "鏃犳晥閫夋嫨锛屼娇鐢ㄩ粯璁ょ敓浜х幆澧?
            INSTALL_ENV="production"
            ;;
    esac
    
    log_success "閫夋嫨鐜: $INSTALL_ENV"
}

# 閫夋嫨瀹夎妯″紡
select_install_mode() {
    echo
    echo -e "${BOLD}璇烽€夋嫨瀹夎妯″紡:${NC}"
    echo "  1) Docker Compose锛堟帹鑽愶紝鑷姩绠＄悊鎵€鏈変緷璧栵級"
    echo "  2) 鐙珛鏈嶅姟锛堜娇鐢ㄥ凡鏈夋暟鎹簱鍜?Redis锛?
    echo "  3) 娣峰悎妯″紡锛堜娇鐢ㄥ凡鏈夋暟鎹簱锛孌ocker 绠＄悊 Redis锛?
    echo "  4) 娣峰悎妯″紡锛堜娇鐢ㄥ凡鏈?Redis锛孌ocker 绠＄悊鏁版嵁搴擄級"
    echo
    log_ask "璇烽€夋嫨 [1-4, 榛樿 1]: "
    read -r mode_choice
    
    case ${mode_choice:-1} in
        1)
            INSTALL_MODE="docker"
            ;;
        2)
            INSTALL_MODE="standalone"
            USE_EXISTING_DB=true
            USE_EXISTING_REDIS=true
            ;;
        3)
            INSTALL_MODE="hybrid-db"
            USE_EXISTING_DB=true
            USE_EXISTING_REDIS=false
            ;;
        4)
            INSTALL_MODE="hybrid-redis"
            USE_EXISTING_DB=false
            USE_EXISTING_REDIS=true
            ;;
        *)
            log_warn "鏃犳晥閫夋嫨锛屼娇鐢ㄩ粯璁?Docker 妯″紡"
            INSTALL_MODE="docker"
            ;;
    esac
    
    log_success "閫夋嫨妯″紡: $INSTALL_MODE"
}

# 閰嶇疆宸叉湁鏁版嵁搴?configure_existing_database() {
    echo
    echo -e "${BOLD}閰嶇疆宸叉湁鏁版嵁搴撹繛鎺?${NC}"
    
    log_ask "鏁版嵁搴撲富鏈哄湴鍧€ [localhost]: "
    read -r DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    log_ask "鏁版嵁搴撶鍙?[5432]: "
    read -r DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    log_ask "鏁版嵁搴撳悕绉?[openchat]: "
    read -r DB_NAME
    DB_NAME=${DB_NAME:-openchat}
    
    log_ask "鏁版嵁搴撶敤鎴峰悕: "
    read -r DB_USERNAME
    
    log_ask "鏁版嵁搴撳瘑鐮? "
    read -rs DB_PASSWORD
    echo
    
    # 娴嬭瘯杩炴帴
    log_info "娴嬭瘯鏁版嵁搴撹繛鎺?.."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
        log_success "鏁版嵁搴撹繛鎺ユ垚鍔?
    else
        log_error "鏁版嵁搴撹繛鎺ュけ璐ワ紝璇锋鏌ラ厤缃?
        return 1
    fi
}

# 閰嶇疆宸叉湁 Redis
configure_existing_redis() {
    echo
    echo -e "${BOLD}閰嶇疆宸叉湁 Redis 杩炴帴:${NC}"
    
    log_ask "Redis 涓绘満鍦板潃 [localhost]: "
    read -r REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-localhost}
    
    log_ask "Redis 绔彛 [6379]: "
    read -r REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-6379}
    
    log_ask "Redis 瀵嗙爜 (鏃犲瘑鐮佽鐣欑┖): "
    read -rs REDIS_PASSWORD
    echo
    
    # 娴嬭瘯杩炴帴
    log_info "娴嬭瘯 Redis 杩炴帴..."
    if [ -n "$REDIS_PASSWORD" ]; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping &> /dev/null; then
            log_success "Redis 杩炴帴鎴愬姛"
        else
            log_error "Redis 杩炴帴澶辫触锛岃妫€鏌ラ厤缃?
            return 1
        fi
    else
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
            log_success "Redis 杩炴帴鎴愬姛"
        else
            log_error "Redis 杩炴帴澶辫触锛岃妫€鏌ラ厤缃?
            return 1
        fi
    fi
}

# 鑾峰彇鏈嶅姟鍣?IP
get_server_ip() {
    log_step "鑾峰彇鏈嶅姟鍣?IP 鍦板潃..."
    
    # 灏濊瘯鑾峰彇澶栫綉 IP
    EXTERNAL_IP=$(curl -s -4 --connect-timeout 5 ifconfig.me 2>/dev/null || curl -s -4 --connect-timeout 5 icanhazip.com 2>/dev/null || echo "")
    
    if [ -z "$EXTERNAL_IP" ]; then
        # 鑾峰彇鍐呯綉 IP
        if [[ "$OSTYPE" == "darwin"* ]]; then
            EXTERNAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
        else
            EXTERNAL_IP=$(hostname -I | awk '{print $1}')
        fi
    fi
    
    log_ask "璇疯緭鍏ユ湇鍔″櫒澶栫綉 IP [$EXTERNAL_IP]: "
    read -r input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    log_success "鏈嶅姟鍣?IP: $EXTERNAL_IP"
}

# 鐢熸垚闅忔満瀵嗙爜
generate_password() {
    openssl rand -base64 16 | tr -d '/+=' | head -c 24
}

# 鐢熸垚 JWT 瀵嗛挜
generate_jwt_secret() {
    openssl rand -base64 32
}

# 鍒涘缓鐜閰嶇疆鏂囦欢
create_env_file() {
    log_step "鍒涘缓鐜閰嶇疆鏂囦欢..."
    
    local env_file=".env"
    
    # 鏍规嵁鐜閫夋嫨妯℃澘
    if [ "$INSTALL_ENV" = "development" ]; then
        cp ".env.development" "$env_file"
    elif [ "$INSTALL_ENV" = "test" ]; then
        cp ".env.test" "$env_file"
    else
        cp ".env.production" "$env_file"
    fi
    
    # 鏇存柊閰嶇疆
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/EXTERNAL_IP=.*/EXTERNAL_IP=$EXTERNAL_IP/" "$env_file"
        sed -i '' "s/DB_HOST=.*/DB_HOST=$DB_HOST/" "$env_file"
        sed -i '' "s/DB_PORT=.*/DB_PORT=$DB_PORT/" "$env_file"
        sed -i '' "s/DB_USERNAME=.*/DB_USERNAME=$DB_USERNAME/" "$env_file"
        sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$env_file"
        sed -i '' "s/DB_NAME=.*/DB_NAME=$DB_NAME/" "$env_file"
        sed -i '' "s/REDIS_HOST=.*/REDIS_HOST=$REDIS_HOST/" "$env_file"
        sed -i '' "s/REDIS_PORT=.*/REDIS_PORT=$REDIS_PORT/" "$env_file"
        sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "$env_file"
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$(generate_jwt_secret)/" "$env_file"
    else
        sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=$EXTERNAL_IP/" "$env_file"
        sed -i "s/DB_HOST=.*/DB_HOST=$DB_HOST/" "$env_file"
        sed -i "s/DB_PORT=.*/DB_PORT=$DB_PORT/" "$env_file"
        sed -i "s/DB_USERNAME=.*/DB_USERNAME=$DB_USERNAME/" "$env_file"
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$env_file"
        sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" "$env_file"
        sed -i "s/REDIS_HOST=.*/REDIS_HOST=$REDIS_HOST/" "$env_file"
        sed -i "s/REDIS_PORT=.*/REDIS_PORT=$REDIS_PORT/" "$env_file"
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "$env_file"
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(generate_jwt_secret)/" "$env_file"
    fi
    
    log_success "鐜閰嶇疆鏂囦欢鍒涘缓瀹屾垚"
}

# 鍒涘缓 Docker Compose 閰嶇疆
create_docker_compose_config() {
    log_step "鍒涘缓 Docker Compose 閰嶇疆..."
    
    local compose_file="docker-compose.override.yml"
    
    # 鏍规嵁妯″紡鍒涘缓涓嶅悓鐨勯厤缃?    if [ "$USE_EXISTING_DB" = true ] && [ "$USE_EXISTING_REDIS" = true ]; then
        # 浣跨敤宸叉湁鏁版嵁搴撳拰 Redis
        cat > "$compose_file" << EOF
# OpenChat Docker Compose 瑕嗙洊閰嶇疆
# 浣跨敤宸叉湁鏁版嵁搴撳拰 Redis
version: '3.8'

services:
  app:
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF
    elif [ "$USE_EXISTING_DB" = true ]; then
        # 浣跨敤宸叉湁鏁版嵁搴擄紝Docker 绠＄悊 Redis
        cat > "$compose_file" << EOF
# OpenChat Docker Compose 瑕嗙洊閰嶇疆
# 浣跨敤宸叉湁鏁版嵁搴擄紝Docker 绠＄悊 Redis
version: '3.8'

services:
  app:
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - redis
EOF
    elif [ "$USE_EXISTING_REDIS" = true ]; then
        # 浣跨敤宸叉湁 Redis锛孌ocker 绠＄悊鏁版嵁搴?        cat > "$compose_file" << EOF
# OpenChat Docker Compose 瑕嗙洊閰嶇疆
# 浣跨敤宸叉湁 Redis锛孌ocker 绠＄悊鏁版嵁搴?version: '3.8'

services:
  app:
    environment:
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - postgres
EOF
    fi
    
    log_success "Docker Compose 閰嶇疆鍒涘缓瀹屾垚"
}

# 鍒濆鍖栨暟鎹簱
initialize_database() {
    log_step "鍒濆鍖栨暟鎹簱..."
    
    if [ "$USE_EXISTING_DB" = true ]; then
        log_info "浣跨敤宸叉湁鏁版嵁搴擄紝妫€鏌ヨ〃缁撴瀯..."
        
        # 妫€鏌ヨ〃鏄惁瀛樺湪
        local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
        
        if [ "$table_count" -gt 0 ]; then
            log_warn "鏁版嵁搴撲腑宸叉湁琛ㄧ粨鏋?
            log_ask "鏄惁閲嶆柊鍒濆鍖? 杩欏皢鍒犻櫎鐜版湁鏁版嵁! (y/N): "
            read -r confirm
            if [[ ! $confirm =~ ^[Yy]$ ]]; then
                log_info "璺宠繃鏁版嵁搴撳垵濮嬪寲"
                return 0
            fi
        fi
    fi
    
    # 鎵ц鏁版嵁搴撳垵濮嬪寲鑴氭湰
    if [ -f "database/schema.sql" ]; then
        log_info "鎵ц鏁版嵁搴撳垵濮嬪寲鑴氭湰..."
        if [ "$USE_EXISTING_DB" = true ]; then
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f database/schema.sql
        else
            docker compose exec -T postgres psql -U openchat -d openchat -f /docker-entrypoint-initdb.d/01-schema.sql
        fi
        log_success "鏁版嵁搴撳垵濮嬪寲瀹屾垚"
    fi
}

# 鍚姩鏈嶅姟
start_services() {
    log_step "鍚姩鏈嶅姟..."
    
    case $INSTALL_MODE in
        docker|hybrid-db|hybrid-redis)
            log_info "鎷夊彇 Docker 闀滃儚..."
            docker compose pull
            
            log_info "鍚姩 Docker 鏈嶅姟..."
            docker compose up -d
            
            log_info "绛夊緟鏈嶅姟灏辩华..."
            sleep 10
            
            # 妫€鏌ユ湇鍔＄姸鎬?            if docker compose ps | grep -q "Up"; then
                log_success "鏈嶅姟鍚姩鎴愬姛"
            else
                log_error "鏈嶅姟鍚姩澶辫触锛岃妫€鏌ユ棩蹇?
                docker compose logs
                return 1
            fi
            ;;
        standalone)
            log_info "瀹夎 Node.js 渚濊禆..."
            npm install
            
            log_info "鏋勫缓搴旂敤..."
            npm run build
            
            log_info "鍚姩搴旂敤..."
            npm run start:prod &
            
            log_success "鏈嶅姟鍚姩鎴愬姛"
            ;;
    esac
}

# 鏄剧ず瀹夎缁撴灉
show_install_result() {
    echo
    echo -e "${GREEN}鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo -e "${GREEN}鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?{NC}"
    echo -e "${GREEN}鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo
    echo -e "${BOLD}瀹夎淇℃伅:${NC}"
    echo "  鈥?瀹夎鐜: $INSTALL_ENV"
    echo "  鈥?瀹夎妯″紡: $INSTALL_MODE"
    echo "  鈥?鏁版嵁搴? $([ "$USE_EXISTING_DB" = true ] && echo "宸叉湁 ($DB_HOST:$DB_PORT/$DB_NAME)" || echo "Docker 绠＄悊")"
    echo "  鈥?Redis: $([ "$USE_EXISTING_REDIS" = true ] && echo "宸叉湁 ($REDIS_HOST:$REDIS_PORT)" || echo "Docker 绠＄悊")"
    echo
    echo -e "${BOLD}鏈嶅姟璁块棶鍦板潃:${NC}"
    echo "  鈥?OpenChat API:    http://${EXTERNAL_IP}:3000"
    echo "  鈥?API 鏂囨。:        http://${EXTERNAL_IP}:3000/im/v3/docs"
    echo "  鈥?鍋ュ悍妫€鏌?        http://${EXTERNAL_IP}:3000/health"
    echo
    echo -e "${BOLD}甯哥敤鍛戒护:${NC}"
    echo "  鈥?鏌ョ湅鏃ュ織:    docker compose logs -f"
    echo "  鈥?鍋滄鏈嶅姟:    docker compose down"
    echo "  鈥?閲嶅惎鏈嶅姟:    docker compose restart"
    echo
    echo -e "${YELLOW}瀹夊叏鎻愮ず:${NC}"
    echo "  鈿狅笍  璇峰Ε鍠勪繚绠?.env 鏂囦欢涓殑瀵嗙爜鍜屽瘑閽?
    echo "  鈿狅笍  鐢熶骇鐜寤鸿鍚敤 HTTPS"
    echo
}

# 涓诲畨瑁呮祦绋?main() {
    show_banner
    
    # 妫€娴嬫搷浣滅郴缁?    detect_os
    
    # 閫夋嫨瀹夎鐜
    select_environment
    
    # 妫€娴嬪凡鏈夋湇鍔?    local has_db=false
    local has_redis=false
    
    if detect_existing_database; then
        has_db=true
    fi
    
    if detect_existing_redis; then
        has_redis=true
    fi
    
    # 閫夋嫨瀹夎妯″紡
    select_install_mode
    
    # 閰嶇疆鏁版嵁搴?    if [ "$USE_EXISTING_DB" = true ]; then
        if [ "$has_db" = true ]; then
            log_ask "妫€娴嬪埌宸叉湁鏁版嵁搴擄紝鏄惁浣跨敤? (Y/n): "
            read -r use_existing
            if [[ ! $use_existing =~ ^[Nn]$ ]]; then
                configure_existing_database
            else
                USE_EXISTING_DB=false
            fi
        else
            configure_existing_database
        fi
    fi
    
    # 閰嶇疆 Redis
    if [ "$USE_EXISTING_REDIS" = true ]; then
        if [ "$has_redis" = true ]; then
            log_ask "妫€娴嬪埌宸叉湁 Redis锛屾槸鍚︿娇鐢? (Y/n): "
            read -r use_existing
            if [[ ! $use_existing =~ ^[Nn]$ ]]; then
                configure_existing_redis
            else
                USE_EXISTING_REDIS=false
            fi
        else
            configure_existing_redis
        fi
    fi
    
    # 璁剧疆榛樿鍊?    if [ "$USE_EXISTING_DB" = false ]; then
        DB_HOST="postgres"
        DB_USERNAME="openchat"
        DB_PASSWORD=$(generate_password)
        DB_NAME="openchat"
    fi
    
    if [ "$USE_EXISTING_REDIS" = false ]; then
        REDIS_HOST="redis"
        REDIS_PASSWORD=$(generate_password)
    fi
    
    # 鑾峰彇鏈嶅姟鍣?IP
    get_server_ip
    
    # 鍒涘缓閰嶇疆鏂囦欢
    create_env_file
    create_docker_compose_config
    
    # 鍒濆鍖栨暟鎹簱
    initialize_database
    
    # 鍚姩鏈嶅姟
    start_services
    
    # 鏄剧ず缁撴灉
    show_install_result
}

# 杩愯涓荤▼搴?main "$@"

