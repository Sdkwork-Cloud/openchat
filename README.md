# OpenChat Server

OpenChat Server is an enterprise-grade real-time communication backend built with NestJS, PostgreSQL, Redis, and WukongIM.

## Features

- Real-time messaging (single chat, group chat, receipts, sync cursor)
- WukongIM-based connection and message routing
- RTC module with multi-provider abstraction
- AI agent / bot platform and third-party integration modules
- Production-oriented observability, health checks, and patch-based DB evolution

## Tech Stack

- NestJS 11
- TypeScript 5
- PostgreSQL 15+
- Redis 7+
- Socket.IO + WukongIM
- TypeORM 0.3

## Quick Start (Fresh Environment)

### 1. Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- Redis >= 7
- `psql` command available in PATH

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
# Linux / macOS
cp .env.example .env.development

# then edit .env.development
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.development
# then edit .env.development
```

### 4. Initialize database schema

Linux / macOS:

```bash
chmod +x scripts/init-database.sh
./scripts/init-database.sh development
```

Windows PowerShell:

```powershell
.\scripts\init-database.ps1 -Environment development
```

### 5. Start server

```bash
npm run start:dev
```

## Existing Environment Upgrade (Patch Flow)

For existing databases, apply online patches before starting a new release:

Linux / macOS:

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell:

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

## Script Reference

### npm scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Start compiled app |
| `npm run build` | Build app to `dist/` |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run lint` | Run lint pipeline |
| `npm run lint:eslint` | Run ESLint only |
| `npm run lint:types` | Type check (`tsc --noEmit`) |
| `npm run db:drop` | Drop schema via TypeORM CLI |
| `npm run db:sync` | Sync schema via TypeORM CLI |

### operational scripts

| Script | Description |
|---|---|
| `./scripts/init-database.sh` | Fresh DB initialization (`schema.sql`, optional `seed.sql`) |
| `./scripts/apply-db-patches.sh` | Apply `database/patches/*.sql` with migration tracking |
| `./scripts/docker-deploy.sh` | Docker lifecycle (`install/start/quick/prod:deploy/...`) |
| `./scripts/precheck.sh` | Environment precheck |
| `./scripts/health-check.sh` | Runtime health diagnostics |
| `./scripts/check-compat-regression.sh` | Guard against removed compatibility regressions |

## Database Baseline

- Baseline schema: `database/schema.sql`
- Optional seed: `database/seed.sql`
- Optional index optimization: `database/indexes-optimization.sql`
- Online patches: `database/patches/*.sql`
- Migration tracking table: `chat_schema_migrations`

## Documentation

- Chinese installation guide: [INSTALL_CN.md](./INSTALL_CN.md)
- English installation guide: [INSTALL_EN.md](./INSTALL_EN.md)
- Deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Database guide: [database/README.md](./database/README.md)
- Command handbook (CN): [docs/COMMANDS_CN.md](./docs/COMMANDS_CN.md)
- API docs index (CN): [docs/zh/api/index.md](./docs/zh/api/index.md)
- API docs index (EN): [docs/en/api/index.md](./docs/en/api/index.md)

## License

AGPL-3.0
