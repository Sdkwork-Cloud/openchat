#!/bin/bash
# OpenChat Process Management Module
# 进程管理模块

# Check Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js (https://nodejs.org/)"
        log_error "Make sure 'node' command is available in PATH"
        exit 1
    fi

    # Check node version (minimum v16)
    local node_version
    node_version=$(node --version 2>/dev/null | sed 's/v//')
    if [ -z "$node_version" ]; then
        log_error "Failed to get Node.js version"
        exit 1
    fi
    
    log_info "Node.js version: v$node_version"
    
    # Extract major version
    local major_version
    major_version=$(echo "$node_version" | cut -d. -f1)
    if [ "$major_version" -lt 16 ]; then
        log_warn "Node.js version $node_version is older than recommended (v16+)"
    fi
}

# Check if service is running
# Returns 0 if running, 1 if not
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null | tr -d '[:space:]')
        if [ -n "$pid" ]; then
            # Check if it's a valid number
            if ! [[ "$pid" =~ ^[0-9]+$ ]]; then
                log_warn "Invalid PID in PID file: $pid"
                rm -f "$PID_FILE"
                return 1
            fi
            
            # Check if process exists
            if kill -0 "$pid" 2>/dev/null; then
                return 0
            else
                # Process doesn't exist, clean up stale PID file
                log_warn "Stale PID file found (PID: $pid), cleaning up..."
                rm -f "$PID_FILE"
                return 1
            fi
        else
            # Empty PID file
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Create necessary directories
ensure_directories() {
    local dirs=("$LOG_DIR" "$DATA_DIR" "${APP_HOME}/var/run")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            if ! mkdir -p "$dir" 2>/dev/null; then
                log_error "Failed to create directory: $dir"
                log_error "Please check permissions"
                exit 1
            fi
        fi
    done
}

# Get process info
# Usage: get_process_info <pid>
get_process_info() {
    local pid=$1
    local info=""
    
    if [ -z "$pid" ] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        echo ""
        return 1
    fi
    
    if command -v ps &> /dev/null; then
        info=$(ps -p "$pid" -o comm= 2>/dev/null | head -1)
    fi
    
    echo "$info"
}

# Get memory usage in MB
# Usage: get_memory_usage <pid>
get_memory_usage() {
    local pid=$1
    local mem=""
    
    if [ -z "$pid" ] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        echo ""
        return 1
    fi
    
    if command -v ps &> /dev/null; then
        # Try different ps formats for cross-platform compatibility
        # Linux format
        mem=$(ps -p "$pid" -o rss= 2>/dev/null | awk '{printf "%.2f MB", $1/1024}')
        
        # If empty, try macOS format
        if [ -z "$mem" ]; then
            mem=$(ps -p "$pid" -o rssize= 2>/dev/null | awk '{printf "%.2f MB", $1/1024}')
        fi
    fi
    
    echo "$mem"
}

# Get CPU usage percentage
# Usage: get_cpu_usage <pid>
get_cpu_usage() {
    local pid=$1
    local cpu=""
    
    if [ -z "$pid" ] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        echo ""
        return 1
    fi
    
    if command -v ps &> /dev/null; then
        cpu=$(ps -p "$pid" -o %cpu= 2>/dev/null | tr -d ' ')
        if [ -n "$cpu" ]; then
            cpu="${cpu}%"
        fi
    fi
    
    echo "$cpu"
}

# Get listening ports
# Usage: get_listening_ports <pid>
get_listening_ports() {
    local pid=$1
    local ports=""
    
    if [ -z "$pid" ] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        echo ""
        return 1
    fi
    
    # Try lsof first (most reliable)
    if command -v lsof &> /dev/null; then
        ports=$(lsof -Pan -p "$pid" -i 2>/dev/null | grep LISTEN | awk '{print $9}' | sed 's/.*://' | sort -u)
    fi
    
    # Fallback to ss
    if [ -z "$ports" ] && command -v ss &> /dev/null; then
        ports=$(ss -tulnp 2>/dev/null | grep "pid=$pid," | awk '{print $5}' | sed 's/.*://' | sort -u)
    fi
    
    # Fallback to netstat
    if [ -z "$ports" ] && command -v netstat &> /dev/null; then
        ports=$(netstat -tulnp 2>/dev/null | grep "/$pid " | awk '{print $4}' | sed 's/.*://' | sort -u)
    fi
    
    echo "$ports"
}

# Get process uptime
# Usage: get_process_uptime <pid>
get_process_uptime() {
    local pid=$1
    local uptime=""
    
    if [ -z "$pid" ] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        echo ""
        return 1
    fi
    
    if command -v ps &> /dev/null; then
        # Try etime format (Linux)
        uptime=$(ps -p "$pid" -o etime= 2>/dev/null | tr -d ' ')
        
        # If empty, try lstart format and calculate
        if [ -z "$uptime" ]; then
            local start_time
            start_time=$(ps -p "$pid" -o lstart= 2>/dev/null)
            if [ -n "$start_time" ]; then
                uptime="running"
            fi
        fi
    fi
    
    echo "$uptime"
}
