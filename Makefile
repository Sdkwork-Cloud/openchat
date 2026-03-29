# ============================================
# OpenChat Server - Makefile
# 便捷部署和管理命令
# ============================================

.PHONY: help install start stop restart status logs clean update \
        dev test-env prod external health health-full \
        db-init db-patch db-backup db-restore db-migrate \
        docker-build docker-push docker-logs \
        test-unit test-e2e test-cov \
        lint format dev-local dev-db \
        runtime-start runtime-stop runtime-restart runtime-status runtime-health deploy-standalone \
        ps up down build pull shell-app shell-db shell-redis stats

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
	@echo "    make deploy-standalone - 宿主机部署 (ENV=production|test|development)"
	@echo "    make external       - 使用外部服务部署"
	@echo ""
	@echo "  健康检查:"
	@echo "    make health         - 快速健康检查"
	@echo "    make health-full    - 完整诊断"
	@echo ""
	@echo "  数据库:"
	@echo "    make db-init        - 初始化数据库 (ENV=development|test|production, SEED=1)"
	@echo "    make db-patch       - 应用数据库补丁 (ENV=development|test|production)"
	@echo "    make db-backup      - 备份数据库"
	@echo "    make db-restore     - 恢复数据库"
	@echo "    make db-migrate     - 运行迁移"
	@echo ""
	@echo "  运行时:"
	@echo "    make runtime-start  - 安全启动宿主机运行时"
	@echo "    make runtime-stop   - 安全停止宿主机运行时"
	@echo "    make runtime-restart - 重启宿主机运行时"
	@echo "    make runtime-status - 查看宿主机运行时状态"
	@echo "    make runtime-health - 查看宿主机运行时健康状态"
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
	@if [ ! -f .env.development ]; then \
		cp .env.example .env.development; \
		echo "已创建 .env.development，请编辑后重新运行"; \
		exit 1; \
	fi
	docker compose --env-file .env.development --profile database --profile cache --profile im up -d

test-env:
	@echo "测试环境部署..."
	@if [ ! -f .env.test ]; then \
		cp .env.example .env.test; \
		echo "已创建 .env.test，请编辑后重新运行"; \
		exit 1; \
	fi
	docker compose --env-file .env.test --profile database --profile cache up -d

prod:
	@echo "生产环境部署..."
	@if [ ! -f .env.production ]; then \
		cp .env.example .env.production; \
		echo "已创建 .env.production，请编辑后重新运行"; \
		exit 1; \
	fi
	docker compose --env-file .env.production -f docker-compose.prod.yml pull
	docker compose --env-file .env.production -f docker-compose.prod.yml up -d
	OPENCHAT_ENV_FILE=.env.production ./scripts/health-check.sh full

external:
	@echo "使用外部服务部署..."
	./scripts/docker-deploy.sh external

deploy-standalone:
	@echo "宿主机部署..."
	./scripts/deploy-server.sh $${ENV:-production} --db-action $${DB_ACTION:-auto} --yes \
		$${SERVICE:+--service} \
		$${HOST:+--host $$HOST} \
		$${PORT:+--port $$PORT} \
		$${HEALTH_HOST:+--health-host $$HEALTH_HOST} \
		$${HEALTH_TIMEOUT_MS:+--health-timeout-ms $$HEALTH_TIMEOUT_MS} \
		$${SHUTDOWN_TIMEOUT_MS:+--shutdown-timeout-ms $$SHUTDOWN_TIMEOUT_MS} \
		$${STRICT_PORT:+--strict-port $$STRICT_PORT} \
		$${SKIP_HEALTH_CHECK:+--skip-health-check $$SKIP_HEALTH_CHECK} \
		$${FORCE_STOP:+--force-stop $$FORCE_STOP} \
		$${SERVICE_USER:+--service-user $$SERVICE_USER} \
		$${SERVICE_GROUP:+--service-group $$SERVICE_GROUP}

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
db-init:
	@echo "初始化数据库..."
	./scripts/init-database.sh $${ENV:-development} --yes $${SEED:+--seed}

db-patch:
	@echo "应用数据库补丁..."
	./scripts/apply-db-patches.sh $${ENV:-development}

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
	@echo "应用数据库补丁..."
	$(MAKE) db-patch ENV=$${ENV:-production}

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
	npm run test

test-e2e:
	@echo "运行 E2E 测试..."
	npm run test:e2e

test-cov:
	@echo "测试覆盖率..."
	npm run test:cov

# ============================================
# 代码质量
# ============================================
lint:
	@echo "代码检查..."
	npm run lint

format:
	@echo "代码格式化..."
	npm run format

# ============================================
# 开发
# ============================================
dev-local:
	@echo "本地开发模式..."
	npm ci
	npm run start:dev

dev-db:
	@echo "启动开发数据库..."
	docker compose --profile database --profile cache up -d

runtime-start:
	@echo "启动宿主机运行时..."
	./bin/openchat start --environment $${ENV:-production} \
		$${HOST:+--host $$HOST} \
		$${PORT:+--port $$PORT} \
		$${HEALTH_HOST:+--health-host $$HEALTH_HOST} \
		$${HEALTH_TIMEOUT_MS:+--health-timeout-ms $$HEALTH_TIMEOUT_MS} \
		$${STRICT_PORT:+--strict-port $$STRICT_PORT} \
		$${SKIP_HEALTH_CHECK:+--skip-health-check $$SKIP_HEALTH_CHECK}

runtime-stop:
	@echo "停止宿主机运行时..."
	./bin/openchat stop --environment $${ENV:-production} \
		$${SHUTDOWN_TIMEOUT_MS:+--shutdown-timeout-ms $$SHUTDOWN_TIMEOUT_MS} \
		$${FORCE_STOP:+--force-stop $$FORCE_STOP}

runtime-restart:
	@echo "重启宿主机运行时..."
	./bin/openchat restart --environment $${ENV:-production} \
		$${HOST:+--host $$HOST} \
		$${PORT:+--port $$PORT} \
		$${HEALTH_HOST:+--health-host $$HEALTH_HOST} \
		$${HEALTH_TIMEOUT_MS:+--health-timeout-ms $$HEALTH_TIMEOUT_MS} \
		$${SHUTDOWN_TIMEOUT_MS:+--shutdown-timeout-ms $$SHUTDOWN_TIMEOUT_MS} \
		$${STRICT_PORT:+--strict-port $$STRICT_PORT} \
		$${SKIP_HEALTH_CHECK:+--skip-health-check $$SKIP_HEALTH_CHECK} \
		$${FORCE_STOP:+--force-stop $$FORCE_STOP}

runtime-status:
	./bin/openchat status --environment $${ENV:-production}

runtime-health:
	./bin/openchat health --environment $${ENV:-production}

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
