# OpenChat 服务端安装指南（中文）

本文档基于当前仓库真实脚本与命令编写，适用于全新环境安装与存量环境升级。

## 1. 环境要求

- 操作系统：Linux / macOS / Windows（推荐 WSL2）
- Node.js：18+
- PostgreSQL：15+
- Redis：7+
- 必要命令：`npm`、`psql`、`redis-cli`

## 2. 安装基础依赖（Ubuntu 示例）

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server
```

启动服务并设置开机自启：

```bash
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server
```

验证：

```bash
sudo -u postgres psql -c "SELECT version();"
redis-cli ping
```

## 3. 创建数据库与账号

```bash
sudo -u postgres psql
```

执行：

```sql
CREATE USER openchat_user WITH PASSWORD 'change_this_password';
CREATE DATABASE openchat OWNER openchat_user;
\q
```

## 4. PostgreSQL 远程访问与认证（按需）

先查询配置文件位置，不写死版本号目录：

```bash
sudo -u postgres psql -tAc "SHOW hba_file;"
sudo -u postgres psql -tAc "SHOW config_file;"
```

编辑 `pg_hba.conf`，追加：

```conf
host    openchat    openchat_user    0.0.0.0/0    scram-sha-256
host    openchat    openchat_user    ::/0         scram-sha-256
```

编辑 `postgresql.conf`，确认：

```conf
listen_addresses = '*'
port = 5432
```

重启 PostgreSQL：

```bash
sudo systemctl restart postgresql
```

## 5. 获取代码并安装依赖

```bash
git clone <your-openchat-repo-url> openchat-server
cd openchat-server
npm install
```

如果你的目录名不是 `openchat-server`，请改为实际目录。

## 6. 配置环境变量

开发环境推荐：

```bash
cp .env.example .env.development
```

编辑 `.env.development`，至少确认以下配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=openchat_user
DB_PASSWORD=change_this_password
DB_NAME=openchat

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 7. 初始化数据库（全新数据库）

Linux / macOS：

```bash
chmod +x scripts/init-database.sh
./scripts/init-database.sh development
```

Windows PowerShell：

```powershell
.\scripts\init-database.ps1 -Environment development
```

说明：

- 脚本会执行 `database/schema.sql`
- 非生产环境可选择是否导入 `database/seed.sql`
- 支持环境别名：`dev|development`、`test`、`prod|production`

## 8. 存量数据库升级（在线补丁）

发布新版本前先执行补丁：

Linux / macOS：

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell：

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

说明：

- 补丁来源：`database/patches/*.sql`
- 执行记录表：`chat_schema_migrations`
- 支持重复执行，已执行补丁会自动跳过

## 9. 启动服务

开发环境：

```bash
npm run start:dev
```

生产环境：

```bash
npm run build
npm run start:prod
```

## 10. 验证安装

```bash
curl -f http://localhost:3000/health
```

可选：

```bash
./scripts/health-check.sh
```

Swagger 文档：

- `http://localhost:3000/api/docs`

## 11. 常见故障排查

### 11.1 `password authentication failed`

```bash
sudo -u postgres psql -c "ALTER USER openchat_user WITH PASSWORD 'new_password';"
```

并同步更新 `.env.*` 中的 `DB_PASSWORD`。

### 11.2 `connection refused`

依次检查：

```bash
sudo systemctl status postgresql
sudo systemctl status redis-server
ss -lntp | rg '5432|6379|3000'
```

### 11.3 `psql: command not found`

安装 PostgreSQL 客户端并确认在 PATH：

```bash
command -v psql
```

## 12. 备份与恢复

备份：

```bash
pg_dump -h localhost -U openchat_user -d openchat -F c -b -v -f openchat_backup.dump
```

恢复：

```bash
pg_restore -h localhost -U openchat_user -d openchat -v openchat_backup.dump
```

## 13. 参考文档

- 部署指南：`DEPLOYMENT.md`
- 数据库说明：`database/README.md`
- 命令速查：`docs/COMMANDS_CN.md`
