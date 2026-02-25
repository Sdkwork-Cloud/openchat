#!/bin/bash
# OpenChat Log Management Module
# 日志管理模块

# Show logs
show_logs() {
    local stdout_log="${LOG_DIR}/stdout.log"
    if [ -f "$stdout_log" ]; then
        log_info "Viewing log file: $stdout_log"
        log_info "Press Ctrl+C to exit log view"
        tail -f "$stdout_log"
    else
        log_warn "Log file not found: $stdout_log"
        log_info "The service may not have been started yet."
    fi
}

# Clean old logs
clean_logs() {
    log_info "Cleaning log files..."

    local count=0
    while IFS= read -r -d '' file; do
        rm -f "$file"
        count=$((count + 1))
    done < <(find "$LOG_DIR" -name "*.log" -type f -mtime +7 -print0 2>/dev/null)

    if [ $count -gt 0 ]; then
        log_success "Cleaned $count old log files"
    else
        log_info "No old log files to clean"
    fi
}
