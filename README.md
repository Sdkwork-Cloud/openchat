# OpenChat Server

OpenChat Server is a NestJS backend for real-time messaging, group chat, RTC, AI agent workflows, and optional WuKongIM integration.

## Stack

- NestJS 11
- TypeScript 5
- PostgreSQL 15+
- Redis 7+
- TypeORM 0.3
- Socket.IO
- WuKongIM (optional but recommended for IM routing)

## Environment Matrix

| Environment | Env file           | Default port | Default database | Redis DB  | Notes                                                                 |
| ----------- | ------------------ | ------------ | ---------------- | --------- | --------------------------------------------------------------------- |
| Development | `.env.development` | `7200`       | `openchat_dev`   | `0 / 1`   | Local development with queue and Redis adapter enabled                |
| Test        | `.env.test`        | `7201`       | `openchat_test`  | `10 / 11` | Test runs with WuKongIM, queue, and Redis adapter disabled by default |
| Production  | `.env.production`  | `7200`       | `openchat`       | `0 / 1`   | Replace all passwords, secrets, and domains before deployment         |

The application, OpenAPI runtime, TypeORM data source, and health-check script resolve env files by `NODE_ENV`:

- `development` or `dev`: `.env.development`, then `.env.dev`, then `.env`
- `test`: `.env.test`, then `.env`
- `production` or `prod`: `.env.production`, then `.env.prod`, then `.env`
- unset or unsupported: `.env`, then development fallbacks

## Prerequisites

- Node.js 24.x recommended
- Node.js >= 20.19.0 required by the current toolchain
- npm >= 10
- PostgreSQL server installed and running
- Redis server installed and running
- `psql` available in `PATH`
- `redis-cli` available in `PATH`

If you are not starting a local WuKongIM instance yet, set `WUKONGIM_ENABLED=false` in your env file so startup and health checks stay predictable.

## Node.js 24 Upgrade

The current repository can no longer be treated as a Node 18 project. The installed ESLint/Nest/Vite toolchain requires Node 20.19+ and works cleanly on Node 24.x.

Recommended version files included in the repo:

- `.nvmrc`
- `.node-version`

If you are in mainland China and want to use a domestic mirror, install a Node 24.x binary from the Node mirror on `npmmirror`.

Example for Linux x64 using Node `v24.13.1`:

```bash
cd /tmp
curl -fsSLO https://npmmirror.com/mirrors/node/v24.13.1/node-v24.13.1-linux-x64.tar.xz
tar -xf node-v24.13.1-linux-x64.tar.xz
export PATH="/tmp/node-v24.13.1-linux-x64/bin:$PATH"
node -v
npm -v
```

If you use `nvm`, align with the repo version:

```bash
nvm install
nvm use
node -v
```

## First-Time Setup

### 1. Install dependencies

```bash
npm ci
```

### 2. Prepare environment files

The repository already ships with:

- `.env.development`
- `.env.test`
- `.env.production`

Use `.env.example` only when you need a custom environment profile.

At minimum, review these values in each file:

- `NODE_ENV`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `WUKONGIM_ENABLED`

## Database Initialization

Use `init-database` only for a fresh database. Keep `DB_SYNCHRONIZE=false` unless you are deliberately doing local-only schema experimentation.

Development fresh database:

```bash
./scripts/init-database.sh development --yes --seed
# or npm run db:init:dev -- --yes --seed
```

Test fresh database:

```bash
./scripts/init-database.sh test --yes --seed
# or npm run db:init:test -- --yes --seed
```

Production fresh database:

```bash
./scripts/init-database.sh production --yes
# or npm run db:init:prod -- --yes
```

For an existing database, apply patches instead of reinitializing:

```bash
./scripts/apply-db-patches.sh development
./scripts/apply-db-patches.sh test
./scripts/apply-db-patches.sh production
```

## Start the Application

### Development

```bash
npm run start:dev
```

Default local verification:

```bash
curl http://127.0.0.1:7200/health
./scripts/health-check.sh quick
```

### Test

Run tests with the test environment:

```bash
npm run test
npm run test:e2e
```

If you need to boot the server with test configuration:

```bash
npm run start:test
```

### Production

Build first:

```bash
npm run build
```

Run the compiled server directly:

```bash
npm run start:prod
```

Or use the runtime wrapper that writes PID and log files under `var/`:

```bash
./bin/openchat start --environment production --host 127.0.0.1 --port 7200 --strict-port
./bin/openchat status --environment production
./bin/openchat health --environment production
./bin/openchat stop --environment production
```

The runtime wrapper is the recommended host-mode entrypoint because it adds safety around process management:

- It uses environment-specific runtime files such as `var/run/openchat.production.pid` and `var/run/openchat.production.runtime.json`.
- It writes environment-specific logs such as `var/logs/production.stdout.log` and `var/logs/production.stderr.log`.
- Start waits for `GET /health` before reporting success.
- Production deployments should keep `OPENCHAT_STRICT_PORT=true` so port conflicts fail fast instead of drifting to another port.
- Stop verifies that the recorded PID still looks like OpenChat, sends `SIGTERM` first, waits `OPENCHAT_SHUTDOWN_TIMEOUT_MS`, and only uses `SIGKILL` when forced stop is allowed.

## Health and Verification

Quick health check:

```bash
./scripts/health-check.sh quick
```

Full diagnosis:

```bash
./scripts/health-check.sh full
```

Targeted checks:

```bash
./scripts/health-check.sh runtime
./scripts/health-check.sh config
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh app
./scripts/health-check.sh wukongim
```

Override the env file used by the health checker:

```bash
OPENCHAT_ENV_FILE=.env.production ./scripts/health-check.sh full
```

## Docker and Makefile Shortcuts

Docker deployment helpers still exist for containerized environments:

```bash
make dev
make test-env
make prod
make deploy-standalone ENV=production DB_ACTION=auto SERVICE=1
make db-init ENV=development SEED=1
make db-patch ENV=production
make runtime-start ENV=production
make runtime-stop ENV=production
make runtime-status ENV=production
make runtime-health ENV=production
make health
make health-full
```

The `Makefile` now uses the same environment-aware workflow as the repository root scripts. `make runtime-*` is the safest host-mode control surface for start, stop, restart, status, and health checks.

## High Availability Notes

- Keep `development`, `test`, and `production` on separate databases and separate Redis DBs. Do not reuse test data stores for production validation.
- In production, bind OpenChat to a private address and publish it through Nginx, Caddy, or a cloud load balancer.
- Prefer `./scripts/deploy-server.sh production --db-action auto --yes --service` or `make deploy-standalone ENV=production SERVICE=1` so Systemd manages restart policy, startup timeouts, shutdown timeouts, file descriptor limits, and filesystem hardening.
- Run releases in the order `backup -> patch -> build -> restart -> health check`.
- Use at least two application nodes behind a reverse proxy if you need rolling upgrades or host-level failover. Database and Redis high availability still need to be designed separately.

## Script Reference

### npm scripts

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run build`         | Build the server into `dist/`                    |
| `npm run start`         | Start with Nest CLI                              |
| `npm run start:dev`     | Start development server with `.env.development` |
| `npm run start:test`    | Start test server with `.env.test`               |
| `npm run start:prod`    | Start compiled server with `.env.production`     |
| `npm run lint`          | Run lint pipeline                                |
| `npm run lint:types`    | Run TypeScript type checking                     |
| `npm run test`          | Run unit tests                                   |
| `npm run test:e2e`      | Run e2e tests                                    |
| `npm run test:cov`      | Run coverage                                     |
| `npm run db:init:dev`   | Development database initialization shortcut     |
| `npm run db:init:test`  | Test database initialization shortcut            |
| `npm run db:init:prod`  | Production database initialization shortcut      |
| `npm run db:patch:dev`  | Development patch shortcut                       |
| `npm run db:patch:test` | Test patch shortcut                              |
| `npm run db:patch:prod` | Production patch shortcut                        |

### operational scripts

| Script                                                                   | Description                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `./scripts/precheck.sh`                                                  | Check runtime prerequisites                               |
| `./scripts/init-database.sh <env>`                                       | Fresh database initialization                             |
| `./scripts/apply-db-patches.sh <env>`                                    | Apply incremental SQL patches                             |
| `./scripts/health-check.sh [mode]`                                       | Validate app, DB, Redis, WuKongIM, and Docker state       |
| `./bin/openchat <command>`                                               | Runtime wrapper for start, stop, status, logs, and health |
| `./scripts/deploy-server.sh production --db-action auto --yes --service` | Host deployment helper                                    |

## Documentation

- Chinese README: [README_CN.md](./README_CN.md)
- Database guide: [database/README.md](./database/README.md)
- Chinese deployment overview: [docs/zh/deploy/index.md](./docs/zh/deploy/index.md)
- Chinese installation guide: [docs/zh/deploy/installation.md](./docs/zh/deploy/installation.md)
- Chinese traditional deployment guide: [docs/zh/deploy/traditional.md](./docs/zh/deploy/traditional.md)
- Chinese server config guide: [docs/zh/config/server.md](./docs/zh/config/server.md)
- Chinese database config guide: [docs/zh/config/database.md](./docs/zh/config/database.md)

## License

AGPL-3.0
