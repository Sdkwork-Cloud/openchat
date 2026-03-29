# 数据库配置

OpenChat 使用 PostgreSQL 作为主数据库。当前推荐的数据库管理策略是：

- 新库：执行 `schema.sql`，开发 / 测试环境可额外执行 `seed.sql`
- 旧库：只执行 `database/patches/*.sql`
- 默认所有环境都保持 `DB_SYNCHRONIZE=false`

## 环境参数

| 变量                    | 说明         | 开发默认值          | 测试默认值          | 生产默认值  |
| ----------------------- | ------------ | ------------------- | ------------------- | ----------- |
| `DB_HOST`               | 数据库地址   | `127.0.0.1`         | `127.0.0.1`         | `127.0.0.1` |
| `DB_PORT`               | 数据库端口   | `5432`              | `5432`              | `5432`      |
| `DB_USERNAME`           | 数据库用户   | `openchat`          | `openchat`          | `openchat`  |
| `DB_PASSWORD`           | 数据库密码   | `openchat_password` | `openchat_password` | 必须替换    |
| `DB_NAME`               | 数据库名     | `openchat_dev`      | `openchat_test`     | `openchat`  |
| `DB_POOL_MIN`           | 最小连接数   | `2`                 | `1`                 | `5`         |
| `DB_POOL_MAX`           | 最大连接数   | `10`                | `5`                 | `20`        |
| `DB_CONNECTION_TIMEOUT` | 建连超时     | `10000`             | `5000`              | `15000`     |
| `DB_IDLE_TIMEOUT`       | 空闲超时     | `300000`            | `60000`             | `300000`    |
| `DB_ACQUIRE_TIMEOUT`    | 获取连接超时 | `30000`             | `10000`             | `60000`     |
| `DB_SSL`                | 是否启用 SSL | `false`             | `false`             | 视部署而定  |
| `DB_LOGGING`            | SQL 日志     | `false`             | `false`             | `false`     |
| `DB_SYNCHRONIZE`        | 自动同步结构 | `false`             | `false`             | `false`     |

## 初始化策略

### 新数据库

开发环境：

```bash
./scripts/init-database.sh development --yes --seed
# 或 npm run db:init:dev -- --yes --seed
```

测试环境：

```bash
./scripts/init-database.sh test --yes --seed
# 或 npm run db:init:test -- --yes --seed
```

生产环境：

```bash
./scripts/init-database.sh production --yes
# 或 npm run db:init:prod -- --yes
```

说明：

- `schema.sql` 总是执行
- `seed.sql` 仅建议在开发 / 测试环境执行
- `indexes-optimization.sql` 会在初始化脚本中一并执行

### 存量数据库

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

补丁特性：

- 按文件名版本号排序执行
- 自动记录到 `chat_schema_migrations`
- 已执行补丁自动跳过
- 文件内容摘要不一致时阻断执行

## 推荐发布顺序

### 开发环境

```bash
./scripts/init-database.sh development --yes --seed
npm run start:dev
```

### 测试环境

```bash
./scripts/init-database.sh test --yes --seed
npm run test
npm run start:test
```

### 生产环境

```bash
pg_dump -h <host> -U <user> -d <db> > backup.sql
./scripts/apply-db-patches.sh production
npm run build
npm run start:prod
```

## 手动执行 SQL

如果不使用脚本，也可以手工执行：

```bash
psql -h <host> -p <port> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -p <port> -U <user> -d <db_name> -f database/seed.sql
```

生产环境一般跳过 `seed.sql`。

## 连接池建议

| 场景         | 建议                                                  |
| ------------ | ----------------------------------------------------- |
| 本地开发     | `DB_POOL_MIN=2`，`DB_POOL_MAX=10`                     |
| 自动化测试   | `DB_POOL_MIN=1`，`DB_POOL_MAX=5`                      |
| 中小规模生产 | `DB_POOL_MIN=5`，`DB_POOL_MAX=20`                     |
| 高并发生产   | 根据 PostgreSQL `max_connections` 与 CPU 评估后再扩大 |

## 外部数据库

如果 PostgreSQL 由外部服务托管，直接修改环境文件：

```bash
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-user
DB_PASSWORD=your-password
DB_NAME=openchat
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

## 巡检与备份

连通性检查：

```bash
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1"
```

数据库备份：

```bash
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" > backup_$(date +%Y%m%d_%H%M%S).sql
```

最近补丁记录：

```sql
SELECT filename, version, checksum, applied_at
FROM chat_schema_migrations
ORDER BY applied_at DESC;
```

## 建议

- 不要把结构变更依赖在 `DB_SYNCHRONIZE` 上。
- 开发、测试、生产必须使用独立数据库名。
- 发布前务必备份生产库。
- 历史补丁文件只新增，不覆写。
