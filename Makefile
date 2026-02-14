# ============================================
# OpenChat Server - Makefile
# 便捷部署和管理命令
# ============================================

.PHONY: help install start stop restart status logs clean update \
        dev test prod external health \
        db-backup db-restore db-migrate \
        docker-build docker-push docker-logs \
        test-unit test-e2e test-cov \
        lint format

# 默认目标
.DEFAULT_GOAL := help

# ============================================
# 帮助信息
# ============================================
help:
	@echo "OpenChat Server - 可用命令:"
	@echo ""
	@echo "  安装部署:"
	@echo "    make install        - 安装并启动所有服务"
	@echo "    make start          - 启动服务"
	@echo "    make stop           - 停止服务"
	@echo "    make restart        - 重启服务"
	@echo "    make status         - 查看服务状态"
	@echo "    make logs           - 查看日志"
	@echo "    make clean          - 清理所有数据"
	@echo "    make update         - 更新并重启"
	@echo ""
	@echo "  环境部署:"
	@echo "    make dev            - 开发环境部署"
	@echo "    make test-env       - 测试环境部署"
	@echo "    make prod           - 生产环境部署"
	@echo "    make external       - 使用外部服务部署"
	@echo ""
	@echo "  健康检查:"
	@echo "    make health         - 快速健康检查"
	@echo "    make health-full    - 完整诊断"
	@echo ""
	@echo "  数据库:"
	@echo "    make db-backup      - 备份数据库"
	@echo "    make db-restore     - 恢复数据库"
	@echo "    make db-migrate     - 运行迁移"
	@echo ""
	@echo "  Docker:"
	@echo "    make docker-build   - 构建 Docker 镜像"
	@echo "    make docker-push    - 推送 Docker 镜像"
	@echo "    make docker-logs    - 查看 Docker 日志"
	@echo ""
	@echo "  测试:"
	@echo "    make test-unit      - 运行单元测试"
	@echo "    make test-e2e       - 运行 E2E 测试"
	@echo "    make test-cov       - 测试覆盖率"
	@echo ""
	@echo "  代码质量:"
	@echo "    make lint           - 代码检查"
	@echo "    make format         - 代码格式化"

# ============================================
# 安装部署
# ============================================
install:
	@echo "安装并启动所有服务..."
	./scripts/docker-deploy.sh install

start:
	@echo "启动服务..."
	./scripts/docker-deploy.sh start

stop:
	@echo "停止服务..."
	./scripts/docker-deploy.sh stop

restart:
	@echo "重启服务..."
	./scripts/docker-deploy.sh restart

status:
	@echo "查看服务状态..."
	./scripts/docker-deploy.sh status

logs:
	./scripts/docker-deploy.sh logs

clean:
	@echo "清理所有数据..."
	./scripts/docker-deploy.sh clean

update:
	@echo "更新并重启..."
	./scripts/docker-deploy.sh update

# ============================================
# 环境部署
# ============================================
dev:
	@echo "开发环境部署..."
	cp .env.development .env
	./scripts/docker-deploy.sh install

test-env:
	@echo "测试环境部署..."
	cp .env.test .env
	./scripts/docker-deploy.sh start -e .env.test

prod:
	@echo "生产环境部署..."
	@if [ ! -f .env ]; then \
		cp .env.production .env; \
		echo "已创建 .env 文件，请编辑配置后重新运行"; \
		exit 1; \
	fi
	docker compose -f docker-compose.prod.yml pull
	docker compose -f docker-compose.prod.yml up -d
	./scripts/health-check.sh full

external:
	@echo "使用外部服务部署..."
	./scripts/docker-deploy.sh external

# ============================================
# 健康检查
# ============================================
health:
	@echo "快速健康检查..."
	./scripts/health-check.sh quick

health-full:
	@echo "完整诊断..."
	./scripts/health-check.sh full

# ============================================
# 数据库
# ============================================
db-backup:
	@echo "备份数据库..."
	@mkdir -p backups
	docker exec openchat-postgres pg_dump -U openchat openchat > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "备份完成: backups/backup_$$(date +%Y%m%d_%H%M%S).sql"

db-restore:
	@echo "恢复数据库..."
	@echo "请指定备份文件: make db-restore FILE=backups/backup_xxx.sql"
	@if [ -z "$(FILE)" ]; then \
		echo "错误: 未指定备份文件"; \
		exit 1; \
	fi
	cat $(FILE) | docker exec -i openchat-postgres psql -U openchat openchat
	@echo "恢复完成"

db-migrate:
	@echo "运行数据库迁移..."
	docker exec -it openchat npm run migration:run

# ============================================
# Docker
# ============================================
docker-build:
	@echo "构建 Docker 镜像..."
	docker build -t openchat/server:latest .

docker-push:
	@echo "推送 Docker 镜像..."
	docker push openchat/server:latest

docker-logs:
	docker compose logs -f

# ============================================
# 测试
# ============================================
test-unit:
	@echo "运行单元测试..."
	pnpm test

test-e2e:
	@echo "运行 E2E 测试..."
	pnpm test:e2e

test-cov:
	@echo "测试覆盖率..."
	pnpm test:cov

# ============================================
# 代码质量
# ============================================
lint:
	@echo "代码检查..."
	pnpm lint

format:
	@echo "代码格式化..."
	pnpm format

# ============================================
# 开发
# ============================================
dev-local:
	@echo "本地开发模式..."
	pnpm install
	pnpm start:dev

dev-db:
	@echo "启动开发数据库..."
	docker compose --profile database --profile cache up -d

# ============================================
# 快捷命令
# ============================================
ps:
	docker compose ps

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

pull:
	docker compose pull

# 进入容器
shell-app:
	docker exec -it openchat sh

shell-db:
	docker exec -it openchat-postgres psql -U openchat -d openchat

shell-redis:
	docker exec -it openchat-redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2)

# 查看资源
stats:
	docker stats --no-stream
