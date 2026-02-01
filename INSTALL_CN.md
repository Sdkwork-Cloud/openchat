# OpenChat 服务器安装指南

## 1. 系统要求

- 启用 WSL 2 的 Windows 10/11
- Ubuntu 22.04 (WSL)
- Node.js 18.x 或更高版本
- PostgreSQL 18.x
- Redis 7.0+

## 2. 数据库安装（WSL Ubuntu 环境）

### 2.1 更新系统包

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 安装 PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
```

### 2.3 启动并启用 PostgreSQL 服务

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.4 验证安装

```bash
sudo -u postgres psql -c "SELECT version();"
```

## 3. 数据库初始化（已安装数据库的情况）

### 3.1 登录 PostgreSQL

以 postgres 用户身份登录：

```bash
sudo -u postgres psql
```

### 3.2 创建数据库用户

创建一个专门用于 OpenChat 的数据库用户：

```sql
-- 创建用户并设置密码
CREATE USER openchat_user WITH PASSWORD 'openchat_password';

-- 授予超级用户权限（生产环境可根据需要调整权限）
ALTER USER openchat_user WITH SUPERUSER;
```

### 3.3 创建数据库

创建 OpenChat 数据库并指定所有者：

```sql
-- 创建数据库
CREATE DATABASE openchat OWNER openchat_user;

-- 退出 PostgreSQL
\q
```

### 3.4 验证数据库和用户

```bash
sudo -u postgres psql -c "\l"  -- 查看所有数据库
sudo -u postgres psql -c "\du" -- 查看所有用户
```

## 4. 数据库认证配置

### 4.1 修改 pg_hba.conf 文件

编辑 PostgreSQL 认证配置文件：

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

在文件末尾添加以下配置：

```
# OpenChat 服务器连接配置
host    openchat    openchat_user    0.0.0.0/0    scram-sha-256
host    openchat    openchat_user    ::/0         scram-sha-256
```

### 4.2 修改 postgresql.conf 文件

编辑 PostgreSQL 主配置文件：

```bash
sudo nano /etc/postgresql/18/main/postgresql.conf
```

修改以下配置：

```
# 监听所有网络接口
listen_addresses = '*'

# 端口设置（默认 5432）
port = 5432
```

### 4.3 重启 PostgreSQL 服务

```bash
sudo systemctl restart postgresql
```

## 5. Redis 安装

### 5.1 安装 Redis

```bash
sudo apt install redis-server -y
```

### 5.2 启动并启用 Redis 服务

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 5.3 验证 Redis 安装

```bash
redis-cli ping
```

## 6. OpenChat 服务器安装

### 6.1 克隆仓库

```bash
git clone https://github.com/yourusername/openchat.git
cd openchat
```

### 6.2 安装依赖

```bash
pnpm install
```

### 6.3 配置环境变量

复制并编辑环境配置文件：

```bash
cp .env .env.local
nano .env.local
```

更新数据库配置部分：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat_user
DB_NAME=openchat
DB_PASSWORD=openchat_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 6.4 数据库初始化

#### 6.4.1 初始化数据库结构

```bash
# 以 postgres 用户身份初始化数据库结构
sudo -u postgres psql -d openchat -f database/schema.sql

# 或使用明确的用户参数
psql -U postgres -d openchat -f database/schema.sql
```

#### 6.4.2 执行数据库迁移（可选）

```bash
# 以 postgres 用户身份执行数据库迁移
sudo -u postgres psql -d openchat -f database/migrations/001_add_fulltext_search.sql

# 或使用明确的用户参数
psql -U postgres -d openchat -f database/migrations/001_add_fulltext_search.sql
```

#### 6.4.3 插入测试数据（可选）

```bash
# 以 postgres 用户身份插入测试数据
sudo -u postgres psql -d openchat -f database/seed.sql

# 或使用明确的用户参数
psql -U postgres -d openchat -f database/seed.sql
```

## 7. 启动服务器

### 7.1 开发模式

```bash
pnpm start:dev
```

### 7.2 生产模式

```bash
pnpm build
pnpm start:prod
```

## 8. 验证

### 8.1 检查服务器状态

打开浏览器并导航到 `http://localhost:3000/health` 检查服务器是否正常运行。

### 8.2 测试数据库连接

服务器启动时会自动连接数据库。检查控制台日志是否有数据库连接错误。

## 9. 故障排除

### 9.1 常见错误

#### 9.1.1 密码认证失败

**错误信息**：`password authentication failed for user "openchat_user"`

**解决方案**：
1. 确认密码正确
2. 检查 pg_hba.conf 配置
3. 重置用户密码：
   ```bash
   sudo -u postgres psql -c "ALTER USER openchat_user WITH PASSWORD 'new_password';"
   ```

#### 9.1.2 连接被拒绝

**错误信息**：`connection refused`

**解决方案**：
1. 确认 PostgreSQL 服务正在运行
2. 检查 listen_addresses 配置
3. 验证防火墙设置

### 9.2 查看 PostgreSQL 日志

```bash
sudo tail -f /var/log/postgresql/postgresql-18-main.log
```

## 10. 备份与恢复

### 10.1 数据库备份

```bash
pg_dump -h localhost -U openchat_user -d openchat -F c -b -v -f openchat_backup.sql
```

### 10.2 数据库恢复

```bash
pg_restore -h localhost -U openchat_user -d openchat -v openchat_backup.sql
```

## 11. 性能优化

### 11.1 PostgreSQL 配置

编辑 postgresql.conf：

```bash
sudo nano /etc/postgresql/18/main/postgresql.conf
```

修改设置：

```
max_connections = 100
shared_buffers = 1GB
work_mem = 32MB
```

### 11.2 Redis 配置

编辑 redis.conf：

```bash
sudo nano /etc/redis/redis.conf
```

修改设置：

```
maxmemory 1gb
maxmemory-policy allkeys-lru
```

## 12. 总结

本指南提供了安装和配置 OpenChat 服务器的分步说明，包括数据库设置和初始化。如需更多信息，请参考官方文档。
