# OpenChat Server 安装指南

本指南覆盖开发、测试、生产三种运行环境的安装、初始化、启动和验证流程。

## 系统要求

### 硬件建议

| 环境 | CPU      | 内存       | 磁盘            |
| ---- | -------- | ---------- | --------------- |
| 开发 | 2 核     | 4 GB       | 20 GB           |
| 测试 | 4 核     | 8 GB       | 50 GB           |
| 生产 | 8 核以上 | 16 GB 以上 | 100 GB 以上 SSD |

### 软件要求

| 软件                    | 要求                          |
| ----------------------- | ----------------------------- |
| Node.js                 | `>= 20.19.0`，推荐 `24.x`     |
| npm                     | `>= 10`                       |
| PostgreSQL              | `15+`                         |
| Redis                   | `7+`                          |
| Docker / Docker Compose | 容器模式可选，推荐 `24+ / 2+` |
| psql                    | 数据库初始化与补丁脚本依赖    |
| redis-cli               | 健康检查推荐安装              |

## 安装前检查

宿主机部署前，建议先执行预检查：

::: code-group

```bash [Linux/macOS]
./scripts/precheck.sh --mode standalone
```

```powershell [Windows]
.\scripts\precheck.ps1
```

:::

## 环境文件准备

仓库已经自带三套环境模板：

| 环境 | 文件               | 默认用途           |
| ---- | ------------------ | ------------------ |
| 开发 | `.env.development` | 本地调试、接口开发 |
| 测试 | `.env.test`        | 自动化测试、联调   |
| 生产 | `.env.production`  | 正式部署           |

如需自定义环境，可从 `.env.example` 复制新文件。

### 必改项

所有环境至少应检查这些变量：

```bash
NODE_ENV=
HOST=
PORT=
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_NAME=
REDIS_HOST=
REDIS_PORT=
JWT_SECRET=
WUKONGIM_ENABLED=
```

生产环境必须额外确认：

```bash
REDIS_PASSWORD=
CORS_ORIGINS=
EXTERNAL_IP=
LOG_FILE_ENABLED=true
LOG_FILE_DIR=./var/logs
```

## 通用安装步骤

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
npm ci
```

### 2. 启动依赖服务

开发环境：

```bash
docker compose --env-file .env.development --profile database --profile cache --profile im up -d
```

说明：

- 默认构建镜像使用 Node.js `24.x`，可通过 `NODE_VERSION` 覆盖。
- 容器模式也保持 `DB_SYNCHRONIZE=false`，依赖 `schema.sql + seed.sql + patches` 管理结构。

测试环境：

```bash
docker compose --env-file .env.test --profile database --profile cache up -d
```

生产环境如果依赖外部 PostgreSQL / Redis / WuKongIM，则只需保证连接信息正确，不必启动本地容器。

### 3. 初始化数据库

新库初始化：

```bash
./scripts/init-database.sh development --yes --seed
./scripts/init-database.sh test --yes --seed
./scripts/init-database.sh production --yes
```

等价的 npm 快捷命令：

```bash
npm run db:init:dev -- --yes --seed
npm run db:init:test -- --yes --seed
npm run db:init:prod -- --yes
```

已有数据库升级：

```bash
./scripts/apply-db-patches.sh development
./scripts/apply-db-patches.sh test
./scripts/apply-db-patches.sh production
```

等价快捷命令：

```bash
npm run db:patch:dev
npm run db:patch:test
npm run db:patch:prod
```

## 开发环境安装

### 典型流程

```bash
npm ci
docker compose --env-file .env.development --profile database --profile cache --profile im up -d
./scripts/init-database.sh development --yes --seed
npm run start:dev
```

### 验证

```bash
curl http://127.0.0.1:7200/health
./scripts/health-check.sh quick
```

### 适用场景

- API 开发
- 本地问题复现
- Swagger / OpenAPI 浏览

## 测试环境安装

### 典型流程

```bash
npm ci
docker compose --env-file .env.test --profile database --profile cache up -d
./scripts/init-database.sh test --yes --seed
npm run test
npm run test:e2e
```

需要独立启动测试服务时：

```bash
npm run start:test
curl http://127.0.0.1:7201/health
```

### 适用场景

- CI / 本地自动化测试
- 联调环境
- 与开发环境隔离的数据验证

## 生产环境安装

### 1. 编辑生产配置

重点替换：

```bash
DB_PASSWORD=replace-with-strong-password
REDIS_PASSWORD=replace-with-strong-password
JWT_SECRET=replace-with-at-least-32-characters-secret
CORS_ORIGINS=https://your-domain.example.com
EXTERNAL_IP=your-public-ip
```

### 2. 构建应用

```bash
npm ci
npm run build
```

### 3. 发布前执行数据库补丁

```bash
./scripts/apply-db-patches.sh production
```

### 4. 启动服务

宿主机运行：

```bash
./bin/openchat start --environment production --host 127.0.0.1 --port 7200 --strict-port
```

安装为系统服务：

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

Docker Compose 运行：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### 5. 生产验证

```bash
OPENCHAT_ENV_FILE=.env.production ./scripts/health-check.sh full
./bin/openchat status --environment production
./bin/openchat health --environment production
```

推荐补充命令：

```bash
make runtime-start ENV=production
make runtime-stop ENV=production
make deploy-standalone ENV=production SERVICE=1
```

## 外部依赖模式

如果数据库、Redis、WuKongIM 由外部托管，仅需在环境文件中调整地址：

```bash
DB_HOST=your-db-host
REDIS_HOST=your-redis-host
WUKONGIM_API_URL=http://your-wukongim:5001
WUKONGIM_TCP_ADDR=your-wukongim:5100
WUKONGIM_WS_URL=ws://your-wukongim:5200
```

容器场景可以配合：

```bash
docker compose -f docker-compose.external-db.yml up -d
```

## 安装后检查

快速健康检查：

```bash
./scripts/health-check.sh quick
```

完整诊断：

```bash
./scripts/health-check.sh full
```

单项检查：

```bash
./scripts/health-check.sh config
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh app
./scripts/health-check.sh wukongim
```

## 常见建议

- 默认推荐所有环境都保持 `DB_SYNCHRONIZE=false`。
- 新库使用 `schema.sql + seed.sql`，旧库只执行 `patches/*.sql`。
- 测试环境应使用独立数据库和独立 Redis DB。
- 生产环境发布顺序建议固定为“备份 -> 补丁 -> 发布 -> 健康检查”。
- 生产环境建议开启 `OPENCHAT_STRICT_PORT=true`，并使用运行时包装器或 Systemd 管理启停。
