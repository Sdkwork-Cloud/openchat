# OpenChat 服务端安装与部署指南

本文档基于当前仓库中的真实脚本和已验证流程编写，适用于 Linux / macOS / Windows PowerShell。

如果你要在 Linux 服务器上以长期运行的服务端模式部署，推荐直接使用新的统一部署脚本：

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

这条命令会串行完成以下动作：

- 运行环境预检查
- 准备 `.env`
- 安装依赖
- 构建后端
- 自动判断数据库应该执行 `init` 还是 `patch`
- 在 Linux 上生成并安装 `systemd` 服务
- 启用并重启 `openchat.service`

## 1. 环境要求

- Node.js 18+
- npm
- PostgreSQL 15+
- Redis 7+
- `psql` 命令可用
- Linux 服务化部署额外需要 `systemd`

Ubuntu 示例：

```bash
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib redis-server
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server
```

检查基础依赖：

```bash
node -v
npm -v
psql --version
redis-cli ping
```

## 2. 准备环境文件

生产环境推荐：

```bash
cp .env.example .env
```

至少确认这些配置项：

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=7200

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=openchat
DB_PASSWORD=change_this_password
DB_NAME=openchat

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=replace_this_with_a_real_secret
ENCRYPTION_MASTER_KEY=replace_this_with_a_real_key
```

说明：

- 新部署优先读取 `.env`
- `deploy-server`、`db init`、`db patch` 都会按照环境名去找 `.env.production` / `.env.development` / `.env.test`，如果找不到则回退到 `.env`

## 3. PostgreSQL 账号与数据库

`db init` 可以自动创建目标数据库，但前提是 `.env` 中的数据库用户本身能够连接 PostgreSQL，并拥有创建数据库的权限。

推荐先创建应用账号：

```bash
sudo -u postgres psql
```

执行：

```sql
CREATE USER openchat WITH PASSWORD 'change_this_password';
ALTER USER openchat CREATEDB;
\q
```

如果你不希望授予 `CREATEDB`，也可以手工预建数据库：

```bash
sudo -u postgres createdb -O openchat openchat
```

## 4. 获取代码

```bash
git clone <your-openchat-repo-url> openchat
cd openchat
```

## 5. 推荐部署方式

### 5.1 Linux 服务端部署

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

参数说明：

- `production`：部署环境
- `--db-action auto`：自动判断数据库动作
  - 数据库不存在或业务表不存在时执行 `init`
  - 已有业务表时执行 `patch`
- `--yes`：跳过交互确认
- `--service`：生成并安装 `systemd` 服务

执行成功后可用以下命令确认：

```bash
systemctl status openchat.service
./bin/openchat status
./bin/openchat health
curl -f http://127.0.0.1:7200/ready
```

### 5.2 Linux 非服务模式

如果你只想部署并直接用仓库内的运行包装器启动：

```bash
./scripts/deploy-server.sh production --db-action auto --yes
```

这会完成安装、构建、数据库动作，并通过 `bin/openchat` 重启运行时。

### 5.3 Windows PowerShell

```powershell
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

说明：

- Windows 当前推荐 PowerShell 脚本，不再提供 `.bat`
- `-Service` 参数在 Windows 上不会安装 `systemd`，会被安全跳过

## 6. 数据库单独命令

### 6.1 全新数据库初始化

Linux / macOS:

```bash
./scripts/init-database.sh production --yes
```

Windows PowerShell:

```powershell
.\scripts\init-database.ps1 -Environment production -Yes
```

### 6.2 存量数据库补丁

Linux / macOS:

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell:

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

说明：

- 补丁目录：`database/patches/*.sql`
- 执行记录表：`chat_schema_migrations`
- 支持重复执行，已执行补丁会自动跳过

## 7. 常用运行命令

```bash
./bin/openchat start
./bin/openchat stop
./bin/openchat restart
./bin/openchat status
./bin/openchat health
```

查看服务日志：

```bash
tail -f var/logs/stdout.log
tail -f var/logs/stderr.log
```

## 8. 功能验收

健康检查：

```bash
curl -f http://127.0.0.1:7200/health
curl -f http://127.0.0.1:7200/ready
```

如果是非生产环境并导入了种子数据，可验证管理员登录：

```bash
curl -sS \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"OpenChat@123"}' \
  http://127.0.0.1:7200/auth/login
```

## 9. 常见问题

### 9.1 `psql was not found in PATH`

安装 PostgreSQL 客户端并确认：

```bash
command -v psql
```

### 9.2 `password authentication failed`

重置数据库账号密码：

```bash
sudo -u postgres psql -c "ALTER USER openchat WITH PASSWORD 'new_password';"
```

然后同步更新 `.env` 中的 `DB_PASSWORD`。

### 9.3 `permission denied` 或 `systemctl` 失败

`--service` 需要有权限写入 `/etc/systemd/system/openchat.service` 并执行 `systemctl`。如果当前用户没有权限，请使用具备 sudo 权限的账号执行。

## 10. 参考文档

- [DEPLOYMENT.md](/opt/source/openchat/DEPLOYMENT.md)
- [docs/COMMANDS_CN.md](/opt/source/openchat/docs/COMMANDS_CN.md)
- [etc/openchat.service](/opt/source/openchat/etc/openchat.service)
