# OpenChat Server Installation Guide

This guide covers installation, initialization, startup, and verification for development, test, and production environments.

## System Requirements

### Hardware Requirements

| Environment | CPU      | Memory | Disk   |
| ----------- | -------- | ------ | ------ |
| Development | 2 cores  | 4GB    | 20GB   |
| Testing     | 4 cores  | 8GB    | 50GB   |
| Production  | 8+ cores | 16GB+  | 100GB+ |

### Software Requirements

| Software       | Version | Description             |
| -------------- | ------- | ----------------------- |
| Docker         | 24.0+      | Container runtime                     |
| Docker Compose | 2.0+       | Container orchestration               |
| Node.js        | 20.19.0+   | Required by the current backend stack |
| npm            | 10+        | Package manager                       |
| Git            | 2.0+       | Version control                       |

## Pre-installation Check

Before installation, run the check script to verify your system environment:

::: code-group

```bash [Linux/macOS]
# Run pre-check script
./scripts/precheck.sh --mode standalone
```

```powershell [Windows]
# Run pre-check script
.\scripts\precheck.ps1
```

:::

Check items include:

- ✅ OS and architecture
- ✅ Memory and disk space
- ✅ Docker and Docker Compose status
- ✅ Port availability
- ✅ Network connectivity

## Quick Installation

### Method 1: One-click Install Script (Recommended)

::: code-group

```bash [Linux/macOS]
# Clone and run the unified deploy script
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
# edit .env.production as needed
./scripts/deploy-server.sh production --db-action auto --yes --service
```

```powershell [Windows]
# PowerShell unified deploy
# edit .env.production as needed
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

:::

### Method 2: Docker Quick Start

::: code-group

```bash [Linux/macOS]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services with one command
docker compose -f docker-compose.quick.yml up -d

# View service status
docker compose -f docker-compose.quick.yml ps

# View logs
docker compose -f docker-compose.quick.yml logs -f
```

```powershell [Windows]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services with one command
docker compose -f docker-compose.quick.yml up -d

# View service status
docker compose -f docker-compose.quick.yml ps

# View logs
docker compose -f docker-compose.quick.yml logs -f
```

:::

`docker-compose.quick.yml` is intended for quick validation. It initializes a fresh database from `schema.sql + seed.sql` and keeps `DB_SYNCHRONIZE=false` by default.

### Method 3: Local Development Mode

::: code-group

```bash [Linux/macOS]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Install dependencies
npm ci

# Review the bundled development environment file
sed -n '1,40p' .env.development

# Start dev server
npm run start:dev
```

```powershell [Windows]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Install dependencies
npm ci

# Review the bundled development environment file
Get-Content .env.development | Select-Object -First 40

# Start dev server
npm run start:dev
```

:::

### Verify Installation

::: code-group

```bash [Linux/macOS]
# Health check
curl http://127.0.0.1:7200/health

# Runtime wrapper health check
./bin/openchat health --environment production
```

```powershell [Windows]
# Health check
Invoke-WebRequest -Uri http://127.0.0.1:7200/health
```

:::

## Installation Modes

### 1. Docker Quick Mode (Recommended for Beginners)

The simplest installation method, suitable for quick experience and development testing.

::: code-group

```bash [Linux/macOS]
# Use quick config
docker compose -f docker-compose.quick.yml up -d
```

```powershell [Windows]
# Use quick config
docker compose -f docker-compose.quick.yml up -d
```

:::

Features:

- ✅ Auto-install all dependencies
- ✅ Ready to use out of the box
- ✅ Easy to manage and maintain
- ✅ Safe default database behavior with `DB_SYNCHRONIZE=false`

### 2. External Services Mode

Use external database and Redis, suitable for production.

::: code-group

```bash [Linux/macOS]
# Configure external services
cp .env.example .env.production

# Edit config file
vim .env.production
```

```powershell [Windows]
# Configure external services
Copy-Item .env.example .env.production

# Edit config file
notepad .env.production
```

:::

Configuration:

```bash
DB_HOST=your-db-host
DB_PORT=5432
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

Start services:

```bash
docker compose -f docker-compose.external-db.yml up -d
```

### 3. Standalone Mode

Run directly on server, suitable for scenarios requiring fine control.

::: code-group

```bash [Linux/macOS]
# Use the unified deploy script
./scripts/deploy-server.sh production --db-action auto --yes --service

# Or manual install
npm ci
npm run build
npm run start:prod
```

```powershell [Windows]
# Manual install
npm ci
npm run build
npm run start:prod
```

:::

## Environment Configuration

### Required Configuration

Choose the environment file that matches your operating mode and update it with the following values:

```bash
# Server IP (required for audio/video calls)
EXTERNAL_IP=your-server-ip

# Database config
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=openchat
DB_PASSWORD=your-secure-password
DB_NAME=openchat

# Redis config
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# JWT secret (at least 32 characters)
JWT_SECRET=your-jwt-secret-at-least-32-characters
```

### Optional Configuration

```bash
# WuKongIM config
WUKONGIM_API_URL=http://localhost:5001
WUKONGIM_TCP_ADDR=localhost:5100
WUKONGIM_WS_URL=ws://localhost:5200
WUKONGIM_TOKEN_AUTH=false

# Log config
LOG_LEVEL=info
LOG_FORMAT=json

# Security config
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX=100
```

## Post-installation Configuration

### 1. Security Configuration

::: code-group

```bash [Linux/macOS]
# Generate strong password
openssl rand -base64 24

# Generate JWT secret
openssl rand -base64 32

# Update .env.production
vim .env.production
```

```powershell [Windows]
# Generate strong password (requires OpenSSL)
openssl rand -base64 24

# Or use PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Update .env.production
notepad .env.production
```

:::

### 2. Firewall Configuration

::: code-group

```bash [Linux (firewalld)]
# Open required ports
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=5001/tcp
firewall-cmd --permanent --add-port=5100/tcp
firewall-cmd --permanent --add-port=5200/tcp

# Reload firewall
firewall-cmd --reload
```

```bash [Linux (ufw)]
# Open required ports
sudo ufw allow 3000/tcp
sudo ufw allow 5001/tcp
sudo ufw allow 5100/tcp
sudo ufw allow 5200/tcp

# Enable firewall
sudo ufw enable
```

```powershell [Windows]
# Open required ports (Admin privileges)
New-NetFirewallRule -DisplayName "OpenChat API" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "WukongIM API" -Direction Inbound -Port 5001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "WukongIM TCP" -Direction Inbound -Port 5100 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "WukongIM WS" -Direction Inbound -Port 5200 -Protocol TCP -Action Allow
```

:::

### 3. SSL Configuration

::: code-group

```bash [Linux/macOS]
# Create SSL directory
mkdir -p etc/nginx/ssl

# Copy certificates
cp your-cert.pem etc/nginx/ssl/cert.pem
cp your-key.pem etc/nginx/ssl/key.pem

# Enable HTTPS config
mv etc/nginx/conf.d/ssl.conf.example etc/nginx/conf.d/ssl.conf

# Restart Nginx
docker compose restart nginx
```

```powershell [Windows]
# Create SSL directory
New-Item -ItemType Directory -Force -Path etc\nginx\ssl

# Copy certificates
copy your-cert.pem etc\nginx\ssl\cert.pem
copy your-key.pem etc\nginx\ssl\key.pem

# Enable HTTPS config
Rename-Item etc\nginx\conf.d\ssl.conf.example ssl.conf

# Restart Nginx
docker compose restart nginx
```

:::

## Verify Installation

### Health Check

::: code-group

```bash [Linux/macOS]
# Quick check
./scripts/health-check.sh quick

# Full diagnosis
./scripts/health-check.sh full

# Check specific service
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh wukongim
```

```powershell [Windows]
# Quick check
Invoke-WebRequest -Uri http://127.0.0.1:7200/health

# Full diagnosis
Invoke-WebRequest -Uri http://127.0.0.1:7200/ready
```

:::

### Access Test

::: code-group

```bash [Linux/macOS]
# API health check
curl http://127.0.0.1:7200/health

# Open app API docs
open http://127.0.0.1:7200/im/v3/docs

# Open admin API docs
open http://127.0.0.1:7200/admin/im/v3/docs

# Open WukongIM admin
open http://localhost:5300/web
```

```powershell [Windows]
# API health check
Invoke-WebRequest -Uri http://127.0.0.1:7200/health

# Open app API docs
Start-Process "http://127.0.0.1:7200/im/v3/docs"

# Open admin API docs
Start-Process "http://127.0.0.1:7200/admin/im/v3/docs"

# Open WukongIM admin
Start-Process "http://localhost:5300/web"
```

:::

## Common Issues

### Port Already in Use

::: code-group

```bash [Linux/macOS]
# Check port usage
lsof -i :7200

# Or use netstat
netstat -tlnp | grep 7200

# Kill process
kill -9 <PID>
```

```powershell [Windows]
# Check port usage
netstat -ano | findstr :7200

# Kill process
taskkill /PID <PID> /F
```

:::

### Database Connection Failed

::: code-group

```bash [Linux/macOS]
# Check database status
docker compose ps postgres

# View database logs
docker compose logs postgres

# Test connection
docker exec -it openchat-postgres psql -U openchat -d openchat
```

```powershell [Windows]
# Check database status
docker compose ps postgres

# View database logs
docker compose logs postgres

# Test connection
docker exec -it openchat-postgres psql -U openchat -d openchat
```

:::

### Out of Memory

::: code-group

```bash [Linux/macOS]
# View resource usage
docker stats

# View system memory
free -h
```

```powershell [Windows]
# View resource usage
docker stats

# View system memory
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10
```

:::

### Service Won't Start

::: code-group

```bash [Linux/macOS]
# View service status
systemctl status openchat.service

# Runtime health
./bin/openchat status --environment production
./bin/openchat health --environment production

# View logs
tail -f var/logs/production.stdout.log
```

```powershell [Windows]
# Runtime health
.\bin\openchat.ps1 status
Invoke-WebRequest -Uri http://127.0.0.1:7200/health
```

:::

## Upgrade

::: code-group

```bash [Linux/macOS]
# Backup data
make db-backup

# Pull latest code
git pull

# Apply patches and redeploy safely
./scripts/deploy-server.sh production --db-action patch --yes --service
```

```powershell [Windows]
# Pull latest code
git pull

# Apply patches and redeploy safely
.\scripts\deploy-server.ps1 production -DbAction patch -Yes
```

:::

## Uninstall

::: code-group

```bash [Linux/macOS]
# Use install script to uninstall
./scripts/install.sh uninstall

# Or manual uninstall
docker compose down -v
rm -rf /opt/openchat
```

```powershell [Windows]
# Manual uninstall
docker compose down -v
Remove-Item -Recurse -Force .\data
```

:::

## Next Steps

- [Configuration](../config/) - Detailed configuration parameters
- [API Documentation](../api/) - API reference
- [Overview](../guide/overview.md) - Understand the project architecture
