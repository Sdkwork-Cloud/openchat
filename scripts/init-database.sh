#!/bin/bash
# ============================================
# OpenChat 数据库初始化脚本
# 用法: ./init-database.sh [dev|test|prod]
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认环境
ENV=${1:-dev}

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  OpenChat 数据库初始化脚本${NC}"
echo -e "${BLUE}  环境: ${ENV}${NC}"
echo -e "${BLUE}============================================${NC}"

# 检查环境文件
ENV_FILE=".env.${ENV}"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 找不到环境配置文件 ${ENV_FILE}${NC}"
    echo -e "${YELLOW}请先复制模板文件:${NC}"
    echo -e "  cp .env.development .env.dev"
    echo -e "  cp .env.test .env.test"
    echo -e "  cp .env.production .env.prod"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 显示配置信息
echo -e "${GREEN}数据库配置:${NC}"
echo -e "  主机: ${DB_HOST}"
echo -e "  端口: ${DB_PORT:-5432}"
echo -e "  用户: ${DB_USERNAME}"
echo -e "  数据库: ${DB_NAME}"
echo ""

# 确认操作
read -p "确认要初始化数据库吗? 这将删除所有现有数据! (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

# 设置 PGPASSWORD
export PGPASSWORD="${DB_PASSWORD}"

echo -e "${BLUE}步骤 1/5: 测试数据库连接...${NC}"
if psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
    echo -e "${YELLOW}请检查数据库配置和网络连接${NC}"
    exit 1
fi

echo -e "${BLUE}步骤 2/5: 创建数据库（如果不存在）...${NC}"
psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
echo -e "${GREEN}✓ 数据库已就绪${NC}"

echo -e "${BLUE}步骤 3/5: 执行数据库架构...${NC}"
if [ -f "database/schema.sql" ]; then
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -f database/schema.sql
    echo -e "${GREEN}✓ 数据库架构已创建${NC}"
else
    echo -e "${RED}✗ 找不到 database/schema.sql${NC}"
    exit 1
fi

echo -e "${BLUE}步骤 4/5: 执行数据库迁移...${NC}"
if [ -d "database/migrations" ]; then
    for migration in database/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo -e "  执行: ${migration}"
            psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -f "$migration"
        fi
    done
    echo -e "${GREEN}✓ 数据库迁移已完成${NC}"
else
    echo -e "${YELLOW}! 没有迁移文件${NC}"
fi

echo -e "${BLUE}步骤 5/5: 插入种子数据...${NC}"
if [ "$ENV" != "prod" ]; then
    if [ -f "database/seed.sql" ]; then
        read -p "是否插入测试数据? (yes/no): " seed_confirm
        if [ "$seed_confirm" == "yes" ]; then
            psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -f database/seed.sql
            echo -e "${GREEN}✓ 测试数据已插入${NC}"
        else
            echo -e "${YELLOW}! 跳过测试数据${NC}"
        fi
    fi
else
    echo -e "${YELLOW}! 生产环境跳过测试数据${NC}"
fi

# 执行索引优化
if [ -f "database/indexes-optimization.sql" ]; then
    echo -e "${BLUE}执行索引优化...${NC}"
    psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_NAME}" -f database/indexes-optimization.sql
    echo -e "${GREEN}✓ 索引优化完成${NC}"
fi

# 清理
unset PGPASSWORD

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  数据库初始化完成!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "下一步:"
echo -e "  1. 检查数据库: psql -h ${DB_HOST} -U ${DB_USERNAME} -d ${DB_NAME}"
echo -e "  2. 启动服务: pnpm start:${ENV}"
echo ""
