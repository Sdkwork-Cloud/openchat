#!/bin/bash
# OpenChat Configuration Module
# 配置模块

# Application info - exported for use in other modules
readonly APP_NAME="OpenChat"
readonly APP_VERSION="1.1.0"
export APP_NAME
export APP_VERSION

# Get script directory (works with symlinks)
get_script_dir() {
    local source="${BASH_SOURCE[0]}"
    local dir

    # Resolve symlinks
    while [ -L "$source" ]; do
        dir="$(cd "$(dirname "$source")" && pwd)"
        source="$(readlink "$source")"
        [[ $source != /* ]] && source="$dir/$source"
    done

    dir="$(cd "$(dirname "$source")" && pwd)"
    echo "$dir"
}

# Platform detection
detect_platform() {
    case "$(uname -s)" in
        Linux*)     PLATFORM=Linux ;;
        Darwin*)    PLATFORM=MacOS ;;
        CYGWIN*)    PLATFORM=Cygwin ;;
        MINGW*)     PLATFORM=MinGw ;;
        MSYS*)      PLATFORM=MSYS ;;
        *)          PLATFORM=Unknown ;;
    esac
}

# Initialize paths
init_config() {
    local script_dir
    script_dir="$(get_script_dir)"
    
    readonly SCRIPT_DIR="$script_dir"
    readonly APP_HOME="$(cd "$SCRIPT_DIR/.." && pwd)"
    
    # Configuration paths
    readonly CONFIG_FILE="${APP_HOME}/etc/config.json"
    readonly PID_FILE="${APP_HOME}/var/run/openchat.pid"
    readonly LOG_DIR="${APP_HOME}/var/logs"
    readonly DATA_DIR="${APP_HOME}/var/data"
    readonly ERROR_LOG="${APP_HOME}/error.log"
    readonly MAIN_JS="${APP_HOME}/dist/main.js"
    
    # Default configuration
    readonly DEFAULT_NODE_ENV="${NODE_ENV:-production}"
    readonly DEFAULT_PORT="${PORT:-7200}"
    readonly DEFAULT_HOST="${HOST:-0.0.0.0}"
    
    # Detect platform
    detect_platform
    
    # Export for use in other modules
    export APP_HOME
    export PLATFORM
    export LOG_DIR
    export DATA_DIR
    export PID_FILE
    export ERROR_LOG
    export MAIN_JS
    export SCRIPT_DIR
    export CONFIG_FILE
    export DEFAULT_NODE_ENV
    export DEFAULT_PORT
    export DEFAULT_HOST
}

# Validate installation
validate_installation() {
    if [ ! -f "$MAIN_JS" ]; then
        echo "[ERROR] Invalid OpenChat installation directory: $APP_HOME"
        echo "[ERROR] Main program not found: $MAIN_JS"
        echo "[ERROR] Please run this script from the OpenChat installation directory."
        exit 1
    fi
}
