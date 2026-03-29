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
scripts\precheck.ps1
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

## 3. 推荐部署命令

### 3.1 Linux 服务端一键部署

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

效果：

- 预检查
- 依赖安装
- 构建
- 自动选择数据库 `init` 或 `patch`
- 安装并重启 `openchat.service`

### 3.2 Linux 非服务模式部署

```bash
./scripts/deploy-server.sh production --db-action auto --yes
```

### 3.3 Windows PowerShell

```powershell
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

### 3.4 域名入口、Nginx Stream 与 WukongIM 一键配置

Linux:

```bash
./scripts/configure-edge.sh development --public-ip <public_ip> --server-ip <server_ip>
./scripts/configure-edge.sh test --public-ip <public_ip> --server-ip <server_ip>
./scripts/configure-edge.sh production --public-ip <public_ip> --server-ip <server_ip>
```

PowerShell:

```powershell
.\scripts\configure-edge.ps1 development -PublicIp <public_ip> -ServerIp <server_ip>
.\scripts\configure-edge.ps1 test -PublicIp <public_ip> -ServerIp <server_ip>
.\scripts\configure-edge.ps1 production -PublicIp <public_ip> -ServerIp <server_ip>
```

常用参数：

- `--domain` / `-Domain`：显式指定域名
- `--public-ip` / `-PublicIp`：域名公网 IP
- `--server-ip` / `-ServerIp`：服务器实际内网或主网卡 IP
- `--runtime-environment`：OpenChat 运行环境，默认建议 `production`

默认域名：

- `development` -> `im-dev.sdkwork.com`
- `test` -> `im-test.sdkwork.com`
- `production` -> `im.sdkwork.com`

## 4. 数据库命令

### 4.1 全新数据库初始化（推荐脚本）

Linux / macOS:

```bash
chmod +x scripts/init-database.sh
./scripts/init-database.sh development
```

Windows PowerShell:

```powershell
.\scripts\init-database.ps1 -Environment development
```

### 4.2 存量数据库补丁升级

Linux / macOS:

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell:

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

### 4.3 手工执行（兜底）

```bash
psql -h <host> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -U <user> -d <db_name> -f database/seed.sql
```

## 5. 本地开发与构建

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

## 6. Docker 部署命令

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

## 7. 标准发布流程（生产）

```bash
# 推荐：统一部署入口
./scripts/deploy-server.sh production --db-action patch --yes --service

# 或者手工执行
./scripts/apply-db-patches.sh production
npm run build
./bin/openchat restart --environment production --host 127.0.0.1 --port 7200 --strict-port
```

Docker 生产发布可直接：

```bash
./scripts/docker-deploy.sh prod:deploy
```

## 8. 健康检查与诊断

```bash
# 接口健康检查
curl -f http://127.0.0.1:7200/health
curl -f http://127.0.0.1:7200/health/ready

# 域名入口健康检查（本机 Host 头验证）
curl -H 'Host: im-dev.sdkwork.com' http://127.0.0.1/health

# HTTPS + SNI 验证
curl -k --resolve im-dev.sdkwork.com:443:127.0.0.1 https://im-dev.sdkwork.com/health

# WukongIM 管理台验证
curl -H 'Host: im-dev.sdkwork.com' http://127.0.0.1/web/

# 综合健康脚本
./scripts/health-check.sh

# 诊断
./scripts/diagnose.sh

# 兼容回归守卫
./scripts/check-compat-regression.sh
```

## 9. 数据库巡检 SQL

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
       to_regclass('public.chat_message_receipts') AS chat_message_receipts,
       to_regclass('public.chat_message_reactions') AS chat_message_reactions;
```

## 10. 备份与恢复

```bash
# 备份
pg_dump -h <db_host> -U <db_user> -d <db_name> -F c -b -v -f backup.dump

# 恢复
pg_restore -h <db_host> -U <db_user> -d <db_name> -v backup.dump
```
