#!/bin/bash
# ============================================
# OpenChat - 缁熶竴瀹夎鑴氭湰
# 鐗堟湰: 2.0.0
# 鏀寔: Linux / macOS
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
INSTALL_DIR="${INSTALL_DIR:-/opt/openchat}"

# 瀹夎妯″紡
INSTALL_MODE="${1:-interactive}"

# 鏃ュ織鍑芥暟
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

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
    echo "鈺?                    Version ${APP_VERSION}                           鈺?
    echo "鈺?                                                              鈺?
    echo "鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
    echo -e "${NC}"
    echo
}

# 鏄剧ず甯姪淇℃伅
show_help() {
    echo "鐢ㄦ硶: $0 [閫夐」]"
    echo
    echo "閫夐」:"
    echo "  interactive    浜や簰寮忓畨瑁咃紙榛樿锛?
    echo "  docker         Docker 蹇€熷畨瑁?
    echo "  kubernetes     Kubernetes 瀹夎"
    echo "  standalone     鐙珛鏈嶅姟瀹夎"
    echo "  uninstall      鍗歌浇 OpenChat"
    echo "  upgrade        鍗囩骇 OpenChat"
    echo "  --help, -h     鏄剧ず甯姪淇℃伅"
    echo
    echo "绀轰緥:"
    echo "  $0                    # 浜や簰寮忓畨瑁?
    echo "  $0 docker             # Docker 蹇€熷畨瑁?
    echo "  $0 standalone         # 鐙珛鏈嶅姟瀹夎"
    echo
}

# 妫€娴嬫搷浣滅郴缁?detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_NAME=$NAME
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ -f /etc/debian_version ]; then
        OS="debian"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    log_info "妫€娴嬪埌鎿嶄綔绯荤粺: ${OS_NAME:-$OS} ${OS_VERSION:-}"
}

# 妫€鏌ユ槸鍚︿负 root
check_root() {
    if [ "$EUID" -ne 0 ] && [ "$INSTALL_MODE" != "docker" ]; then
        log_error "璇蜂娇鐢?root 鏉冮檺杩愯瀹夎鑴氭湰"
        echo "绀轰緥: sudo $0"
        exit 1
    fi
}

# 妫€鏌ュ懡浠ゆ槸鍚﹀瓨鍦?command_exists() {
    command -v "$1" &> /dev/null
}

# 妫€鏌ョ郴缁熻姹?check_requirements() {
    log_step "妫€鏌ョ郴缁熻姹?.."
    local missing=()
    
    # 妫€鏌?Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js 鐗堟湰杩囦綆 (褰撳墠: $(node --version))锛岄渶瑕?18+"
            missing+=("nodejs")
        else
            log_success "Node.js $(node --version)"
        fi
    else
        log_warn "鏈壘鍒?Node.js"
        missing+=("nodejs")
    fi
    
    # 妫€鏌?npm
    if command_exists npm; then
        log_success "npm $(npm --version)"
    else
        log_warn "鏈壘鍒?npm"
        missing+=("npm")
    fi
    
    # 妫€鏌?Docker锛堜粎 Docker 妯″紡闇€瑕侊級
    if [ "$INSTALL_MODE" == "docker" ]; then
        if command_exists docker; then
            DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            log_success "Docker $DOCKER_VERSION"
        else
            log_error "鏈壘鍒?Docker锛孌ocker 妯″紡闇€瑕佸畨瑁?Docker"
            missing+=("docker")
        fi
        
        if command_exists docker-compose || docker compose version &> /dev/null; then
            log_success "Docker Compose 宸插畨瑁?
        else
            log_error "鏈壘鍒?Docker Compose"
            missing+=("docker-compose")
        fi
    fi
    
    # 妫€鏌?PostgreSQL锛堜粎鐙珛妯″紡闇€瑕侊級
    if [ "$INSTALL_MODE" == "standalone" ]; then
        if command_exists psql; then
            log_success "PostgreSQL 宸插畨瑁?
        else
            log_warn "鏈壘鍒?PostgreSQL锛岃纭繚宸插畨瑁呭苟杩愯"
        fi
        
        if command_exists redis-cli; then
            log_success "Redis 宸插畨瑁?
        else
            log_warn "鏈壘鍒?Redis锛岃纭繚宸插畨瑁呭苟杩愯"
        fi
    fi
    
    # 杩斿洖缂哄け鐨勪緷璧?    if [ ${#missing[@]} -gt 0 ]; then
        echo "${missing[*]}"
        return 1
    fi
    
    return 0
}

# 瀹夎渚濊禆
install_dependencies() {
    local missing=("$@")
    
    if [ ${#missing[@]} -eq 0 ]; then
        return 0
    fi
    
    log_step "瀹夎缂哄け鐨勪緷璧?.."
    
    read -p "鏄惁鑷姩瀹夎缂哄け鐨勪緷璧? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "璇锋墜鍔ㄥ畨瑁呬互涓嬩緷璧? ${missing[*]}"
        exit 1
    fi
    
    for dep in "${missing[@]}"; do
        case $dep in
            nodejs|npm)
                install_nodejs
                ;;
            docker)
                install_docker
                ;;
            docker-compose)
                install_docker_compose
                ;;
        esac
    done
}

# 瀹夎 Node.js
install_nodejs() {
    log_info "瀹夎 Node.js..."
    
    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
            ;;
        rhel|centos|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
            ;;
        macos)
            if command_exists brew; then
                brew install node@18
            else
                log_error "璇峰厛瀹夎 Homebrew: https://brew.sh/"
                exit 1
            fi
            ;;
        *)
            log_error "涓嶆敮鎸佺殑鎿嶄綔绯荤粺锛岃鎵嬪姩瀹夎 Node.js"
            exit 1
            ;;
    esac
    
    log_success "Node.js 瀹夎瀹屾垚"
}

# 瀹夎 Docker
install_docker() {
    log_info "瀹夎 Docker..."
    
    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y ca-certificates curl gnupg
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        rhel|centos|fedora)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        macos)
            log_error "macOS 璇锋墜鍔ㄥ畨瑁?Docker Desktop: https://www.docker.com/products/docker-desktop"
            exit 1
            ;;
        *)
            log_error "涓嶆敮鎸佺殑鎿嶄綔绯荤粺锛岃鎵嬪姩瀹夎 Docker"
            exit 1
            ;;
    esac
    
    log_success "Docker 瀹夎瀹屾垚"
}

# 瀹夎 Docker Compose
install_docker_compose() {
    log_info "瀹夎 Docker Compose..."
    
    if command_exists docker && docker compose version &> /dev/null; then
        log_success "Docker Compose 宸蹭綔涓?Docker 鎻掍欢瀹夎"
        return
    fi
    
    local COMPOSE_VERSION="v2.24.0"
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose 瀹夎瀹屾垚"
}

# Docker 瀹夎妯″紡
install_docker_mode() {
    log_step "Docker 妯″紡瀹夎..."
    
    # 妫€鏌?Docker 鏈嶅姟
    if ! docker info &> /dev/null; then
        log_error "Docker 鏈嶅姟鏈繍琛岋紝璇峰惎鍔?Docker"
        exit 1
    fi
    
    # 妫€鏌ョ鍙ｅ啿绐?    check_port_conflicts
    
    # 鑾峰彇鏈嶅姟鍣?IP
    get_server_ip
    
    # 閰嶇疆鐜鍙橀噺
    setup_env
    
    # 鍒涘缓蹇呰鐩綍
    mkdir -p var/logs var/data var/run
    
    # 鎷夊彇闀滃儚
    log_info "鎷夊彇 Docker 闀滃儚..."
    docker compose -f docker-compose.quick.yml pull
    
    # 鍚姩鏈嶅姟
    log_info "鍚姩鏈嶅姟..."
    docker compose -f docker-compose.quick.yml up -d
    
    # 绛夊緟鏈嶅姟灏辩华
    wait_for_services
    
    # 鏄剧ず璁块棶淇℃伅
    show_access_info
}

# 妫€鏌ョ鍙ｅ啿绐?check_port_conflicts() {
    log_info "妫€鏌ョ鍙ｅ啿绐?.."
    
    local ports=("3000:OpenChat API" "5432:PostgreSQL" "6379:Redis" "5001:WukongIM API" "5100:WukongIM TCP" "5200:WukongIM WebSocket" "5300:WukongIM Manager")
    local conflicts=()
    
    for port_info in "${ports[@]}"; do
        local port="${port_info%%:*}"
        local service="${port_info#*:}"
        
        if command -v lsof &> /dev/null; then
            if lsof -i ":$port" &> /dev/null; then
                conflicts+=("$port ($service)")
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                conflicts+=("$port ($service)")
            fi
        elif command -v ss &> /dev/null; then
            if ss -tuln 2>/dev/null | grep -q ":$port "; then
                conflicts+=("$port ($service)")
            fi
        fi
    done
    
    if [ ${#conflicts[@]} -gt 0 ]; then
        log_warn "妫€娴嬪埌绔彛鍐茬獊:"
        for conflict in "${conflicts[@]}"; do
            echo "  - $conflict 宸茶鍗犵敤"
        done
        echo
        log_warn "鎮ㄥ彲浠?"
        echo "  1. 鍋滄鍗犵敤绔彛鐨勬湇鍔?
        echo "  2. 淇敼 .env 鏂囦欢涓殑绔彛閰嶇疆"
        echo
        read -p "鏄惁缁х画瀹夎? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "绔彛妫€鏌ラ€氳繃"
    fi
}

# 鐙珛鏈嶅姟瀹夎妯″紡
install_standalone_mode() {
    log_step "鐙珛鏈嶅姟妯″紡瀹夎..."
    
    # 鍒涘缓鐢ㄦ埛
    create_user
    
    # 鍒涘缓鐩綍
    create_directories
    
    # 澶嶅埗鏂囦欢
    copy_files
    
    # 瀹夎渚濊禆
    install_npm_dependencies
    
    # 鏋勫缓搴旂敤
    build_application
    
    # 鍒涘缓绯荤粺鏈嶅姟
    create_systemd_service
    
    # 鍒濆鍖栨暟鎹簱
    init_database
    
    # 鏄剧ず瀹夎淇℃伅
    show_install_info
}

# 鑾峰彇鏈嶅姟鍣?IP
get_server_ip() {
    log_info "妫€娴嬫湇鍔″櫒 IP 鍦板潃..."
    
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
    
    log_info "妫€娴嬪埌鏈嶅姟鍣?IP: $EXTERNAL_IP"
    
    read -p "璇风‘璁ゆ湇鍔″櫒澶栫綉 IP [$EXTERNAL_IP]: " input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    export EXTERNAL_IP
}

# 閰嶇疆鐜鍙橀噺
setup_env() {
    log_info "閰嶇疆鐜鍙橀噺..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        
        # 鏇存柊鐜鍙橀噺
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/EXTERNAL_IP=127.0.0.1/EXTERNAL_IP=$EXTERNAL_IP/" .env 2>/dev/null || true
            sed -i '' "s/your-secret-key-change-this-in-production/$(openssl rand -base64 32)/" .env 2>/dev/null || true
        else
            sed -i "s/EXTERNAL_IP=127.0.0.1/EXTERNAL_IP=$EXTERNAL_IP/" .env 2>/dev/null || true
            sed -i "s/your-secret-key-change-this-in-production/$(openssl rand -base64 32)/" .env 2>/dev/null || true
        fi
        
        log_success "鐜鍙橀噺閰嶇疆瀹屾垚"
        log_warn "璇风紪杈?.env 鏂囦欢淇敼榛樿瀵嗙爜"
    else
        log_warn ".env 鏂囦欢宸插瓨鍦紝璺宠繃閰嶇疆"
    fi
}

# 鍒涘缓鐢ㄦ埛
create_user() {
    local SERVICE_USER="${SERVICE_USER:-openchat}"
    
    log_info "鍒涘缓鏈嶅姟鐢ㄦ埛: $SERVICE_USER"
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_warn "鐢ㄦ埛 $SERVICE_USER 宸插瓨鍦?
    else
        useradd -r -s /bin/false -d "$INSTALL_DIR" "$SERVICE_USER"
        log_success "鐢ㄦ埛 $SERVICE_USER 鍒涘缓鎴愬姛"
    fi
}

# 鍒涘缓鐩綍
create_directories() {
    log_info "鍒涘缓鐩綍缁撴瀯..."
    
    mkdir -p "$INSTALL_DIR"/{bin,etc,var/{logs,run,data},scripts}
    
    # 璁剧疆鏉冮檺
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR"
    chmod 750 "$INSTALL_DIR/var/logs"
    chmod 750 "$INSTALL_DIR/var/data"
    
    log_success "鐩綍缁撴瀯鍒涘缓瀹屾垚"
}

# 澶嶅埗鏂囦欢
copy_files() {
    log_info "澶嶅埗搴旂敤绋嬪簭鏂囦欢..."
    
    # 澶嶅埗蹇呰鏂囦欢
    cp -r "$SCRIPT_DIR/dist" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/bin" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/etc" "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR/database" "$INSTALL_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/" 2>/dev/null || true
    
    # 璁剧疆鏉冮檺
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/bin/openchat"
    
    log_success "鏂囦欢澶嶅埗瀹屾垚"
}

# 瀹夎 npm 渚濊禆
install_npm_dependencies() {
    log_info "瀹夎 Node.js 渚濊禆..."
    
    cd "$INSTALL_DIR"
    
    if [ -f "package.json" ]; then
        npm install --production
        log_success "渚濊禆瀹夎瀹屾垚"
    else
        log_warn "鏈壘鍒?package.json锛岃烦杩囦緷璧栧畨瑁?
    fi
}

# 鏋勫缓搴旂敤
build_application() {
    log_info "鏋勫缓搴旂敤绋嬪簭..."
    
    cd "$INSTALL_DIR"
    
    if [ -f "package.json" ]; then
        npm run build
        log_success "搴旂敤鏋勫缓瀹屾垚"
    else
        log_warn "鏈壘鍒?package.json锛岃烦杩囨瀯寤?
    fi
}

# 鍒涘缓 systemd 鏈嶅姟
create_systemd_service() {
    local SERVICE_NAME="openchat"
    local SERVICE_USER="${SERVICE_USER:-openchat}"
    
    log_info "鍒涘缓 systemd 鏈嶅姟..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=OpenChat Instant Messaging Server
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="NODE_ENV=production"
Environment="OPENCHAT_HOME=$INSTALL_DIR"
ExecStart=/usr/bin/node dist/main.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=5
TimeoutStartSec=30
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log_success "systemd 鏈嶅姟鍒涘缓瀹屾垚"
}

# 鍒濆鍖栨暟鎹簱
init_database() {
    log_info "鍒濆鍖栨暟鎹簱..."
    
    read -p "鏄惁鍒濆鍖栨暟鎹簱? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "鏁版嵁搴撳悕绉?[openchat]: " DB_NAME
        DB_NAME=${DB_NAME:-openchat}
        
        read -p "鏁版嵁搴撶敤鎴?[openchat]: " DB_USERNAME
        DB_USERNAME=${DB_USERNAME:-openchat}
        
        read -sp "鏁版嵁搴撳瘑鐮? " DB_PASS
        echo
        
        # 鍒涘缓鏁版嵁搴?        sudo -u postgres psql << EOF
CREATE USER $DB_USERNAME WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USERNAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USERNAME;
EOF
        
        # 鎵ц DDL
        if [ -f "$INSTALL_DIR/database/schema.sql" ]; then
            sudo -u postgres psql -d "$DB_NAME" -f "$INSTALL_DIR/database/schema.sql"
            log_success "鏁版嵁搴撹〃缁撴瀯鍒涘缓瀹屾垚"
        fi
        
        log_success "鏁版嵁搴撳垵濮嬪寲瀹屾垚"
    fi
}

# 绛夊緟鏈嶅姟灏辩华
wait_for_services() {
    log_info "绛夊緟鏈嶅姟灏辩华..."
    
    local services=("postgres" "redis" "wukongim" "app")
    local ports=("5432" "6379" "5001" "3000")
    
    for i in "${!services[@]}"; do
        local service="${services[$i]}"
        local port="${ports[$i]}"
        
        echo -n "绛夊緟 $service"
        for j in {1..60}; do
            if docker compose exec -T "$service" sh -c "exit 0" &> /dev/null 2>&1; then
                echo " 鉁?
                break
            fi
            echo -n "."
            sleep 1
        done
    done
    
    log_success "鎵€鏈夋湇鍔″凡灏辩华"
}

# 鏄剧ず璁块棶淇℃伅
show_access_info() {
    echo
    echo -e "${GREEN}鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo -e "${GREEN}鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?{NC}"
    echo -e "${GREEN}鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo
    echo -e "${BOLD}鏈嶅姟璁块棶鍦板潃:${NC}"
    echo "  鈥?OpenChat API:    http://$EXTERNAL_IP:3000"
    echo "  鈥?API 鏂囨。:        http://$EXTERNAL_IP:3000/im/v3/docs"
    echo "  鈥?鍋ュ悍妫€鏌?        http://$EXTERNAL_IP:3000/health"
    echo "  鈥?鎮熺┖IM Demo:     http://$EXTERNAL_IP:5172"
    echo "  鈥?鎮熺┖IM 绠＄悊鍚庡彴: http://$EXTERNAL_IP:5300/web"
    echo
    echo -e "${BOLD}甯哥敤鍛戒护:${NC}"
    echo "  鈥?鏌ョ湅鏃ュ織:    docker compose logs -f"
    echo "  鈥?鍋滄鏈嶅姟:    docker compose down"
    echo "  鈥?閲嶅惎鏈嶅姟:    docker compose restart"
    echo "  鈥?鏌ョ湅鐘舵€?    docker compose ps"
    echo
    echo -e "${YELLOW}瀹夊叏鎻愮ず:${NC}"
    echo "  鈿狅笍  鐢熶骇鐜璇蜂慨鏀?.env 鏂囦欢涓殑榛樿瀵嗙爜"
    echo "  鈿狅笍  寤鸿閰嶇疆闃茬伀澧欙紝闄愬埗鏁版嵁搴撶鍙ｄ粎鍐呯綉璁块棶"
    echo "  鈿狅笍  寤鸿鍚敤 HTTPS"
    echo
}

# 鏄剧ず瀹夎淇℃伅锛堢嫭绔嬫ā寮忥級
show_install_info() {
    local SERVICE_NAME="openchat"
    
    echo
    echo -e "${GREEN}鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo -e "${GREEN}鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?{NC}"
    echo -e "${GREEN}鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo
    echo -e "${BOLD}瀹夎淇℃伅:${NC}"
    echo "  鈥?瀹夎鐩綍: $INSTALL_DIR"
    echo "  鈥?鏈嶅姟鐢ㄦ埛: $SERVICE_USER"
    echo
    echo -e "${BOLD}甯哥敤鍛戒护:${NC}"
    echo "  鈥?鍚姩鏈嶅姟: systemctl start $SERVICE_NAME"
    echo "  鈥?鍋滄鏈嶅姟: systemctl stop $SERVICE_NAME"
    echo "  鈥?閲嶅惎鏈嶅姟: systemctl restart $SERVICE_NAME"
    echo "  鈥?鏌ョ湅鐘舵€? systemctl status $SERVICE_NAME"
    echo "  鈥?鏌ョ湅鏃ュ織: journalctl -u $SERVICE_NAME -f"
    echo
    echo -e "${BOLD}閰嶇疆鏂囦欢:${NC}"
    echo "  鈥?涓婚厤缃? $INSTALL_DIR/etc/config.json"
    echo "  鈥?鐜鍙橀噺: $INSTALL_DIR/.env"
    echo "  鈥?鏃ュ織鐩綍: $INSTALL_DIR/var/logs"
    echo
}

# 浜や簰寮忓畨瑁?interactive_install() {
    show_banner
    
    echo -e "${BOLD}璇烽€夋嫨瀹夎妯″紡:${NC}"
    echo
    echo "  1) Docker 蹇€熷畨瑁咃紙鎺ㄨ崘锛?
    echo "  2) 鐙珛鏈嶅姟瀹夎"
    echo "  3) Kubernetes 瀹夎"
    echo "  4) 閫€鍑?
    echo
    read -p "璇疯緭鍏ラ€夐」 [1-4]: " choice
    
    case $choice in
        1)
            INSTALL_MODE="docker"
            check_root
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_docker_mode
            ;;
        2)
            INSTALL_MODE="standalone"
            check_root
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_standalone_mode
            ;;
        3)
            INSTALL_MODE="kubernetes"
            log_info "Kubernetes 瀹夎璇峰弬鑰? docs/deploy/kubernetes.md"
            log_info "蹇€熼儴缃? kubectl apply -k k8s/overlays/production"
            ;;
        4)
            log_info "宸插彇娑堝畨瑁?
            exit 0
            ;;
        *)
            log_error "鏃犳晥閫夐」"
            exit 1
            ;;
    esac
}

# 鍗歌浇
uninstall() {
    log_warn "鍗冲皢鍗歌浇 OpenChat..."
    
    read -p "纭鍗歌浇? 姝ゆ搷浣滀笉鍙仮澶? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 鍋滄鏈嶅姟
        systemctl stop openchat 2>/dev/null || true
        systemctl disable openchat 2>/dev/null || true
        rm -f /etc/systemd/system/openchat.service
        systemctl daemon-reload
        
        # 鍋滄 Docker 瀹瑰櫒
        docker compose down 2>/dev/null || true
        
        # 鍒犻櫎鐢ㄦ埛
        userdel -r openchat 2>/dev/null || true
        
        # 鍒犻櫎鐩綍
        read -p "鏄惁鍒犻櫎鏁版嵁鐩綍 $INSTALL_DIR? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        fi
        
        log_success "鍗歌浇瀹屾垚"
    else
        log_info "宸插彇娑堝嵏杞?
    fi
}

# 涓荤▼搴?main() {
    case "$INSTALL_MODE" in
        -h|--help|help)
            show_help
            exit 0
            ;;
        docker)
            show_banner
            check_root
            detect_os
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_docker_mode
            ;;
        standalone)
            show_banner
            check_root
            detect_os
            missing=$(check_requirements)
            if [ $? -ne 0 ]; then
                install_dependencies $missing
            fi
            install_standalone_mode
            ;;
        kubernetes)
            show_banner
            log_info "Kubernetes 瀹夎璇峰弬鑰? docs/deploy/kubernetes.md"
            log_info "蹇€熼儴缃? kubectl apply -k k8s/overlays/production"
            ;;
        uninstall)
            uninstall
            ;;
        upgrade)
            log_info "鍗囩骇鍔熻兘寮€鍙戜腑..."
            ;;
        *)
            interactive_install
            ;;
    esac
}

# 杩愯涓荤▼搴?main "$@"

