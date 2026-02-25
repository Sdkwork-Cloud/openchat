# OpenChat Server 数据库安装与初始化指南

本文档详细说明 OpenChat Server 在不同环境下的数据库安装、配置和初始化流程。

## 目录

- [环境要求](#环境要求)
- [数据库配置概览](#数据库配置概览)
- [开发环境](#开发环境)
- [测试环境](#测试环境)
- [生产环境](#生产环境)
- [数据库初始化脚本](#数据库初始化脚本)
- [常见问题](#常见问题)

---

## 环境要求

### 软件要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| PostgreSQL | 12.0+ | 主数据库 |
| Redis | 6.0+ | 缓存和会话存储 |
| Node.js | 18.0+ | 运行环境 |
| pnpm | 8.0+ | 包管理器 |

### 硬件建议

| 环境 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 开发 | 2核 | 4GB | 20GB |
| 测试 | 4核 | 8GB | 50GB |
| 生产 | 8核+ | 16GB+ | 200GB+ SSD |

---

## 数据库配置概览

### 数据库命名规范

| 环境 | 数据库名 | 用户名 | 默认密码 |
|------|----------|--------|----------|
| 开发 | `sdkwork_chat_dev` | `sdkwork_dev` | `dev_password` |
| 测试 | `sdkwork_chat_test` | `sdkwork_test` | `test_password` |
| 生产 | `sdkwork_chat` | `sdkwork_prod` | *强密码* |

### JDBC 连接字符串格式

```
jdbc:postgresql://{host}:{port}/{database}?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
```

### 环境变量对照表

| 变量名 | 开发环境 | 测试环境 | 生产环境 |
|--------|----------|----------|----------|
| `DB_HOST` | localhost | test-db | prod-db-primary |
| `DB_PORT` | 5432 | 5432 | 5432 |
| `DB_USERNAME` | sdkwork_dev | sdkwork_test | sdkwork_prod |
| `DB_PASSWORD` | dev_password | test_password | *强密码* |
| `DB_NAME` | sdkwork_chat_dev | sdkwork_chat_test | sdkwork_chat |
| `DB_POOL_MIN` | 2 | 5 | 10 |
| `DB_POOL_MAX` | 10 | 20 | 50 |

---

## 开发环境

### 1. 安装 PostgreSQL

#### Windows

```powershell
# 使用 Chocolatey 安装
choco install postgresql -y

# 或下载安装包
# https://www.postgresql.org/download/windows/
```

#### macOS

```bash
# 使用 Homebrew 安装
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian)

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. 创建开发数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 中执行以下 SQL
```

```sql
-- 创建开发环境用户
CREATE USER sdkwork_dev WITH PASSWORD 'dev_password';

-- 创建开发数据库
-- Windows 使用不同的 locale 格式
CREATE DATABASE sdkwork_chat_dev 
    OWNER sdkwork_dev 
    ENCODING 'UTF8';

-- 或者使用默认 locale
-- CREATE DATABASE sdkwork_chat_dev 
--     OWNER sdkwork_dev 
--     ENCODING 'UTF8'
--     LC_COLLATE = 'C' 
--     LC_CTYPE = 'C' 
--     TEMPLATE template0;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE sdkwork_chat_dev TO sdkwork_dev;

-- 连接到新数据库
\c sdkwork_chat_dev

-- 授予 schema 权限
GRANT ALL ON SCHEMA public TO sdkwork_dev;

-- 退出
\q
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.development .env
```

或直接编辑 `.env.development`：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=sdkwork_dev
DB_PASSWORD=dev_password
DB_NAME=sdkwork_chat_dev
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_LOGGING=true
DB_TIMEZONE=Asia/Shanghai
DB_CHARSET=utf8
```

### 4. 初始化数据库架构

```bash
# 方式一：使用 SQL 脚本
# 注意：必须使用 -h localhost 强制使用密码认证
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev -f database/schema.sql

# 方式二：使用初始化脚本
./scripts/init-database.ps1 -Environment dev

# 方式三：使用 TypeORM 同步（开发环境）
pnpm db:sync
```

### 5. 插入测试数据

```bash
# 插入开发测试数据
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev -f database/seed.sql
```

### 6. 验证安装

```bash
# 启动服务
pnpm dev

# 检查日志输出
# 应该看到：
# ✓ 数据库连接成功!
# ✓ OpenChat Server 启动成功!
```

---

## 测试环境

### 1. 数据库准备

```sql
-- 创建测试环境用户
CREATE USER sdkwork_test WITH PASSWORD 'test_password';

-- 创建测试数据库
CREATE DATABASE sdkwork_chat_test 
    OWNER sdkwork_test 
    ENCODING 'UTF8';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE sdkwork_chat_test TO sdkwork_test;

-- 连接到新数据库
\c sdkwork_chat_test

-- 授予 schema 权限
GRANT ALL ON SCHEMA public TO sdkwork_test;

-- 退出
\q
```

### 2. 环境配置

创建 `.env.test` 文件：

```env
# 测试环境配置
NODE_ENV=test
PORT=3001

# 数据库配置
DB_HOST=test-db
DB_PORT=5432
DB_USERNAME=sdkwork_test
DB_PASSWORD=test_password
DB_NAME=sdkwork_chat_test
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_LOGGING=false
DB_SSL=true
```

### 3. 初始化测试数据库

```bash
# 创建数据库架构
psql -h localhost -U sdkwork_test -d sdkwork_chat_test -f database/schema.sql

# 插入测试数据
psql -h localhost -U sdkwork_test -d sdkwork_chat_test -f database/seed.sql
```

### 4. 运行测试

```bash
# 运行单元测试
pnpm test

# 运行端到端测试
pnpm test:e2e

# 运行测试覆盖率
pnpm test:cov
```

---

## 生产环境

### 1. 服务器准备

#### PostgreSQL 配置优化

编辑 `/etc/postgresql/14/main/postgresql.conf`：

```ini
# 连接设置
max_connections = 200
superuser_reserved_connections = 3

# 内存设置
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 64MB

# WAL 设置
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 1GB

# 查询优化
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 2. 创建生产数据库

```sql
-- 创建生产环境用户（使用强密码）
CREATE USER sdkwork_prod WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- 创建生产数据库
CREATE DATABASE sdkwork_chat 
    OWNER sdkwork_prod 
    ENCODING 'UTF8';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE sdkwork_chat TO sdkwork_prod;

-- 创建只读用户（用于报表等）
CREATE USER sdkwork_readonly WITH PASSWORD 'READONLY_PASSWORD';
GRANT CONNECT ON DATABASE sdkwork_chat TO sdkwork_readonly;
\c sdkwork_chat
GRANT USAGE ON SCHEMA public TO sdkwork_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sdkwork_readonly;
```

### 3. 安全配置

创建 `.env.production` 文件：

```env
# 生产环境配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置（高可用）
DB_HOST=prod-db-primary,prod-db-replica
DB_PORT=5432
DB_USERNAME=sdkwork_prod
DB_PASSWORD=YOUR_STRONG_PASSWORD_MIN_32_CHARS
DB_NAME=sdkwork_chat
DB_POOL_MIN=10
DB_POOL_MAX=50
DB_LOGGING=false
DB_TIMEZONE=Asia/Shanghai
DB_CHARSET=utf8
DB_SSL=true
```

### 4. SSL/TLS 配置

```bash
# 生成 SSL 证书
mkdir -p /etc/postgresql/14/main/ssl
cd /etc/postgresql/14/main/ssl

# 使用 Let's Encrypt
certbot certonly --standalone -d db.your-domain.com

# 设置权限
chown postgres:postgres server.*
chmod 600 server.key
```

### 5. 防火墙配置

```bash
# 仅允许应用服务器访问数据库
sudo ufw allow from 10.0.0.0/8 to any port 5432
sudo ufw allow from 172.16.0.0/12 to any port 5432
sudo ufw allow from 192.168.0.0/16 to any port 5432
sudo ufw enable
```

### 6. 初始化生产数据库

```bash
# 创建数据库架构
psql -h localhost -U sdkwork_prod -d sdkwork_chat -f database/schema.sql

# 执行迁移
psql -h localhost -U sdkwork_prod -d sdkwork_chat -f database/migrations/001_add_fulltext_search.sql

# 执行索引优化
psql -h localhost -U sdkwork_prod -d sdkwork_chat -f database/indexes-optimization.sql

# 注意：生产环境不执行 seed.sql
```

---

## 数据库初始化脚本

### Windows PowerShell

```powershell
# 使用初始化脚本
.\scripts\init-database.ps1 -Environment dev

# 测试环境
.\scripts\init-database.ps1 -Environment test

# 生产环境
.\scripts\init-database.ps1 -Environment prod
```

### Linux/macOS Bash

```bash
# 使用初始化脚本
./scripts/init-database.sh dev

# 测试环境
./scripts/init-database.sh test

# 生产环境
./scripts/init-database.sh prod
```

---

## 常见问题

### Q1: Peer authentication failed

**问题**: `FATAL: Peer authentication failed for user "sdkwork_dev"`

**原因**: PostgreSQL 默认使用 peer 认证，需要系统用户名与数据库用户名匹配。

**解决方案**:

```bash
# 方案一：使用 -h localhost 强制使用密码认证（推荐）
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev -f database/schema.sql

# 方案二：设置环境变量 PGPASSWORD
export PGPASSWORD='dev_password'
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev -f database/schema.sql

# 方案三：修改 pg_hba.conf（需要管理员权限）
# 编辑 /etc/postgresql/14/main/pg_hba.conf
# 将 peer 改为 md5 或 scram-sha-256
# local   all   all   peer  ->  local   all   all   md5
# 然后重启 PostgreSQL: sudo systemctl restart postgresql
```

### Q2: 连接数过多

**问题**: `FATAL: sorry, too many clients already`

**解决方案**:

```sql
-- 查看当前连接
SELECT count(*) FROM pg_stat_activity;

-- 查看连接来源
SELECT usename, application_name, client_addr, count(*) 
FROM pg_stat_activity 
GROUP BY usename, application_name, client_addr;

-- 终止空闲连接
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND query_start < NOW() - INTERVAL '10 minutes';
```

### Q3: 查询性能慢

**解决方案**:

```sql
-- 开启查询分析
EXPLAIN ANALYZE SELECT * FROM chat_messages WHERE from_user_id = 'xxx';

-- 更新统计信息
ANALYZE chat_messages;

-- 重建索引
REINDEX TABLE chat_messages;
```

### Q4: 磁盘空间不足

**解决方案**:

```sql
-- 查看表大小
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) 
FROM pg_catalog.pg_statio_user_tables 
ORDER BY pg_total_relation_size(relid) DESC;

-- 清理空间
VACUUM FULL ANALYZE chat_messages;
```

---

## 附录

### A. 数据库连接字符串示例

```
# 开发环境
postgresql://sdkwork_dev:dev_password@localhost:5432/sdkwork_chat_dev

# 测试环境
postgresql://sdkwork_test:test_password@test-db:5432/sdkwork_chat_test

# 生产环境
postgresql://sdkwork_prod:PASSWORD@prod-db:5432/sdkwork_chat?ssl=true
```

### B. 快速命令参考

```bash
# 连接数据库（必须使用 -h localhost 强制密码认证）
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev

# 执行 SQL 文件
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev -f script.sql

# 导出数据库
pg_dump -h localhost -U sdkwork_dev sdkwork_chat_dev > backup.sql

# 导入数据库
psql -h localhost -U sdkwork_dev -d sdkwork_chat_dev < backup.sql

# 查看表结构
\d table_name

# 查看所有表
\dt
```

### C. Windows Locale 说明

Windows 上的 PostgreSQL 使用不同的 locale 名称格式：

```sql
-- Windows 可用的 locale 名称
-- 查看可用 locale
SELECT * FROM pg_collation;

-- Windows 常用 locale
-- Chinese_China.936 (简体中文)
-- English_United States.1252 (美式英语)
-- C (默认，无 locale)

-- Windows 创建数据库示例
CREATE DATABASE sdkwork_chat_dev 
    OWNER sdkwork_dev 
    ENCODING 'UTF8'
    LC_COLLATE = 'C' 
    LC_CTYPE = 'C' 
    TEMPLATE template0;

-- 或者直接使用默认 locale
CREATE DATABASE sdkwork_chat_dev 
    OWNER sdkwork_dev 
    ENCODING 'UTF8';
```

### D. 相关文档

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [TypeORM 文档](https://typeorm.io/)
- [Redis 文档](https://redis.io/documentation)
