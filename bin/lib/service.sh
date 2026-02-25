#!/bin/bash
# OpenChat Service Control Module
# 服务控制模块

# Start service
start_service() {
    local port=$1
    local host=$2
    local node_env=$3
    
    check_node

    if is_running; then
        local current_pid
        current_pid=$(cat "$PID_FILE" 2>/dev/null || echo "unknown")
        log_warn "${APP_NAME} service is already running (PID: $current_pid)"
        exit 1
    fi

    log_info "Starting ${APP_NAME}..."
    ensure_directories

    # Find available port
    local available_port
    available_port=$(find_available_port "$port" "$host")

    # Set environment variables
    export OPENCHAT_HOME="$APP_HOME"
    export OPENCHAT_CONFIG="${APP_HOME}/etc/config.json"
    export OPENCHAT_LOG_DIR="$LOG_DIR"
    export OPENCHAT_DATA_DIR="$DATA_DIR"
    export NODE_ENV="$node_env"
    export PORT="$available_port"
    export HOST="$host"

    # Clear error log
    > "$ERROR_LOG" 2>/dev/null || true

    # Save current directory
    local original_dir
    original_dir=$(pwd)

    # Start service (background)
    cd "$APP_HOME" || {
        log_error "Failed to change directory to: $APP_HOME"
        exit 1
    }

    # Use nohup on Unix-like systems
    if [ "$PLATFORM" = "Linux" ] || [ "$PLATFORM" = "MacOS" ]; then
        nohup node "$MAIN_JS" > "${LOG_DIR}/stdout.log" 2>&1 &
    else
        # For Windows Git Bash/MSYS
        node "$MAIN_JS" > "${LOG_DIR}/stdout.log" 2>&1 &
    fi

    PID=$!

    # Save PID
    echo $PID > "$PID_FILE"

    log_info "Waiting for service to start..."
    sleep 3

    if kill -0 "$PID" 2>/dev/null; then
        log_success "${APP_NAME} service started, PID: $PID"
        log_info "Log file: ${LOG_DIR}/stdout.log"
        log_info "Error log: $ERROR_LOG"
        log_info "Access URL: http://${host}:${available_port}"

        # Check for successful startup in logs
        if [ -f "${LOG_DIR}/stdout.log" ]; then
            if grep -q "Server.*Started\|OpenChat.*Started\|Listening\|started successfully" "${LOG_DIR}/stdout.log" 2>/dev/null; then
                log_success "Service startup completed successfully"
            fi
        fi
    else
        log_error "${APP_NAME} service failed to start"
        if [ -s "$ERROR_LOG" ]; then
            log_error "Error log content:"
            cat "$ERROR_LOG"
        elif [ -f "${LOG_DIR}/stdout.log" ]; then
            log_error "Stdout log content (last 20 lines):"
            tail -20 "${LOG_DIR}/stdout.log"
        fi
        rm -f "$PID_FILE"
        cd "$original_dir" || true
        exit 1
    fi

    # Restore directory
    cd "$original_dir" || true
}

# Stop service
stop_service() {
    print_header "Stopping ${APP_NAME}"

    if ! is_running; then
        log_warn "${APP_NAME} service is not running"
        rm -f "$PID_FILE"
        return 0
    fi

    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null)
    
    if [ -z "$pid" ]; then
        log_warn "PID file is empty, cleaning up..."
        rm -f "$PID_FILE"
        return 0
    fi
    
    log_info "Stopping service (PID: $pid)..."

    # Try graceful shutdown
    if ! kill "$pid" 2>/dev/null; then
        log_warn "Failed to send graceful shutdown signal"
    fi
    
    sleep 2

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        log_warn "Service not responding, force stopping..."
        if ! kill -9 "$pid" 2>/dev/null; then
            log_error "Failed to force stop the service"
        fi
    fi

    # Verify process is stopped
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        log_error "Failed to stop service (PID: $pid)"
        return 1
    fi

    rm -f "$PID_FILE"
    log_success "${APP_NAME} service stopped"
}

# Restart service
restart_service() {
    local port=$1
    local host=$2
    local node_env=$3
    
    print_header "Restarting ${APP_NAME}"
    stop_service || true
    sleep 2
    start_service "$port" "$host" "$node_env"
}

# Show status
show_status() {
    print_header "${APP_NAME} Status"

    log_info "Installation directory: $APP_HOME"
    log_info "Platform: $PLATFORM"

    if is_running; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null)
        log_success "Service status: Running"
        log_info "Process PID: $pid"

        # Get process info
        local proc_name
        proc_name=$(get_process_info "$pid")
        if [ -n "$proc_name" ]; then
            log_info "Process name: $proc_name"
        fi

        # Get memory usage
        local mem_usage
        mem_usage=$(get_memory_usage "$pid")
        if [ -n "$mem_usage" ]; then
            log_info "Memory usage: $mem_usage"
        fi

        # Get CPU usage
        local cpu_usage
        cpu_usage=$(get_cpu_usage "$pid")
        if [ -n "$cpu_usage" ]; then
            log_info "CPU usage: $cpu_usage"
        fi

        # Get process uptime
        local uptime
        uptime=$(get_process_uptime "$pid")
        if [ -n "$uptime" ]; then
            log_info "Uptime: $uptime"
        fi

        # Check listening ports
        local ports
        ports=$(get_listening_ports "$pid")
        if [ -n "$ports" ]; then
            log_info "Listening ports:"
            echo "$ports" | while read -r p; do
                if [ -n "$p" ]; then
                    echo "  - $p"
                fi
            done
        fi
    else
        log_warn "Service status: Not running"
        rm -f "$PID_FILE"
    fi
}

# Console mode (foreground)
console_service() {
    local port=$1
    local host=$2
    
    check_node

    if is_running; then
        log_warn "${APP_NAME} service is already running"
        log_warn "Please stop the service first: openchat stop"
        exit 1
    fi

    print_header "Running ${APP_NAME} in console mode"
    log_info "Starting in console mode (Press Ctrl+C to stop)..."
    ensure_directories

    # Find available port
    local available_port
    available_port=$(find_available_port "$port" "$host")

    # Save current directory
    local original_dir
    original_dir=$(pwd)

    export OPENCHAT_HOME="$APP_HOME"
    export OPENCHAT_CONFIG="${APP_HOME}/etc/config.json"
    export OPENCHAT_LOG_DIR="$LOG_DIR"
    export OPENCHAT_DATA_DIR="$DATA_DIR"
    export NODE_ENV="development"
    export PORT="$available_port"
    export HOST="$host"

    # Clear error log
    > "$ERROR_LOG" 2>/dev/null || true

    cd "$APP_HOME" || {
        log_error "Failed to change directory to: $APP_HOME"
        exit 1
    }
    
    # Run in foreground
    node "$MAIN_JS"
    local exit_code=$?

    # Restore directory
    cd "$original_dir" || true
    
    return $exit_code
}

# Health check
health_check() {
    local host=$1
    local port=$2
    
    if ! is_running; then
        log_error "${APP_NAME} service is not running"
        exit 1
    fi

    log_info "Checking service health..."

    local health_url="http://${host}:${port}/health"
    
    if command -v curl &> /dev/null; then
        if curl -sf "$health_url" > /dev/null 2>&1; then
            log_success "Health check passed"
        else
            log_warn "Health check failed (HTTP error)"
        fi
    elif command -v wget &> /dev/null; then
        if wget -q "$health_url" -O /dev/null 2>/dev/null; then
            log_success "Health check passed"
        else
            log_warn "Health check failed (HTTP error)"
        fi
    else
        log_warn "Neither curl nor wget found, cannot perform health check"
    fi
}
