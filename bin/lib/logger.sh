#!/bin/bash
# OpenChat Logger Module
# 日志输出模块

# Colors (disable if not terminal)
init_colors() {
    # Only initialize once
    if [ -n "${COLORS_INITIALIZED:-}" ]; then
        return 0
    fi
    
    if [ -t 1 ]; then
        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        BLUE='\033[0;34m'
        CYAN='\033[0;36m'
        NC='\033[0m'
    else
        RED=''
        GREEN=''
        YELLOW=''
        BLUE=''
        CYAN=''
        NC=''
    fi
    
    # Mark as initialized
    readonly COLORS_INITIALIZED=1
    
    # Export colors
    export RED GREEN YELLOW BLUE CYAN NC
}

log_info() {
    echo -e "${CYAN:-}[INFO]${NC:-} $1"
}

log_success() {
    echo -e "${GREEN:-}[SUCCESS]${NC:-} $1"
}

log_warn() {
    echo -e "${YELLOW:-}[WARN]${NC:-} $1"
}

log_error() {
    echo -e "${RED:-}[ERROR]${NC:-} $1"
}

print_header() {
    echo ""
    echo "============================================================"
    echo " $1"
    echo "============================================================"
    echo ""
}
