#!/bin/bash
# ============================================
# OpenChat - 数据库初始化脚本
# 支持多种数据库场景
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  --host HOST       数据库主机 (默认: localhost)"
    echo "  --port PORT       数据库端口 (默认: 5432)"
    echo "  --user USER       数据库用户 (默认: postgres)"
    echo "  --password PASS   数据库密码"
    echo "  --database NAME   数据库名称 (默认: openchat)"
    echo "  --create-db       创建数据库（如果不存在）"
    echo "  --create-user     创建用户（如果不存在）"
    echo "  --reset           重置数据库（删除并重建）"
    echo "  --seed            填充测试数据"
    echo "  --docker          使用 Docker 容器中的数据库"
    echo "  --help, -h        显示帮助信息"
    echo
    echo "示例:"
    echo "  $0 --create-db --create-user"
    echo "  $0 --reset --seed"
    echo "  $0 --docker --create-db"
    echo
}

# 默认配置
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD=""
DB_NAME="openchat"
APP_USER="openchat"
APP_PASSWORD=""
CREATE_DB=false
CREATE_USER=false
RESET_DB=false
SEED_DATA=false
USE_DOCKER=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --create-db)
            CREATE_DB=true
            shift
            ;;
        --create-user)
            CREATE_USER=true
            shift
            ;;
        --reset)
            RESET_DB=true
            shift
            ;;
        --seed)
            SEED_DATA=true
            shift
            ;;
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 设置 PGPASSWORD
export PGPASSWORD="$DB_PASSWORD"

# 执行 SQL 命令
exec_sql() {
    local sql="$1"
    local db="${2:-postgres}"
    
    if [ "$USE_DOCKER" = true ]; then
        docker compose exec -T postgres psql -U "$DB_USER" -d "$db" -c "$sql"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -c "$sql"
    fi
}

# 执行 SQL 文件
exec_sql_file() {
    local file="$1"
    local db="${2:-$DB_NAME}"
    
    if [ "$USE_DOCKER" = true ]; then
        docker compose exec -T postgres psql -U "$DB_USER" -d "$db" -f "$file"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$file"
    fi
}

# 检查数据库连接
check_connection() {
    log_info "检查数据库连接..."
    
    if exec_sql "SELECT 1" &> /dev/null; then
        log_success "数据库连接成功"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 创建用户
create_user() {
    log_info "创建数据库用户: $APP_USER"
    
    # 生成随机密码
    if [ -z "$APP_PASSWORD" ]; then
        APP_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 24)
    fi
    
    # 检查用户是否存在
    local user_exists=$(exec_sql "SELECT 1 FROM pg_roles WHERE rolname='$APP_USER'" | grep -c "1")
    
    if [ "$user_exists" -gt 0 ]; then
        log_warn "用户 $APP_USER 已存在"
    else
        exec_sql "CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD'"
        log_success "用户 $APP_USER 创建成功"
    fi
    
    echo
    echo -e "${YELLOW}数据库用户信息:${NC}"
    echo "  用户名: $APP_USER"
    echo "  密码: $APP_PASSWORD"
    echo
}

# 创建数据库
create_database() {
    log_info "创建数据库: $DB_NAME"
    
    # 检查数据库是否存在
    local db_exists=$(exec_sql "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -c "1")
    
    if [ "$db_exists" -gt 0 ]; then
        log_warn "数据库 $DB_NAME 已存在"
    else
        exec_sql "CREATE DATABASE $DB_NAME OWNER $APP_USER"
        log_success "数据库 $DB_NAME 创建成功"
    fi
    
    # 授权
    exec_sql "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $APP_USER"
    log_success "权限授予成功"
}

# 重置数据库
reset_database() {
    log_warn "重置数据库: $DB_NAME"
    log_warn "警告: 这将删除所有数据!"
    
    read -p "确认重置数据库? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "已取消"
        return 0
    fi
    
    # 断开所有连接
    exec_sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid()"
    
    # 删除并重建数据库
    exec_sql "DROP DATABASE IF EXISTS $DB_NAME"
    exec_sql "CREATE DATABASE $DB_NAME OWNER $APP_USER"
    exec_sql "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $APP_USER"
    
    log_success "数据库重置成功"
}

# 初始化表结构
init_schema() {
    log_info "初始化表结构..."
    
    if [ -f "database/schema.sql" ]; then
        exec_sql_file "database/schema.sql"
        log_success "表结构初始化成功"
    else
        log_error "未找到 database/schema.sql 文件"
        return 1
    fi
}

# 填充测试数据
seed_data() {
    log_info "填充测试数据..."
    
    if [ -f "database/seed.sql" ]; then
        exec_sql_file "database/seed.sql"
        log_success "测试数据填充成功"
    else
        log_warn "未找到 database/seed.sql 文件，跳过"
    fi
}

# 创建索引优化
create_indexes() {
    log_info "创建优化索引..."
    
    if [ -f "database/indexes-optimization.sql" ]; then
        exec_sql_file "database/indexes-optimization.sql"
        log_success "索引创建成功"
    else
        log_warn "未找到 database/indexes-optimization.sql 文件，跳过"
    fi
}

# 显示数据库信息
show_info() {
    echo
    echo -e "${GREEN}数据库信息:${NC}"
    echo "  主机: $DB_HOST:$DB_PORT"
    echo "  数据库: $DB_NAME"
    echo "  用户: $APP_USER"
    
    # 显示表数量
    local table_count=$(exec_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" "$DB_NAME" | tail -1 | tr -d ' ')
    echo "  表数量: $table_count"
    
    # 显示数据库大小
    local db_size=$(exec_sql "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))" | tail -1 | tr -d ' ')
    echo "  数据库大小: $db_size"
    echo
}

# 主程序
main() {
    log_info "OpenChat 数据库初始化脚本"
    echo
    
    # 检查连接
    if ! check_connection; then
        exit 1
    fi
    
    # 创建用户
    if [ "$CREATE_USER" = true ]; then
        create_user
    fi
    
    # 创建数据库
    if [ "$CREATE_DB" = true ]; then
        create_database
    fi
    
    # 重置数据库
    if [ "$RESET_DB" = true ]; then
        reset_database
    fi
    
    # 初始化表结构
    init_schema
    
    # 创建索引
    create_indexes
    
    # 填充测试数据
    if [ "$SEED_DATA" = true ]; then
        seed_data
    fi
    
    # 显示信息
    show_info
    
    log_success "数据库初始化完成"
}

# 运行主程序
main
