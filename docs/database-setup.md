# OpenChat Server 数据库安装与初始化指南

本文档说明 OpenChat 在开发、测试、生产三种环境下的数据库安装、配置和初始化流程。

## 环境默认值

| 环境 | 环境文件           | 数据库名        | 端口   | Redis DB  |
| ---- | ------------------ | --------------- | ------ | --------- |
| 开发 | `.env.development` | `openchat_dev`  | `7200` | `0 / 1`   |
| 测试 | `.env.test`        | `openchat_test` | `7201` | `10 / 11` |
| 生产 | `.env.production`  | `openchat`      | `7200` | `0 / 1`   |

## 软件要求

- PostgreSQL `15+`
- Redis `7+`
- Node.js `>= 20.19.0`
- npm `>= 10`
- `psql`

## 推荐流程

### 开发环境

```bash
docker compose --env-file .env.development --profile database --profile cache --profile im up -d
./scripts/init-database.sh development --yes --seed
npm run start:dev
```

### 测试环境

```bash
docker compose --env-file .env.test --profile database --profile cache up -d
./scripts/init-database.sh test --yes --seed
npm run test
```

### 生产环境

```bash
./scripts/apply-db-patches.sh production
npm run build
npm run start:prod
```

## 初始化命令

新库：

```bash
./scripts/init-database.sh development --yes --seed
./scripts/init-database.sh test --yes --seed
./scripts/init-database.sh production --yes
```

旧库：

```bash
./scripts/apply-db-patches.sh development
./scripts/apply-db-patches.sh test
./scripts/apply-db-patches.sh production
```

npm 快捷方式：

```bash
npm run db:init:dev -- --yes --seed
npm run db:init:test -- --yes --seed
npm run db:init:prod -- --yes
npm run db:patch:dev
npm run db:patch:test
npm run db:patch:prod
```

## 手工执行 SQL

```bash
psql -h <host> -p <port> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -p <port> -U <user> -d <db_name> -f database/seed.sql
```

生产环境通常跳过 `seed.sql`。

## 关键原则

- 新库走 `schema.sql + seed.sql`
- 旧库走 `patches/*.sql`
- 默认所有环境都保持 `DB_SYNCHRONIZE=false`
- 生产发布顺序固定为“备份 -> 补丁 -> 发布 -> 健康检查”
