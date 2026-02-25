#!/bin/bash
# OpenChat Help Module
# 帮助信息模块

# Show help
show_help() {
    print_header "${APP_NAME} v${APP_VERSION}"

    echo "Usage: openchat [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start       Start service (background mode)"
    echo "  stop        Stop service"
    echo "  restart     Restart service"
    echo "  status      Show service status"
    echo "  console     Run in console mode (debug)"
    echo "  health      Health check"
    echo "  logs        View real-time logs"
    echo "  clean       Clean old logs"
    echo "  help        Show help"
    echo ""
    echo "Options (Environment Variables):"
    echo "  NODE_ENV    Runtime environment (development/production)"
    echo "  PORT        Service port (default: 7200)"
    echo "  HOST        Bind address (default: 0.0.0.0)"
    echo ""
    echo "Examples:"
    echo "  ./bin/openchat start"
    echo "  PORT=8080 ./bin/openchat start"
    echo "  NODE_ENV=development ./bin/openchat console"
    echo "  ./bin/openchat stop"
    echo "  ./bin/openchat status"
    echo ""
    echo "Installation:"
    echo "  Directory: $APP_HOME"
    echo "  Platform: $PLATFORM"
}
