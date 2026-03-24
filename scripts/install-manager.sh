#!/bin/bash
# ============================================
# OpenChat - 鏅鸿兘瀹夎绠＄悊鍣?# 鏀寔瀹夎妫€娴嬨€侀敊璇仮澶嶃€佸洖婊氬姛鑳?# ============================================

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
INSTALL_STATE_FILE=".openchat-install-state"
INSTALL_LOG_FILE="var/logs/install.log"
BACKUP_DIR="var/backups"

# 瀹夎鐘舵€?STATE_NOT_INSTALLED="not_installed"
STATE_INSTALLING="installing"
STATE_INSTALLED="installed"
STATE_FAILED="failed"
STATE_PARTIAL="partial"

# 褰撳墠瀹夎鐘舵€?CURRENT_STATE=""
INSTALL_STEP=""
LAST_ERROR=""

# 鏃ュ織鍑芥暟
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
    echo -e "${GREEN}[鉁揮${NC} $1"
    log "SUCCESS" "$1"
}

log_warn() { 
    echo -e "${YELLOW}[!]${NC} $1"
    log "WARN" "$1"
}

log_error() { 
    echo -e "${RED}[鉁梋${NC} $1"
    log "ERROR" "$1"
    LAST_ERROR="$1"
}

log_step() { 
    echo -e "${CYAN}[STEP]${NC} $1"
    log "STEP" "$1"
}

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
    echo "鈺?                    鏅鸿兘瀹夎绠＄悊鍣?v${APP_VERSION}                      鈺?
    echo "鈺?                                                              鈺?
    echo "鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
    echo -e "${NC}"
    echo
}

# 鍒濆鍖栧畨瑁呯幆澧?init_install_env() {
    # 鍒涘缓蹇呰鐩綍
    mkdir -p var/logs
    mkdir -p var/backups
    mkdir -p var/data
    
    # 鍒濆鍖栨棩蹇楁枃浠?    if [ ! -f "$INSTALL_LOG_FILE" ]; then
        touch "$INSTALL_LOG_FILE"
    fi
    
    log_info "鍒濆鍖栧畨瑁呯幆澧?
}

# 璇诲彇瀹夎鐘舵€?read_install_state() {
    if [ -f "$INSTALL_STATE_FILE" ]; then
        source "$INSTALL_STATE_FILE"
        CURRENT_STATE="${STATE:-$STATE_NOT_INSTALLED}"
        INSTALL_STEP="${STEP:-}"
        LAST_ERROR="${ERROR:-}"
    else
        CURRENT_STATE="$STATE_NOT_INSTALLED"
    fi
}

# 淇濆瓨瀹夎鐘舵€?save_install_state() {
    local state="$1"
    local step="$2"
    local error="$3"
    
    cat > "$INSTALL_STATE_FILE" << EOF
# OpenChat 瀹夎鐘舵€佹枃浠?# 鑷姩鐢熸垚锛岃鍕挎墜鍔ㄧ紪杈?STATE=$state
STEP=$step
ERROR=$error
TIMESTAMP=$(date +%s)
VERSION=$APP_VERSION
EOF
    
    CURRENT_STATE="$state"
    INSTALL_STEP="$step"
}

# 妫€鏌ユ槸鍚﹀凡瀹夎
check_existing_installation() {
    log_step "妫€鏌ョ幇鏈夊畨瑁?.."
    
    local installed=false
    local reasons=()
    
    # 妫€鏌ラ厤缃枃浠?    if [ -f ".env" ]; then
        reasons+=("鍙戠幇 .env 閰嶇疆鏂囦欢")
        installed=true
    fi
    
    # 妫€鏌?Docker 瀹瑰櫒
    if command_exists docker; then
        if docker ps --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
            reasons+=("鍙戠幇杩愯涓殑 OpenChat 瀹瑰櫒")
            installed=true
        fi
    fi
    
    # 妫€鏌ユ暟鎹簱
    if [ -f ".env" ]; then
        source .env
        if command_exists psql && [ -n "$DB_HOST" ]; then
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-openchat}" -d "${DB_NAME:-openchat}" -c "SELECT 1" &>/dev/null; then
                reasons+=("鏁版嵁搴撳凡瀛樺湪 OpenChat 琛ㄧ粨鏋?)
                installed=true
            fi
        fi
    fi
    
    # 妫€鏌?PM2 杩涚▼
    if command_exists pm2; then
        if pm2 list | grep -q "openchat" 2>/dev/null; then
            reasons+=("鍙戠幇 PM2 绠＄悊鐨?OpenChat 杩涚▼")
            installed=true
        fi
    fi
    
    if [ "$installed" = true ]; then
        echo
        log_warn "妫€娴嬪埌宸叉湁瀹夎:"
        for reason in "${reasons[@]}"; do
            echo "  鈥?$reason"
        done
        echo
        return 0
    else
        log_success "鏈娴嬪埌宸叉湁瀹夎"
        return 1
    fi
}

# 澶勭悊宸叉湁瀹夎
handle_existing_installation() {
    echo
    echo -e "${BOLD}璇烽€夋嫨鎿嶄綔:${NC}"
    echo "  1) 璺宠繃宸插畨瑁呴儴鍒嗭紝缁х画瀹夎"
    echo "  2) 閲嶆柊瀹夎锛堜繚鐣欐暟鎹級"
    echo "  3) 瀹屽叏閲嶆柊瀹夎锛堟竻闄ゆ暟鎹級"
    echo "  4) 閫€鍑哄畨瑁?
    echo
    read -p "璇烽€夋嫨 [1-4]: " choice
    
    case $choice in
        1)
            log_info "璺宠繃宸插畨瑁呴儴鍒嗭紝缁х画瀹夎..."
            return 0
            ;;
        2)
            log_info "鍑嗗閲嶆柊瀹夎锛堜繚鐣欐暟鎹級..."
            backup_data
            cleanup_installation false
            return 0
            ;;
        3)
            log_warn "璀﹀憡: 杩欏皢鍒犻櫎鎵€鏈夋暟鎹?"
            read -p "纭瀹屽叏閲嶆柊瀹夎? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                log_info "鍑嗗瀹屽叏閲嶆柊瀹夎..."
                backup_data
                cleanup_installation true
                return 0
            else
                log_info "宸插彇娑?
                exit 0
            fi
            ;;
        4)
            log_info "閫€鍑哄畨瑁?
            exit 0
            ;;
        *)
            log_error "鏃犳晥閫夋嫨"
            exit 1
            ;;
    esac
}

# 澶囦唤鏁版嵁
backup_data() {
    log_step "澶囦唤鐜版湁鏁版嵁..."
    
    local backup_time=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$backup_time"
    
    mkdir -p "$backup_path"
    
    # 澶囦唤閰嶇疆鏂囦欢
    if [ -f ".env" ]; then
        cp ".env" "$backup_path/.env"
        log_success "澶囦唤 .env 鏂囦欢"
    fi
    
    # 澶囦唤鏁版嵁搴?    if [ -f ".env" ]; then
        source .env
        if command_exists pg_dump && [ -n "$DB_HOST" ]; then
            PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-openchat}" "${DB_NAME:-openchat}" > "$backup_path/database.sql" 2>/dev/null
            if [ $? -eq 0 ]; then
                log_success "澶囦唤鏁版嵁搴?
            fi
        fi
    fi
    
    # 澶囦唤鏃ュ織
    if [ -d "var/logs" ]; then
        cp -r var/logs "$backup_path/"
        log_success "澶囦唤鏃ュ織鏂囦欢"
    fi
    
    log_success "澶囦唤瀹屾垚: $backup_path"
}

# 娓呯悊瀹夎
cleanup_installation() {
    local full_cleanup="$1"
    
    log_step "娓呯悊鐜版湁瀹夎..."
    
    # 鍋滄 Docker 瀹瑰櫒
    if command_exists docker; then
        if docker ps -a --format '{{.Names}}' | grep -q "openchat" 2>/dev/null; then
            docker compose down -v 2>/dev/null || true
            log_success "鍋滄 Docker 瀹瑰櫒"
        fi
    fi
    
    # 鍋滄 PM2 杩涚▼
    if command_exists pm2; then
        if pm2 list | grep -q "openchat" 2>/dev/null; then
            pm2 stop openchat 2>/dev/null || true
            pm2 delete openchat 2>/dev/null || true
            log_success "鍋滄 PM2 杩涚▼"
        fi
    fi
    
    # 瀹屽叏娓呯悊
    if [ "$full_cleanup" = true ]; then
        # 鍒犻櫎閰嶇疆鏂囦欢
        rm -f .env docker-compose.override.yml
        log_success "鍒犻櫎閰嶇疆鏂囦欢"
        
        # 鍒犻櫎鏁版嵁鐩綍
        rm -rf var/data var/logs
        log_success "鍒犻櫎鏁版嵁鐩綍"
    fi
    
    # 鍒犻櫎瀹夎鐘舵€佹枃浠?    rm -f "$INSTALL_STATE_FILE"
}

# 閿欒澶勭悊
handle_error() {
    local step="$1"
    local error="$2"
    
    log_error "瀹夎澶辫触: $error"
    
    # 淇濆瓨澶辫触鐘舵€?    save_install_state "$STATE_FAILED" "$step" "$error"
    
    echo
    echo -e "${RED}鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo -e "${RED}鈺?                   瀹夎澶辫触                                   鈺?{NC}"
    echo -e "${RED}鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo
    echo -e "${BOLD}閿欒淇℃伅:${NC} $error"
    echo -e "${BOLD}澶辫触姝ラ:${NC} $step"
    echo
    echo -e "${BOLD}鎭㈠閫夐」:${NC}"
    echo "  1) 閲嶈瘯褰撳墠姝ラ"
    echo "  2) 鍥炴粴鍒颁笂涓€姝?
    echo "  3) 鏌ョ湅璇︾粏鏃ュ織"
    echo "  4) 閫€鍑哄畨瑁?
    echo
    read -p "璇烽€夋嫨 [1-4]: " choice
    
    case $choice in
        1)
            log_info "閲嶈瘯褰撳墠姝ラ..."
            return 1  # 杩斿洖闈為浂琛ㄧず閲嶈瘯
            ;;
        2)
            rollback_installation "$step"
            return 2
            ;;
        3)
            echo
            echo -e "${BOLD}瀹夎鏃ュ織:${NC}"
            tail -100 "$INSTALL_LOG_FILE"
            echo
            read -p "鎸夊洖杞︾户缁?.."
            return 1
            ;;
        4)
            log_info "閫€鍑哄畨瑁咃紝鍙◢鍚庨噸鏂拌繍琛岃剼鏈户缁?
            exit 1
            ;;
        *)
            return 1
            ;;
    esac
}

# 鍥炴粴瀹夎
rollback_installation() {
    local failed_step="$1"
    
    log_step "鍥炴粴瀹夎..."
    
    # 鏍规嵁澶辫触姝ラ鍐冲畾鍥炴粴鑼冨洿
    case $failed_step in
        "database")
            log_info "鍥炴粴鏁版嵁搴撻厤缃?.."
            # 鏁版嵁搴撳洖婊氶€昏緫
            ;;
        "redis")
            log_info "鍥炴粴 Redis 閰嶇疆..."
            # Redis 鍥炴粴閫昏緫
            ;;
        "docker")
            log_info "鍥炴粴 Docker 閰嶇疆..."
            docker compose down -v 2>/dev/null || true
            ;;
        "config")
            log_info "鍥炴粴閰嶇疆鏂囦欢..."
            rm -f .env docker-compose.override.yml
            ;;
    esac
    
    # 鎭㈠澶囦唤
    local latest_backup=$(ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        log_info "鍙戠幇澶囦唤: $latest_backup"
        read -p "鏄惁鎭㈠姝ゅ浠? (y/N): " restore
        if [[ $restore =~ ^[Yy]$ ]]; then
            if [ -f "$latest_backup/.env" ]; then
                cp "$latest_backup/.env" .env
                log_success "鎭㈠閰嶇疆鏂囦欢"
            fi
        fi
    fi
    
    save_install_state "$STATE_PARTIAL" "rollback" ""
    log_success "鍥炴粴瀹屾垚"
}

# 妫€鏌ュ懡浠ゆ槸鍚﹀瓨鍦?command_exists() {
    command -v "$1" &> /dev/null
}

# 瀹夎姝ラ锛氱幆澧冩鏌?step_check_environment() {
    INSTALL_STEP="environment"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "妫€鏌ョ郴缁熺幆澧?.."
    
    local errors=()
    
    # 妫€鏌ユ搷浣滅郴缁?    if [ -f /etc/os-release ]; then
        . /etc/os-release
        log_success "鎿嶄綔绯荤粺: $NAME $VERSION_ID"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "鎿嶄綔绯荤粺: macOS"
    else
        errors+=("鏃犳硶璇嗗埆鎿嶄綔绯荤粺")
    fi
    
    # 妫€鏌?Docker
    if command_exists docker; then
        if docker info &> /dev/null; then
            log_success "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
        else
            errors+=("Docker 鏈嶅姟鏈繍琛?)
        fi
    else
        errors+=("Docker 鏈畨瑁?)
    fi
    
    # 妫€鏌?Docker Compose
    if docker compose version &> /dev/null; then
        log_success "Docker Compose: $(docker compose version --short)"
    else
        errors+=("Docker Compose 鏈畨瑁?)
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        for error in "${errors[@]}"; do
            log_error "$error"
        done
        handle_error "$INSTALL_STEP" "鐜妫€鏌ュけ璐?
        return $?
    fi
    
    log_success "鐜妫€鏌ラ€氳繃"
    return 0
}

# 瀹夎姝ラ锛氶厤缃?step_configure() {
    INSTALL_STEP="config"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "閰嶇疆瀹夎鍙傛暟..."
    
    # 閫夋嫨鐜
    echo
    echo -e "${BOLD}閫夋嫨瀹夎鐜:${NC}"
    echo "  1) 寮€鍙戠幆澧?(Development)"
    echo "  2) 娴嬭瘯鐜 (Testing)"
    echo "  3) 鐢熶骇鐜 (Production)"
    echo
    read -p "璇烽€夋嫨 [1-3, 榛樿 3]: " env_choice
    
    local env_name="production"
    case ${env_choice:-3} in
        1) env_name="development" ;;
        2) env_name="test" ;;
        3) env_name="production" ;;
    esac
    
    # 澶嶅埗閰嶇疆鏂囦欢
    if [ ! -f ".env" ]; then
        cp ".env.$env_name" .env
        log_success "鍒涘缓 .env 閰嶇疆鏂囦欢"
    else
        log_warn ".env 宸插瓨鍦紝璺宠繃鍒涘缓"
    fi
    
    # 鑾峰彇鏈嶅姟鍣?IP
    local external_ip=$(curl -s -4 --connect-timeout 5 ifconfig.me 2>/dev/null || echo "")
    if [ -z "$external_ip" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            external_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
        else
            external_ip=$(hostname -I | awk '{print $1}')
        fi
    fi
    
    read -p "鏈嶅姟鍣ㄥ缃?IP [$external_ip]: " input_ip
    external_ip=${input_ip:-$external_ip}
    
    # 鏇存柊閰嶇疆
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/EXTERNAL_IP=.*/EXTERNAL_IP=$external_ip/" .env
    else
        sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=$external_ip/" .env
    fi
    
    # 鐢熸垚瀵嗛挜
    local jwt_secret=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
    else
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
    fi
    
    log_success "閰嶇疆瀹屾垚"
    return 0
}

# 瀹夎姝ラ锛氭暟鎹簱
step_database() {
    INSTALL_STEP="database"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "閰嶇疆鏁版嵁搴?.."
    
    # 妫€鏌ユ槸鍚︿娇鐢ㄥ凡鏈夋暟鎹簱
    echo
    read -p "鏄惁浣跨敤宸叉湁 PostgreSQL 鏁版嵁搴? (y/N): " use_existing
    
    if [[ $use_existing =~ ^[Yy]$ ]]; then
        # 閰嶇疆宸叉湁鏁版嵁搴?        read -p "鏁版嵁搴撲富鏈哄湴鍧€ [localhost]: " db_host
        db_host=${db_host:-localhost}
        
        read -p "鏁版嵁搴撶鍙?[5432]: " db_port
        db_port=${db_port:-5432}
        
        read -p "鏁版嵁搴撳悕绉?[openchat]: " db_name
        db_name=${db_name:-openchat}
        
        read -p "鏁版嵁搴撶敤鎴峰悕: " db_user
        read -s -p "鏁版嵁搴撳瘑鐮? " db_password
        echo
        
        # 娴嬭瘯杩炴帴
        if PGPASSWORD="$db_password" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1" &>/dev/null; then
            log_success "鏁版嵁搴撹繛鎺ユ垚鍔?
            
            # 鏇存柊閰嶇疆
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
            handle_error "$INSTALL_STEP" "鏁版嵁搴撹繛鎺ュけ璐?
            return $?
        fi
    else
        log_info "灏嗕娇鐢?Docker 鍒涘缓鏁版嵁搴?
    fi
    
    return 0
}

# 瀹夎姝ラ锛歊edis
step_redis() {
    INSTALL_STEP="redis"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "閰嶇疆 Redis..."
    
    # 妫€鏌ユ槸鍚︿娇鐢ㄥ凡鏈?Redis
    echo
    read -p "鏄惁浣跨敤宸叉湁 Redis 鏈嶅姟? (y/N): " use_existing
    
    if [[ $use_existing =~ ^[Yy]$ ]]; then
        # 閰嶇疆宸叉湁 Redis
        read -p "Redis 涓绘満鍦板潃 [localhost]: " redis_host
        redis_host=${redis_host:-localhost}
        
        read -p "Redis 绔彛 [6379]: " redis_port
        redis_port=${redis_port:-6379}
        
        read -s -p "Redis 瀵嗙爜 (鏃犲瘑鐮佽鐣欑┖): " redis_password
        echo
        
        # 娴嬭瘯杩炴帴
        if [ -n "$redis_password" ]; then
            if redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" ping &>/dev/null; then
                log_success "Redis 杩炴帴鎴愬姛"
            else
                handle_error "$INSTALL_STEP" "Redis 杩炴帴澶辫触"
                return $?
            fi
        else
            if redis-cli -h "$redis_host" -p "$redis_port" ping &>/dev/null; then
                log_success "Redis 杩炴帴鎴愬姛"
            else
                handle_error "$INSTALL_STEP" "Redis 杩炴帴澶辫触"
                return $?
            fi
        fi
        
        # 鏇存柊閰嶇疆
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
        log_info "灏嗕娇鐢?Docker 鍒涘缓 Redis"
    fi
    
    return 0
}

# 瀹夎姝ラ锛氬惎鍔ㄦ湇鍔?step_start_services() {
    INSTALL_STEP="services"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "鍚姩鏈嶅姟..."
    
    # 鎷夊彇闀滃儚
    log_info "鎷夊彇 Docker 闀滃儚..."
    if ! docker compose pull; then
        handle_error "$INSTALL_STEP" "闀滃儚鎷夊彇澶辫触"
        return $?
    fi
    
    # 鍚姩鏈嶅姟
    log_info "鍚姩 Docker 鏈嶅姟..."
    if ! docker compose up -d; then
        handle_error "$INSTALL_STEP" "鏈嶅姟鍚姩澶辫触"
        return $?
    fi
    
    # 绛夊緟鏈嶅姟灏辩华
    log_info "绛夊緟鏈嶅姟灏辩华..."
    local max_wait=120
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if curl -s http://localhost:3000/health &>/dev/null; then
            log_success "鏈嶅姟鍚姩鎴愬姛"
            break
        fi
        echo -n "."
        sleep 2
        waited=$((waited + 2))
    done
    echo
    
    if [ $waited -ge $max_wait ]; then
        handle_error "$INSTALL_STEP" "鏈嶅姟鍚姩瓒呮椂"
        return $?
    fi
    
    return 0
}

# 瀹夎姝ラ锛氶獙璇?step_verify() {
    INSTALL_STEP="verify"
    save_install_state "$STATE_INSTALLING" "$INSTALL_STEP" ""
    
    log_step "楠岃瘉瀹夎..."
    
    local errors=()
    
    # 妫€鏌?API 鏈嶅姟
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        log_success "API 鏈嶅姟姝ｅ父"
    else
        errors+=("API 鏈嶅姟寮傚父")
    fi
    
    # 妫€鏌ユ暟鎹簱杩炴帴
    source .env
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        log_success "鏁版嵁搴撹繛鎺ユ甯?
    else
        errors+=("鏁版嵁搴撹繛鎺ュ紓甯?)
    fi
    
    # 妫€鏌?Redis 杩炴帴
    if [ -n "$REDIS_PASSWORD" ]; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis 杩炴帴姝ｅ父"
        else
            errors+=("Redis 杩炴帴寮傚父")
        fi
    else
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis 杩炴帴姝ｅ父"
        else
            errors+=("Redis 杩炴帴寮傚父")
        fi
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        for error in "${errors[@]}"; do
            log_error "$error"
        done
        handle_error "$INSTALL_STEP" "楠岃瘉澶辫触"
        return $?
    fi
    
    return 0
}

# 鏄剧ず瀹夎缁撴灉
show_install_result() {
    source .env
    
    echo
    echo -e "${GREEN}鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo -e "${GREEN}鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?{NC}"
    echo -e "${GREEN}鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
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
    
    # 鍒濆鍖?    init_install_env
    
    # 璇诲彇瀹夎鐘舵€?    read_install_state
    
    # 妫€鏌ュ凡鏈夊畨瑁?    if check_existing_installation; then
        handle_existing_installation
    fi
    
    # 濡傛灉涔嬪墠瀹夎澶辫触锛岃闂槸鍚︾户缁?    if [ "$CURRENT_STATE" = "$STATE_FAILED" ]; then
        echo
        log_warn "妫€娴嬪埌涓婃瀹夎澶辫触"
        log_info "澶辫触姝ラ: $INSTALL_STEP"
        log_info "閿欒淇℃伅: $LAST_ERROR"
        echo
        read -p "鏄惁浠庡け璐ュ缁х画瀹夎? (Y/n): " continue_install
        if [[ ! $continue_install =~ ^[Nn]$ ]]; then
            log_info "浠庡け璐ュ缁х画瀹夎..."
        else
            log_info "閲嶆柊寮€濮嬪畨瑁?.."
            CURRENT_STATE="$STATE_NOT_INSTALLED"
        fi
    fi
    
    # 鎵ц瀹夎姝ラ
    local steps=("environment" "config" "database" "redis" "services" "verify")
    local step_functions=("step_check_environment" "step_configure" "step_database" "step_redis" "step_start_services" "step_verify")
    
    for i in "${!steps[@]}"; do
        local step="${steps[$i]}"
        local func="${step_functions[$i]}"
        
        # 濡傛灉鏄粠澶辫触澶勭户缁紝璺宠繃宸插畬鎴愮殑姝ラ
        if [ "$CURRENT_STATE" = "$STATE_FAILED" ] && [ "$step" != "$INSTALL_STEP" ] && [ -z "$resume_started" ]; then
            continue
        fi
        resume_started="true"
        
        # 鎵ц姝ラ
        while true; do
            $func
            local result=$?
            
            if [ $result -eq 0 ]; then
                break
            elif [ $result -eq 2 ]; then
                # 鍥炴粴鍚庨€€鍑?                exit 1
            fi
            # result=1 琛ㄧず閲嶈瘯
        done
    done
    
    # 瀹夎瀹屾垚
    save_install_state "$STATE_INSTALLED" "complete" ""
    show_install_result
}

# 杩愯涓荤▼搴?main "$@"

