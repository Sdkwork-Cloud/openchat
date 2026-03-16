# OpenChat Deployment Guide

This document defines a production-ready deployment flow aligned with current repository scripts and database standards.

## 1. Deployment Principles

- **Fresh environment**: initialize with `database/schema.sql` (and optional `database/seed.sql`)
- **Existing environment**: apply `database/patches/*.sql` before new app rollout
- **Single source of truth** for DB structure: `database/schema.sql`
- **Patch tracking table**: `chat_schema_migrations`

## 2. Prerequisites

- Node.js 18+
- Docker 24+ and Docker Compose v2 (for container deployment)
- PostgreSQL 15+
- Redis 7+
- `psql` command available

## 3. Environment Files

Supported runtime env names:

- `development` (`dev` alias)
- `test`
- `production` (`prod` alias)

Script-to-env mapping:

- `development`: `.env.development` (fallback `.env.dev`)
- `test`: `.env.test`
- `production`: `.env.production` (fallback `.env.prod`)

## 4. Database Rollout Order (Critical)

Use this order in production to avoid app/database mismatch:

```bash
# 1) Apply online patches first (idempotent)
./scripts/apply-db-patches.sh production

# 2) Deploy application
npm run build
npm run start:prod

# 3) Health check
curl -f http://<host>:3000/health
```

For Docker production rollout:

```bash
./scripts/docker-deploy.sh prod:deploy
```

`prod:deploy` already includes patch execution before container startup.

## 5. Local / VM Deployment (Non-container)

### 5.1 Fresh install

```bash
npm install
cp .env.example .env.development
# edit .env.development

./scripts/init-database.sh development
npm run start:dev
```

### 5.2 Existing DB upgrade

```bash
npm install
./scripts/apply-db-patches.sh production
npm run build
npm run start:prod
```

## 6. Docker Deployment

### 6.1 Common commands

```bash
# Install/build/start services with checks
./scripts/docker-deploy.sh install

# Start / Stop / Restart / Status
./scripts/docker-deploy.sh start
./scripts/docker-deploy.sh stop
./scripts/docker-deploy.sh restart
./scripts/docker-deploy.sh status

# Logs
./scripts/docker-deploy.sh logs

# Clean resources
./scripts/docker-deploy.sh clean
```

### 6.2 External DB/Redis mode

```bash
./scripts/docker-deploy.sh external
```

### 6.3 Quick mode (app container only)

```bash
./scripts/docker-deploy.sh quick
```

This mode assumes external PostgreSQL / Redis / WukongIM are already available.

### 6.4 Patch only

```bash
./scripts/docker-deploy.sh patch-db
```

## 7. Health Check and Diagnostics

### 7.1 API health endpoint

```bash
curl -f http://localhost:3000/health
```

### 7.2 Script-based diagnostics

```bash
./scripts/health-check.sh
./scripts/precheck.sh
./scripts/diagnose.sh
```

### 7.3 Database verification

```bash
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1;"
```

## 8. Rollback Strategy

### 8.1 Application rollback

- Keep at least one previously tested app image/build artifact
- Roll back app first if release causes runtime issues
- Keep DB patch history immutable; do not delete records in `chat_schema_migrations`

### 8.2 Database rollback

- Prefer forward-fix patches over destructive rollback
- Before release, always create DB backup:

```bash
pg_dump -h <db_host> -U <db_user> -d <db_name> -F c -b -v -f backup_before_release.dump
```

Restore if needed:

```bash
pg_restore -h <db_host> -U <db_user> -d <db_name> -v backup_before_release.dump
```

## 9. Release Checklist

- [ ] `.env.production` validated (`DB_*`, `REDIS_*`, `JWT_SECRET`, `WUKONGIM_*`)
- [ ] `./scripts/apply-db-patches.sh production` executed successfully
- [ ] `npm run build` completed
- [ ] service started successfully (`npm run start:prod` or Docker)
- [ ] `/health` check passed
- [ ] key business path smoke-tested (auth, messaging, receipt, conversation sync)

## 10. Command Handbook

For a full copy-paste command matrix (Linux/macOS + Windows), see:

- `docs/COMMANDS_CN.md`
