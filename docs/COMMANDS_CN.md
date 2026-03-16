# OpenChat 命令速查（安装 / 数据库 / 部署 / 运维）

本文档提供可直接复制执行的命令手册，覆盖从环境准备到发布上线的核心流程。

## 1. 环境准备

### 1.1 安装前检查

Linux / macOS:

```bash
./scripts/precheck.sh
```

Windows:

```powershell
scripts\precheck.bat
```

### 1.2 安装依赖

```bash
npm install
```

## 2. 环境文件

开发环境：

```bash
cp .env.example .env.development
```

生产环境：

```bash
cp .env.example .env.production
```

脚本环境参数与文件映射：

- `development` / `dev` -> `.env.development`（fallback: `.env.dev`）
- `test` -> `.env.test`
- `production` / `prod` -> `.env.production`（fallback: `.env.prod`）

## 3. 数据库命令

### 3.1 全新数据库初始化（推荐脚本）

Linux / macOS:

```bash
chmod +x scripts/init-database.sh
./scripts/init-database.sh development
```

Windows PowerShell:

```powershell
.\scripts\init-database.ps1 -Environment development
```

### 3.2 存量数据库补丁升级

Linux / macOS:

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell:

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

### 3.3 手工执行（兜底）

```bash
psql -h <host> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -U <user> -d <db_name> -f database/seed.sql
```

## 4. 本地开发与构建

```bash
# 开发模式
npm run start:dev

# 构建
npm run build

# 生产启动
npm run start:prod

# 测试
npm run test
npm run test:e2e

# 代码质量
npm run lint
npm run lint:types
```

## 5. Docker 部署命令

```bash
# 安装并启动（检查依赖、端口、构建镜像）
./scripts/docker-deploy.sh install

# 常规生命周期
./scripts/docker-deploy.sh start
./scripts/docker-deploy.sh stop
./scripts/docker-deploy.sh restart
./scripts/docker-deploy.sh status
./scripts/docker-deploy.sh logs

# 清理
./scripts/docker-deploy.sh clean

# 仅应用容器快速启动（依赖外部服务）
./scripts/docker-deploy.sh quick

# 外部 DB/Redis 模式
./scripts/docker-deploy.sh external

# 仅执行数据库补丁
./scripts/docker-deploy.sh patch-db

# 生产发布（先补丁再启动）
./scripts/docker-deploy.sh prod:deploy
```

## 6. 标准发布流程（生产）

```bash
# 1) 执行数据库补丁（幂等）
./scripts/apply-db-patches.sh production

# 2) 构建并启动应用
npm run build
npm run start:prod

# 3) 健康检查
curl -f http://<host>:3000/health
```

Docker 生产发布可直接：

```bash
./scripts/docker-deploy.sh prod:deploy
```

## 7. 健康检查与诊断

```bash
# 接口健康检查
curl -f http://localhost:3000/health

# 综合健康脚本
./scripts/health-check.sh

# 诊断
./scripts/diagnose.sh

# 兼容回归守卫
./scripts/check-compat-regression.sh
```

## 8. 数据库巡检 SQL

```sql
-- 查看业务表数量
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 查看补丁执行记录
SELECT filename, version, checksum, applied_at
FROM chat_schema_migrations
ORDER BY applied_at DESC;

-- 检查 IM 核心表是否存在
SELECT to_regclass('public.chat_users')      AS chat_users,
       to_regclass('public.chat_conversations') AS chat_conversations,
       to_regclass('public.chat_messages')   AS chat_messages,
       to_regclass('public.chat_message_receipts') AS chat_message_receipts;
```

## 9. 备份与恢复

```bash
# 备份
pg_dump -h <db_host> -U <db_user> -d <db_name> -F c -b -v -f backup.dump

# 恢复
pg_restore -h <db_host> -U <db_user> -d <db_name> -v backup.dump
```
