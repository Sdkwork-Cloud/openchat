#!/bin/bash
# ============================================
# OpenChat - 涓€閿畨瑁呰剼鏈?# 蹇€熶綋楠?OpenChat
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
    echo "鈺?                    涓€閿畨瑁呰剼鏈?                             鈺?
    echo "鈺?                                                              鈺?
    echo "鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
    echo -e "${NC}"
    echo
}

# 妫€鏌ュ懡浠ゆ槸鍚﹀瓨鍦?command_exists() {
    command -v "$1" &> /dev/null
}

# 妫€鏌?Docker
check_docker() {
    if ! command_exists docker; then
        echo -e "${RED}閿欒: 鏈壘鍒?Docker${NC}"
        echo
        echo "璇峰厛瀹夎 Docker:"
        echo "  - Linux: curl -fsSL https://get.docker.com | sh"
        echo "  - macOS: https://docs.docker.com/desktop/install/mac-install/"
        echo "  - Windows: https://docs.docker.com/desktop/install/windows-install/"
        echo
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}閿欒: Docker 鏈嶅姟鏈繍琛?{NC}"
        echo "璇峰惎鍔?Docker 鏈嶅姟鍚庨噸璇?
        exit 1
    fi
    
    echo -e "${GREEN}鉁?Docker 宸插畨瑁呭苟杩愯${NC}"
}

# 妫€鏌?Docker Compose
check_docker_compose() {
    if docker compose version &> /dev/null; then
        echo -e "${GREEN}鉁?Docker Compose 宸插畨瑁?{NC}"
    elif command_exists docker-compose; then
        echo -e "${GREEN}鉁?Docker Compose 宸插畨瑁?{NC}"
    else
        echo -e "${RED}閿欒: 鏈壘鍒?Docker Compose${NC}"
        echo "璇峰畨瑁?Docker Compose 鍚庨噸璇?
        exit 1
    fi
}

# 鑾峰彇鏈嶅姟鍣?IP
get_server_ip() {
    echo -e "${BLUE}妫€娴嬫湇鍔″櫒 IP 鍦板潃...${NC}"
    
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
    
    echo -e "${CYAN}妫€娴嬪埌鏈嶅姟鍣?IP: $EXTERNAL_IP${NC}"
    
    read -p "璇风‘璁ゆ湇鍔″櫒澶栫綉 IP [$EXTERNAL_IP]: " input_ip
    EXTERNAL_IP=${input_ip:-$EXTERNAL_IP}
    
    export EXTERNAL_IP
}

# 閰嶇疆鐜鍙橀噺
setup_env() {
    echo -e "${BLUE}閰嶇疆鐜鍙橀噺...${NC}"
    
    if [ ! -f ".env" ]; then
        # 涓嬭浇 .env.example 鎴栧垱寤洪粯璁ら厤缃?        if [ -f ".env.example" ]; then
            cp .env.example .env
        else
            # 鍒涘缓榛樿閰嶇疆
            cat > .env << EOF
# OpenChat 鐜閰嶇疆
# 鑷姩鐢熸垚浜?$(date)

# 鏈嶅姟鍣ㄩ厤缃?EXTERNAL_IP=${EXTERNAL_IP}
PORT=3000

# 鏁版嵁搴撻厤缃?DB_USERNAME=openchat
DB_PASSWORD=$(openssl rand -base64 16)
DB_NAME=openchat
DB_PORT=5432

# Redis 閰嶇疆
REDIS_PASSWORD=$(openssl rand -base64 16)
REDIS_PORT=6379

# JWT 瀵嗛挜
JWT_SECRET=$(openssl rand -base64 32)

# 鎮熺┖IM 閰嶇疆
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://${EXTERNAL_IP}:5200
EOF
        fi
        
        # 鏇存柊鐜鍙橀噺
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/EXTERNAL_IP=.*/EXTERNAL_IP=${EXTERNAL_IP}/" .env 2>/dev/null || true
            sed -i '' "s|WS_URL=.*|WS_URL=ws://${EXTERNAL_IP}:5200|" .env 2>/dev/null || true
        else
            sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=${EXTERNAL_IP}/" .env 2>/dev/null || true
            sed -i "s|WS_URL=.*|WS_URL=ws://${EXTERNAL_IP}:5200|" .env 2>/dev/null || true
        fi
        
        echo -e "${GREEN}鉁?鐜鍙橀噺閰嶇疆瀹屾垚${NC}"
    else
        echo -e "${YELLOW}!.env 鏂囦欢宸插瓨鍦紝璺宠繃閰嶇疆${NC}"
    fi
}

# 鎷夊彇闀滃儚
pull_images() {
    echo -e "${BLUE}鎷夊彇 Docker 闀滃儚...${NC}"
    echo -e "${CYAN}杩欏彲鑳介渶瑕佸嚑鍒嗛挓锛岃鑰愬績绛夊緟...${NC}"
    
    docker compose -f docker-compose.quick.yml pull
    
    echo -e "${GREEN}鉁?闀滃儚鎷夊彇瀹屾垚${NC}"
}

# 鍚姩鏈嶅姟
start_services() {
    echo -e "${BLUE}鍚姩鏈嶅姟...${NC}"
    
    docker compose -f docker-compose.quick.yml up -d
    
    echo -e "${GREEN}鉁?鏈嶅姟鍚姩瀹屾垚${NC}"
}

# 绛夊緟鏈嶅姟灏辩华
wait_for_services() {
    echo -e "${BLUE}绛夊緟鏈嶅姟灏辩华...${NC}"
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${GREEN}鉁?OpenChat 鏈嶅姟宸插氨缁?{NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}鏈嶅姟鍚姩瓒呮椂锛岃妫€鏌ユ棩蹇?{NC}"
    return 1
}

# 鏄剧ず璁块棶淇℃伅
show_access_info() {
    echo
    echo -e "${GREEN}鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo -e "${GREEN}鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?{NC}"
    echo -e "${GREEN}鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?{NC}"
    echo
    echo -e "${BOLD}鏈嶅姟璁块棶鍦板潃:${NC}"
    echo "  鈥?OpenChat API:    http://${EXTERNAL_IP}:3000"
    echo "  鈥?API 鏂囨。:        http://${EXTERNAL_IP}:3000/im/v3/docs"
    echo "  鈥?鍋ュ悍妫€鏌?        http://${EXTERNAL_IP}:3000/health"
    echo "  鈥?鎮熺┖IM Demo:     http://${EXTERNAL_IP}:5172"
    echo "  鈥?鎮熺┖IM 绠＄悊鍚庡彴: http://${EXTERNAL_IP}:5300/web"
    echo
    echo -e "${BOLD}榛樿璐﹀彿:${NC}"
    echo "  鈥?鐢ㄦ埛鍚? admin"
    echo "  鈥?瀵嗙爜: admin123"
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
    echo -e "${CYAN}鏂囨。: https://github.com/Sdkwork-Cloud/openchat${NC}"
    echo
}

# 涓荤▼搴?main() {
    show_banner
    
    echo -e "${BOLD}寮€濮嬩竴閿畨瑁?OpenChat...${NC}"
    echo
    
    # 妫€鏌ョ幆澧?    check_docker
    check_docker_compose
    echo
    
    # 閰嶇疆
    get_server_ip
    setup_env
    echo
    
    # 瀹夎
    pull_images
    start_services
    echo
    
    # 绛夊緟灏辩华
    wait_for_services
    echo
    
    # 鏄剧ず淇℃伅
    show_access_info
}

# 杩愯涓荤▼搴?main "$@"

