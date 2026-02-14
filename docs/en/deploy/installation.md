# OpenChat Server Installation Guide

## System Requirements

### Hardware Requirements

| Environment | CPU | Memory | Disk |
|-------------|-----|--------|------|
| Development | 2 cores | 4GB | 20GB |
| Testing | 4 cores | 8GB | 50GB |
| Production | 8+ cores | 16GB+ | 100GB+ |

### Software Requirements

| Software | Version |
|----------|---------|
| Docker | 24.0+ |
| Docker Compose | 2.0+ |
| Node.js | 18+ (development mode) |
| PostgreSQL | 15+ (external database) |
| Redis | 7+ (external cache) |

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

## Quick Installation

### One-Click Install (Recommended)

**Linux / macOS:**

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# Or clone and run
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

**Windows:**

```powershell
# Quick install
.\scripts\quick-install.bat

# Or PowerShell full install
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

### Docker Quick Start

```bash
# Start all services in one command
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

### Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Run health check script
pnpm run health

# Full diagnosis
pnpm run health:full
```

## Installation Modes

### 1. Docker Quick Mode (Recommended for Beginners)

The simplest installation method, suitable for quick experience and development testing.

```bash
# Use quick configuration
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick
```

**Features:**
- Automatically installs all dependency services
- Ready to use out of the box
- Easy to manage and maintain

### 2. External Services Mode

Use external database and Redis, suitable for production environments.

```bash
# Configure external services
cp .env.example .env

# Edit configuration
DB_HOST=your-db-host
DB_PORT=5432
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# Start
docker compose -f docker-compose.external-db.yml up -d
```

### 3. Standalone Mode

Run directly on the server, suitable for scenarios requiring fine control.

```bash
# Using installation script
sudo ./scripts/install.sh standalone

# Or manual installation
npm install
npm run build
npm run start:prod
```

## Environment Configuration

### Required Configuration

```bash
# Server IP (required for audio/video calls)
EXTERNAL_IP=your-server-ip

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your-secure-password
DB_NAME=openchat

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# JWT secret (at least 32 characters)
JWT_SECRET=your-jwt-secret-at-least-32-characters
```

### Optional Configuration

```bash
# WukongIM configuration
WUKONGIM_API_URL=http://localhost:5001
WUKONGIM_TCP_ADDR=localhost:5100
WUKONGIM_WS_URL=ws://localhost:5200
WUKONGIM_TOKEN_AUTH=false

# Logging configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Security configuration
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX=100
```

## Post-Installation Configuration

### 1. Security Configuration

```bash
# Generate strong password
openssl rand -base64 24

# Generate JWT secret
openssl rand -base64 32

# Update .env file
vim .env
```

### 2. Firewall Configuration

```bash
# Open necessary ports
# Application port
firewall-cmd --permanent --add-port=3000/tcp

# WukongIM ports
firewall-cmd --permanent --add-port=5001/tcp
firewall-cmd --permanent --add-port=5100/tcp
firewall-cmd --permanent --add-port=5200/tcp

# Reload firewall
firewall-cmd --reload
```

### 3. SSL Configuration

```bash
# Create SSL directory
mkdir -p etc/nginx/ssl

# Copy certificates
cp your-cert.pem etc/nginx/ssl/cert.pem
cp your-key.pem etc/nginx/ssl/key.pem

# Enable HTTPS configuration
mv etc/nginx/conf.d/ssl.conf.example etc/nginx/conf.d/ssl.conf

# Restart Nginx
docker compose restart nginx
```

## Verify Installation

### Health Check

```bash
# Quick check
./scripts/health-check.sh quick

# Full diagnosis
./scripts/health-check.sh full

# Check specific services
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh wukongim
```

### Access Test

```bash
# API health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api/docs

# WukongIM admin panel
open http://localhost:5300/web
```

## Common Issues

### Port Already in Use

```bash
# Check port usage
lsof -i :3000

# Change port
# Edit PORT configuration in .env file
```

### Database Connection Failed

```bash
# Check database status
docker compose ps postgres

# View database logs
docker compose logs postgres

# Test connection
docker exec -it openchat-postgres psql -U openchat -d openchat
```

### Insufficient Memory

```bash
# View resource usage
docker stats

# Adjust resource limits
# Edit *_MEMORY_LIMIT configuration in .env file
```

### Service Won't Start

```bash
# View logs
docker compose logs app

# Run diagnostics
./scripts/health-check.sh full

# Try auto-fix
./scripts/auto-fix.sh
```

## Upgrade

```bash
# Backup data
make db-backup

# Pull latest code
git pull

# Update services
make update
```

## Uninstall

```bash
# Using installation script
./scripts/install.sh uninstall

# Or manual uninstall
docker compose down -v
rm -rf /opt/openchat
```

## Next Steps

- [Configuration](../config/) - Detailed configuration parameters
- [API Documentation](../api/) - API reference
- [Development Guide](../development/) - Development guide
