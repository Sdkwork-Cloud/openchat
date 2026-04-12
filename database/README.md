# OpenChat 数据库说明

本目录维护 OpenChat 服务端的数据库基线、初始化数据和在线补丁。

## 目录结构

```text
database/
├── schema.sql
├── seed.sql
├── indexes-optimization.sql
├── patches/
└── README.md
```

## 推荐策略

- 新数据库：执行 `schema.sql`
- 开发 / 测试环境：可追加执行 `seed.sql`
- 存量数据库：执行 `patches/*.sql`
- 默认所有环境都建议保持 `DB_SYNCHRONIZE=false`

## 环境约定

| 环境 | 环境文件           | 默认数据库      |
| ---- | ------------------ | --------------- |
| 开发 | `.env.development` | `openchat_dev`  |
| 测试 | `.env.test`        | `openchat_test` |
| 生产 | `.env.production`  | `openchat`      |

## 初始化数据库

Linux / macOS：

```bash
./scripts/init-database.sh development --yes --seed
./scripts/init-database.sh test --yes --seed
./scripts/init-database.sh production --yes
```

PowerShell：

```powershell
.\scripts\init-database.ps1 -Environment development
.\scripts\init-database.ps1 -Environment test
.\scripts\init-database.ps1 -Environment production
```

npm 快捷命令：

```bash
npm run db:init:dev -- --yes --seed
npm run db:init:test -- --yes --seed
npm run db:init:prod -- --yes
```

说明:

- `npm run db:init:test` 会优先使用宿主机 `psql`。
- 如果宿主机未安装 `psql`，但 `.env.test` 中配置了 `POSTGRES_CONTAINER_NAME` 且 Docker 可用，CLI 会自动回退到 `docker exec <container> psql`。
- 推荐先执行 `npm run test:env:up` 再初始化测试库。

## 执行在线补丁

Linux / macOS：

```bash
./scripts/apply-db-patches.sh development
./scripts/apply-db-patches.sh test
./scripts/apply-db-patches.sh production
```

PowerShell：

```powershell
.\scripts\apply-db-patches.ps1 -Environment development
.\scripts\apply-db-patches.ps1 -Environment test
.\scripts\apply-db-patches.ps1 -Environment production
```

npm 快捷命令：

```bash
npm run db:patch:dev
npm run db:patch:test
npm run db:patch:prod
```

补丁执行记录表为 `chat_schema_migrations`。

## 手工执行

```bash
psql -h <host> -p <port> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -p <port> -U <user> -d <db_name> -f database/seed.sql
```

生产环境一般只执行 `schema.sql`，跳过 `seed.sql`。

## 巡检 SQL

```sql
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

SELECT filename, version, checksum, applied_at
FROM chat_schema_migrations
ORDER BY applied_at DESC;
```

## 生产建议

- 先备份，再补丁，再发布应用。
- 不要覆写历史补丁文件。
- 对外部托管 PostgreSQL，同样沿用这套基线 + 补丁策略。
