#!/bin/bash
# OpenChat Port Management Module
# 端口管理模块

# Check if port is available
# Returns 0 if available, 1 if in use
check_port_available() {
    local port=$1
    local host=$2

    # Validate port number
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        log_error "Invalid port number: $port (must be 1-65535)"
        return 1
    fi

    # Try different methods based on platform and available tools
    
    # Method 1: Use bash built-in (fastest, most reliable)
    if [ -e /dev/tcp ] && [ -d "/dev/tcp" ]; then
        if ! (echo > /dev/tcp/"$host"/"$port") 2>/dev/null; then
            return 0
        fi
        return 1
    fi
    
    # Method 2: Use netcat
    if command -v nc &> /dev/null; then
        # nc -z returns 0 if port is open (in use)
        if nc -z "$host" "$port" 2>/dev/null; then
            return 1
        fi
        return 0
    fi
    
    # Method 3: Use lsof
    if command -v lsof &> /dev/null; then
        if lsof -i :"$port" &> /dev/null; then
            return 1
        fi
        return 0
    fi
    
    # Method 4: Use ss (Linux)
    if command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":${port} "; then
            return 1
        fi
        return 0
    fi
    
    # Method 5: Use netstat
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
            return 1
        fi
        return 0
    fi
    
    # Fallback: assume port is available but warn
    log_warn "Cannot check port availability (no suitable tool found)"
    log_warn "Assuming port $port is available"
    return 0
}

# Find available port
# Usage: find_available_port <start_port> <host> [max_attempts]
# Returns: available port number via stdout
find_available_port() {
    local start_port=$1
    local host=$2
    local max_attempts=${3:-100}

    local port=$start_port
    local attempts=0

    # Validate start port
    if ! [[ "$start_port" =~ ^[0-9]+$ ]] || [ "$start_port" -lt 1 ] || [ "$start_port" -gt 65535 ]; then
        log_error "Invalid start port: $start_port (must be 1-65535)"
        exit 1
    fi

    # Check if we have room for max_attempts
    local max_port=65535
    if [ $((start_port + max_attempts)) -gt $max_port ]; then
        max_attempts=$((max_port - start_port))
    fi

    while [ $attempts -lt $max_attempts ]; do
        if check_port_available "$port" "$host"; then
            if [ "$port" -ne "$start_port" ]; then
                log_warn "Port $start_port is in use, using port $port"
            fi
            echo "$port"
            return 0
        fi
        
        port=$((port + 1))
        attempts=$((attempts + 1))
        
        # Safety check for port overflow
        if [ "$port" -gt 65535 ]; then
            log_error "Port number exceeded maximum (65535)"
            exit 1
        fi
    done

    log_error "Could not find available port after $max_attempts attempts starting from $start_port"
    exit 1
}
