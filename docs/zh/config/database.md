# 数据库配置

OpenChat 使用 PostgreSQL 作为主数据库，通过 TypeORM 进行数据库操作。

## 环境变量配置

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `DB_HOST` | 数据库主机地址 | `localhost` | 是 |
| `DB_PORT` | 数据库端口 | `5432` | 否 |
| `DB_USER` | 数据库用户名 | `openchat` | 是 |
| `DB_PASSWORD` | 数据库密码 | - | 是 |
| `DB_NAME` | 数据库名称 | `openchat` | 是 |
| `DB_LOGGING` | SQL 日志开关 | `false` | 否 |
| `DB_POOL_MAX` | 连接池最大连接数 | `20` | 否 |
| `DB_POOL_MIN` | 连接池最小连接数 | `5` | 否 |

## 连接配置

### Docker Compose 配置

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    container_name: openchat-postgres
    environment:
      POSTGRES_USER: openchat
      POSTGRES_PASSWORD: openchat_password
      POSTGRES_DB: openchat
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openchat"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 环境变量示例

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your_secure_password
DB_NAME=openchat
DB_LOGGING=false
DB_POOL_MAX=20
DB_POOL_MIN=5
```

## 连接池配置

### 连接池参数

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `DB_POOL_MAX` | 最大连接数 | CPU 核心数 × 2 + 1 |
| `DB_POOL_MIN` | 最小连接数 | CPU 核心数 |
| `DB_IDLE_TIMEOUT` | 空闲连接超时(ms) | 30000 |
| `DB_CONNECTION_TIMEOUT` | 连接超时(ms) | 5000 |

### 性能调优

```bash
# 高并发场景
DB_POOL_MAX=50
DB_POOL_MIN=10

# 低负载场景
DB_POOL_MAX=10
DB_POOL_MIN=2
```

## 数据库初始化

### 自动迁移

OpenChat 在启动时会自动执行数据库迁移：

```bash
# 启动服务时自动迁移
npm run start

# 手动运行迁移
npm run migration:run
```

### 手动初始化

```bash
# 创建数据库
createdb -U postgres openchat

# 运行初始化脚本
psql -U openchat -d openchat -f database/init.sql
```

## 数据库备份

### 手动备份

```bash
# 备份整个数据库
pg_dump -U openchat -d openchat > backup_$(date +%Y%m%d).sql

# 仅备份数据
pg_dump -U openchat -d openchat --data-only > data_backup.sql

# 仅备份结构
pg_dump -U openchat -d openchat --schema-only > schema_backup.sql
```

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/openchat"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/openchat_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump -U openchat -d openchat | gzip > $BACKUP_FILE

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### 恢复数据

```bash
# 恢复数据库
psql -U openchat -d openchat < backup_20240115.sql
```

## 数据库监控

### 健康检查

```sql
-- 查看连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看活跃连接
SELECT pid, usename, application_name, state, query 
FROM pg_stat_activity 
WHERE state = 'active';

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('openchat'));

-- 查看表大小
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) 
FROM pg_catalog.pg_statio_user_tables 
ORDER BY pg_total_relation_size(relid) DESC;
```

### 性能优化

```sql
-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 'xxx';

-- 更新统计信息
ANALYZE messages;

-- 重建索引
REINDEX TABLE messages;
```

## 外部数据库配置

### 使用外部 PostgreSQL

```bash
# .env
DB_HOST=your-db-host.com
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your_password
DB_NAME=openchat
```

### Docker Compose 外部数据库

```yaml
# docker-compose.external-db.yml
services:
  app:
    environment:
      - DB_HOST=your-db-host
      - DB_PORT=5432
      - DB_USER=openchat
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=openchat
```

## 安全配置

### 数据库用户权限

```sql
-- 创建只读用户
CREATE USER openchat_readonly WITH PASSWORD 'password';
GRANT CONNECT ON DATABASE openchat TO openchat_readonly;
GRANT USAGE ON SCHEMA public TO openchat_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO openchat_readonly;

-- 创建读写用户
CREATE USER openchat_readwrite WITH PASSWORD 'password';
GRANT CONNECT ON DATABASE openchat TO openchat_readwrite;
GRANT USAGE ON SCHEMA public TO openchat_readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO openchat_readwrite;
```

### SSL 连接

```bash
# .env
DB_SSL=true
DB_SSL_CA=/path/to/ca-cert
DB_SSL_CERT=/path/to/client-cert
DB_SSL_KEY=/path/to/client-key
```

## 故障排除

### 连接失败

```bash
# 检查数据库是否运行
docker compose ps postgres

# 检查连接
psql -h localhost -U openchat -d openchat

# 查看日志
docker compose logs postgres
```

### 性能问题

```bash
# 查看慢查询
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# 查看锁等待
SELECT * FROM pg_locks WHERE NOT granted;
```

## 相关链接

- [服务端配置](./server.md)
- [部署指南](../deploy/docker.md)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
