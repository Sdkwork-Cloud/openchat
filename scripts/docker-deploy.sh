#!/bin/bash
# ============================================
# OpenChat Server - Docker 部署脚本
# 版本: 1.0.0
# ============================================

set -e

# 配置
APP_NAME="OpenChat Server"
APP_VERSION="1.0.0"
DOCKER_IMAGE="openchat/server"
DOCKER_TAG="latest"
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示帮助
show_help() {
    cat << EOF
============================================
 ${APP_NAME} v${APP_VERSION} Docker 部署脚本
============================================

用法: $0 [命令] [选项]

命令:
  build              构建 Docker 镜像
  build:no-cache     构建 Docker 镜像（不使用缓存）
  up                 启动开发环境
  down               停止开发环境
  restart            重启开发环境
  logs               查看日志
  prod:up            启动生产环境
  prod:down          停止生产环境
  prod:deploy        部署生产环境（包含构建）
  push               推送镜像到仓库
  pull               拉取最新镜像
  clean              清理未使用的资源
  help               显示帮助信息

选项:
  -f, --file FILE    指定 compose 文件
  -t, --tag TAG      指定镜像标签

示例:
  $0 build                    # 构建镜像
  $0 up                       # 启动开发环境
  $0 prod:deploy              # 部署生产环境
  $0 -t v1.0.0 build          # 使用指定标签构建

EOF
}

# 构建镜像
build_image() {
    local tag="${1:-$DOCKER_TAG}"
    log_info "构建 Docker 镜像: ${DOCKER_IMAGE}:${tag}"
    
    docker build \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
        --build-arg VERSION="$APP_VERSION" \
        -t "${DOCKER_IMAGE}:${tag}" \
        -t "${DOCKER_IMAGE}:latest" \
        .
    
    log_success "镜像构建完成"
}

# 构建镜像（不使用缓存）
build_image_no_cache() {
    local tag="${1:-$DOCKER_TAG}"
    log_info "构建 Docker 镜像（不使用缓存）: ${DOCKER_IMAGE}:${tag}"
    
    docker build --no-cache \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
        --build-arg VERSION="$APP_VERSION" \
        -t "${DOCKER_IMAGE}:${tag}" \
        -t "${DOCKER_IMAGE}:latest" \
        .
    
    log_success "镜像构建完成"
}

# 启动开发环境
up_dev() {
    log_info "启动开发环境..."
    docker-compose -f "$COMPOSE_FILE" up -d
    log_success "开发环境已启动"
    log_info "服务地址: http://localhost:3000"
}

# 停止开发环境
down_dev() {
    log_info "停止开发环境..."
    docker-compose -f "$COMPOSE_FILE" down
    log_success "开发环境已停止"
}

# 重启开发环境
restart_dev() {
    log_info "重启开发环境..."
    docker-compose -f "$COMPOSE_FILE" restart
    log_success "开发环境已重启"
}

# 查看日志
show_logs() {
    docker-compose -f "$COMPOSE_FILE" logs -f
}

# 启动生产环境
up_prod() {
    log_info "启动生产环境..."
    
    # 检查环境变量文件
    if [ ! -f ".env.prod" ]; then
        log_warn "未找到 .env.prod 文件，使用默认配置"
        log_info "建议创建 .env.prod 文件并配置生产环境参数"
    fi
    
    docker-compose -f "$PROD_COMPOSE_FILE" up -d
    log_success "生产环境已启动"
}

# 停止生产环境
down_prod() {
    log_info "停止生产环境..."
    docker-compose -f "$PROD_COMPOSE_FILE" down
    log_success "生产环境已停止"
}

# 部署生产环境
deploy_prod() {
    log_info "部署生产环境..."
    
    # 构建镜像
    build_image
    
    # 停止现有服务
    down_prod
    
    # 启动新服务
    up_prod
    
    # 健康检查
    sleep 5
    health_check
    
    log_success "生产环境部署完成"
}

# 推送镜像
push_image() {
    local tag="${1:-$DOCKER_TAG}"
    log_info "推送镜像到仓库..."
    
    docker push "${DOCKER_IMAGE}:${tag}"
    docker push "${DOCKER_IMAGE}:latest"
    
    log_success "镜像推送完成"
}

# 拉取镜像
pull_image() {
    log_info "拉取最新镜像..."
    docker pull "${DOCKER_IMAGE}:latest"
    log_success "镜像拉取完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务健康状态
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "健康检查通过"
    else
        log_warn "健康检查失败，请查看日志"
        docker-compose -f "$COMPOSE_FILE" logs --tail=50
    fi
}

# 清理资源
clean_resources() {
    log_info "清理未使用的 Docker 资源..."
    
    # 停止所有容器
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    docker-compose -f "$PROD_COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    
    # 删除未使用的镜像
    docker image prune -af --filter "until=168h"
    
    # 删除未使用的卷
    docker volume prune -f
    
    # 删除未使用的网络
    docker network prune -f
    
    # 删除构建缓存
    docker builder prune -f
    
    log_success "资源清理完成"
}

# 主程序
main() {
    # 解析参数
    local tag="$DOCKER_TAG"
    local compose_file="$COMPOSE_FILE"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--tag)
                tag="$2"
                shift 2
                ;;
            -f|--file)
                compose_file="$2"
                shift 2
                ;;
            build)
                build_image "$tag"
                exit 0
                ;;
            build:no-cache)
                build_image_no_cache "$tag"
                exit 0
                ;;
            up)
                up_dev
                exit 0
                ;;
            down)
                down_dev
                exit 0
                ;;
            restart)
                restart_dev
                exit 0
                ;;
            logs)
                show_logs
                exit 0
                ;;
            prod:up)
                up_prod
                exit 0
                ;;
            prod:down)
                down_prod
                exit 0
                ;;
            prod:deploy)
                deploy_prod
                exit 0
                ;;
            push)
                push_image "$tag"
                exit 0
                ;;
            pull)
                pull_image
                exit 0
                ;;
            clean)
                clean_resources
                exit 0
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知命令: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    show_help
}

# 运行主程序
main "$@"
