# Quick Deploy

This guide helps you quickly deploy OpenChat for first-time experience and verification.

## Pre-Installation Check

Before installation, run the check script to verify your system:

```bash
# Linux / macOS
./scripts/precheck.sh --mode standalone

# Windows
.\scripts\precheck.ps1
```

The check includes:
- Operating system and architecture
- Memory and disk space
- Docker and Docker Compose status
- Port availability
- Network connectivity

## Unified Deploy (Recommended)

### Linux / macOS

```bash
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
cp .env.example .env
# edit .env as needed
./scripts/deploy-server.sh production --db-action auto --yes --service
```

### Windows

```powershell
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
Copy-Item .env.example .env
# edit .env as needed
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

## Docker Quick Start

### Option 1: Quick Start (Recommended)

Use `docker-compose.quick.yml` for one-click startup without additional configuration:

```bash
# Start all services in one command
docker compose -f docker-compose.quick.yml up -d

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
# Standalone runtime health
./bin/openchat status
./bin/openchat health

# Linux service status
systemctl status openchat.service
```

### 2. Check Service Health

```bash
# Health check
curl http://127.0.0.1:7200/health
curl http://127.0.0.1:7200/ready
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
| OpenChat API | http://127.0.0.1:7200 |
| App API Documentation | http://127.0.0.1:7200/im/v3/docs |
| Admin API Documentation | http://127.0.0.1:7200/admin/im/v3/docs |
| Health Check | http://127.0.0.1:7200/health |
| WukongIM Demo | http://localhost:5172 |
| WukongIM Admin | http://localhost:5300/web |

## Common Commands

```bash
# Deploy or update
./scripts/deploy-server.sh production --db-action auto --yes --service

# Runtime wrapper
./bin/openchat restart
./bin/openchat status
./bin/openchat health

# Database commands
./scripts/init-database.sh production --yes
./scripts/apply-db-patches.sh production
```

## Next Steps

- [Installation Guide](./installation.md) - Detailed installation options
- [Docker Deployment](./docker.md) - Advanced Docker configuration
- [Configuration](../config/) - Server configuration options
