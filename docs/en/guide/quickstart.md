# Quick Start

This guide will help you set up and run OpenChat in 5 minutes.

## Requirements

Before starting, ensure your system meets these requirements:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| Memory | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |
| OS | Linux/macOS/Windows | Linux |

### Software Dependencies

| Software | Version | Description |
|----------|---------|-------------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.0+ | Container orchestration |

## Pre-installation Check

::: code-group

```bash [Linux/macOS]
# Run pre-check script
pnpm run precheck
```

```powershell [Windows]
# Run pre-check script
pnpm run precheck:win
```

:::

## Installation Methods

### Method 1: One-click Install (Recommended)

::: code-group

```bash [Linux/macOS]
# Quick install
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# Or clone and install
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

```powershell [Windows]
# Quick install
.\scripts\quick-install.bat

# Or PowerShell full install
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
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

# Or use npm script
pnpm run docker:quick

# View service status
docker compose -f docker-compose.quick.yml ps
```

```powershell [Windows]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services with one command
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick

# View service status
docker compose -f docker-compose.quick.yml ps
```

:::

### Method 3: Docker Dev Environment (Flexible)

Use `docker-compose.yml` for flexible configuration with optional service profiles:

::: code-group

```bash [Linux/macOS]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment variables
cp .env.example .env
vim .env

# Start all services (database+Redis+IM+app)
docker compose --profile database --profile cache --profile im up -d

# Or use npm script
pnpm run docker:up

# Start only the app (use external database)
docker compose up -d

# View service status
docker compose ps
```

```powershell [Windows]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment variables
copy .env.example .env
notepad .env

# Start all services (database+Redis+IM+app)
docker compose --profile database --profile cache --profile im up -d

# Or use npm script
pnpm run docker:up

# Start only the app (use external database)
docker compose up -d

# View service status
docker compose ps
```

:::

### Method 4: Manual Deployment

::: code-group

```bash [Linux/macOS]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment
cp .env.example .env
vim .env

# Start services
docker compose up -d
```

```powershell [Windows]
# Clone project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment
copy .env.example .env
notepad .env

# Start services
docker compose up -d
```

:::

## Verify Installation

### Run Installation Tests

::: code-group

```bash [Linux/macOS]
# Quick test
./scripts/install-test.sh quick

# Full test
./scripts/install-test.sh full
```

```powershell [Windows]
# Quick test
pnpm run test:install

# Full test
pnpm run test:install:full
```

:::

### Test API

::: code-group

```bash [Linux/macOS]
# Health check
curl http://localhost:3000/health

# Expected response
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

```powershell [Windows]
# Health check
Invoke-WebRequest -Uri http://localhost:3000/health

# Expected response
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

:::

### Access Services

| Service | URL | Description |
|---------|-----|-------------|
| OpenChat API | http://localhost:3000 | Main API |
| API Docs | http://localhost:3000/api/docs | Swagger docs |
| WukongIM Demo | http://localhost:5172 | IM demo page |
| WukongIM Admin | http://localhost:5300/web | IM admin panel |
| Prometheus | http://localhost:9090 | Monitoring |

## Your First Chat App

### 1. Register User

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123",
    "nickname": "User 1"
  }'
```

```powershell [Windows]
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    username = "user1"
    password = "password123"
    nickname = "User 1"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/auth/register `
    -Method POST -Headers $headers -Body $body
```

:::

### 2. Login to Get Token

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

```powershell [Windows]
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    username = "user1"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/auth/login `
    -Method POST -Headers $headers -Body $body
```

:::

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "User 1"
    }
  }
}
```

### 3. Use SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    tcpAddr: 'localhost:5100',
    wsUrl: 'ws://localhost:5200'
  }
});

// Initialize
await client.init();

// Login
await client.auth.login({
  username: 'user1',
  password: 'password123'
});

// Send message
await client.message.send({
  to: 'user2',
  type: 'text',
  content: 'Hello, OpenChat!'
});
```

## Operations Tools

OpenChat provides a complete set of operations tools:

::: code-group

```bash [Linux/macOS]
# System pre-check
./scripts/precheck.sh

# Error diagnosis
./scripts/diagnose.sh

# Auto fix
./scripts/auto-fix.sh --all

# Log analysis
./scripts/log-analyzer.sh analyze

# Health monitoring
./scripts/health-check.sh --monitor
```

```powershell [Windows]
# System pre-check
pnpm run precheck

# Error diagnosis
pnpm run diagnose

# Auto fix
pnpm run auto-fix

# Health monitoring
pnpm run health:monitor
```

:::

## Common Issues

### Port Conflict

If port is in use, modify port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Map host 3001 to container 3000
```

### Firewall Configuration

::: code-group

```bash [Ubuntu/Debian (ufw)]
# Open ports
sudo ufw allow 3000/tcp
sudo ufw allow 5100/tcp
sudo ufw allow 5200/tcp

# Enable firewall
sudo ufw enable
```

```bash [CentOS/RHEL (firewalld)]
# Open ports
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5100/tcp
sudo firewall-cmd --permanent --add-port=5200/tcp

# Reload firewall
sudo firewall-cmd --reload
```

```powershell [Windows]
# Open ports (Admin privileges)
New-NetFirewallRule -DisplayName "OpenChat API" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OpenChat TCP" -Direction Inbound -Port 5100 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OpenChat WS" -Direction Inbound -Port 5200 -Protocol TCP -Action Allow
```

:::

### Installation Failed

::: code-group

```bash [Linux/macOS]
# Check installation status
./scripts/install-manager.sh status

# Resume installation
./scripts/install-manager.sh resume

# Run diagnosis
./scripts/diagnose.sh

# Auto fix
./scripts/auto-fix.sh --all
```

```powershell [Windows]
# Check installation status
pnpm run install:status

# Run diagnosis
pnpm run diagnose

# Auto fix
pnpm run auto-fix
```

:::

## Next Steps

- [Overview](./overview.md) - Learn about OpenChat's core features
- [Architecture](./architecture.md) - Understand the system architecture
- [API Documentation](/en/api/) - View complete API docs
- [SDK Documentation](/en/sdk/) - Learn how to use the SDK

## Get Help

- 💬 [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- 🐛 [Issue Report](https://github.com/Sdkwork-Cloud/openchat/issues)
- 📧 Email: contact@sdkwork.com
