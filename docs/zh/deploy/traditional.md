# 传统部署

传统部署指直接在宿主机运行 OpenChat，不依赖完整 Docker 容器栈。适合需要精细控制进程、日志、Systemd、PM2 或复用现有 PostgreSQL / Redis / WuKongIM 的场景。

## 前置要求

- Node.js `>= 20.19.0`，推荐 `24.x`
- npm `>= 10`
- PostgreSQL `15+`
- Redis `7+`
- `psql` 可用
- `redis-cli` 可用

## 宿主机部署步骤

### 1. 安装依赖

```bash
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
npm ci
```

### 2. 选择环境文件

开发：

```bash
vim .env.development
```

测试：

```bash
vim .env.test
```

生产：

```bash
vim .env.production
```

生产环境必须替换：

```bash
DB_PASSWORD=
REDIS_PASSWORD=
JWT_SECRET=
CORS_ORIGINS=
EXTERNAL_IP=
```

### 3. 初始化数据库

新库初始化：

```bash
./scripts/init-database.sh development --yes --seed
./scripts/init-database.sh test --yes --seed
./scripts/init-database.sh production --yes
```

旧库升级：

```bash
./scripts/apply-db-patches.sh production
```

### 4. 构建与启动

开发：

```bash
npm run start:dev
```

测试：

```bash
npm run start:test
```

生产：

```bash
npm run build
npm run start:prod
```

更推荐的生产启动方式是使用运行时包装器：

```bash
./bin/openchat start --environment production --host 127.0.0.1 --port 7200 --strict-port
./bin/openchat status --environment production
./bin/openchat health --environment production
./bin/openchat stop --environment production
```

开发 / 测试环境也可以使用同一套入口：

```bash
./bin/openchat start --environment development
./bin/openchat start --environment test
```

## 使用 Systemd

仓库已经提供 `etc/openchat.service`，可直接复用。

```bash
sudo cp etc/openchat.service /etc/systemd/system/openchat.service
sudo systemctl daemon-reload
sudo systemctl enable openchat
sudo systemctl start openchat
sudo systemctl status openchat
```

如果使用 Systemd，建议先执行：

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

当前生成的 `openchat.service` 已包含：

- `TimeoutStartSec=90`
- `TimeoutStopSec=30`
- `Restart=on-failure`
- `LimitNOFILE=65535`
- `NoNewPrivileges=yes`
- `ProtectSystem=full`
- `ProtectHome=true`
- `ReadWritePaths=/opt/source/openchat/var`

## 使用 PM2

```bash
npm run build
pm2 start dist/main.js --name openchat-server --time --env production
pm2 status
pm2 logs openchat-server
```

如果要让 PM2 使用生产环境文件，请显式传入：

```bash
NODE_ENV=production pm2 start dist/main.js --name openchat-server --time
```

## 日志与状态

使用运行时包装器时：

- 开发环境 PID 文件：`var/run/openchat.development.pid`
- 测试环境 PID 文件：`var/run/openchat.test.pid`
- 生产环境 PID 文件：`var/run/openchat.production.pid`
- 运行状态文件：`var/run/openchat.<env>.runtime.json`
- 标准输出日志：`var/logs/<env>.stdout.log`
- 标准错误日志：`var/logs/<env>.stderr.log`

生产环境为兼容历史脚本，还会同步维护旧路径 `var/run/openchat.pid` 与 `var/run/openchat.runtime.json`。

常用命令：

```bash
./bin/openchat status --environment production
./bin/openchat logs --environment production
./bin/openchat clean
make runtime-start ENV=production
make runtime-stop ENV=production
make runtime-restart ENV=production
```

安全语义：

- `start`：检查端口，写入环境隔离的 PID / 运行状态文件，等待 `/health` 成功
- `stop`：校验 PID 对应进程命令行，再执行 `SIGTERM -> 等待 -> 可选 SIGKILL`
- `restart`：按同一环境先停后起，避免混用不同环境 PID
- `health`：按运行状态文件解析实际监听端口，再访问 `/health`

## 健康检查

```bash
./scripts/health-check.sh quick
./scripts/health-check.sh runtime
OPENCHAT_ENV_FILE=.env.production ./scripts/health-check.sh full
```

## 高可用建议

- 宿主机部署同样建议保持 `DB_SYNCHRONIZE=false`。
- 数据库变更统一走 `schema.sql + patches`，不要把结构变更依赖在运行时自动同步上。
- 生产环境最好把 OpenChat 监听在内网地址，再由 Nginx / Caddy 做反向代理。
- 建议使用 `deploy-server.sh ... --service` 交给 Systemd 管理，而不是手工后台命令。
- 若要双机高可用，建议每台机器独立部署 OpenChat，前置反向代理做健康检查与摘流。
- 数据库、Redis、WuKongIM 的高可用应分别通过主从、哨兵、集群或云托管能力解决。
