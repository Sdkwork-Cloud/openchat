# Quick Deploy

This guide helps you quickly deploy OpenChat for first-time experience and verification.

## Pre-Installation Check

Before installation, run the check script to verify your system:

```bash
# Linux / macOS
pnpm run precheck

# Windows
pnpm run precheck:win
```

The check includes:
- Operating system and architecture
- Memory and disk space
- Docker and Docker Compose status
- Port availability
- Network connectivity

## One-Click Install (Recommended)

### Linux / macOS

```bash
# Quick install
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# Or clone and install
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

### Windows

```powershell
# Quick install
.\scripts\quick-install.bat

# Or PowerShell full install
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

## Docker Quick Start

### Option 1: Quick Start (Recommended)

Use `docker-compose.quick.yml` for one-click startup without additional configuration:

```bash
# Start all services in one command
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick

# Check service status
docker compose -f docker-compose.quick.yml ps

# View logs
docker compose -f docker-compose.quick.yml logs -f
```

### Option 2: Dev Environment

Use `docker-compose.yml` for flexible configuration with profiles:

```bash
# Start all services (database+Redis+IM+app)
docker compose --profile database --profile cache --profile im up -d

# Or use npm script
pnpm run docker:up

# Start only the app (use external database)
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

## Verify Installation

### 1. Check Service Status

```bash
# View container status
docker compose ps

# Run health check
pnpm run health
```

### 2. Check Service Health

```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api/docs
```

### 3. View Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f openchat
```

## Access Services

After installation, access the following services:

| Service | URL |
|---------|-----|
| OpenChat API | http://localhost:3000 |
| API Documentation | http://localhost:3000/api/docs |
| Health Check | http://localhost:3000/health |
| WukongIM Demo | http://localhost:5172 |
| WukongIM Admin | http://localhost:5300/web |

## Common Commands

```bash
# Start services
pnpm run docker:up

# Stop services
pnpm run docker:down

# View logs
pnpm run docker:logs

# Check status
pnpm run docker:ps

# Health check
pnpm run health

# Full diagnosis
pnpm run health:full
```

## Next Steps

- [Installation Guide](./installation.md) - Detailed installation options
- [Docker Deployment](./docker.md) - Advanced Docker configuration
- [Configuration](../config/) - Server configuration options
