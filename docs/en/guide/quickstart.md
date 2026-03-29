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
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| PostgreSQL | 15+ | Database |
| Redis | 7+ | Cache and queues |

## Pre-installation Check

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

## Installation Methods

### Method 1: Unified Host Deploy (Recommended)

::: code-group

```bash [Linux/macOS]
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
# edit .env.production as needed
./scripts/deploy-server.sh production --db-action auto --yes --service
```

```powershell [Windows]
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
# edit .env.production as needed
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

:::

### Method 2: Manual Low-Level Deployment

::: code-group

```bash [Linux/macOS]
./scripts/precheck.sh --mode standalone
npm ci
npm run build
./scripts/apply-db-patches.sh production
./bin/openchat start --environment production --host 127.0.0.1 --port 7200 --strict-port
```

```powershell [Windows]
.\scripts\precheck.ps1
npm ci
npm run build
.\scripts\apply-db-patches.ps1 -Environment production
.\bin\openchat.ps1 start --environment production --host 127.0.0.1 --port 7200 --strict-port
```

:::

## Verify Installation

### Check Runtime

::: code-group

```bash [Linux/macOS]
./bin/openchat status --environment production
./bin/openchat health --environment production
curl http://127.0.0.1:7200/health/ready
```

```powershell [Windows]
.\bin\openchat.ps1 status
Invoke-WebRequest -Uri http://127.0.0.1:7200/health
```

:::

### Test API

::: code-group

```bash [Linux/macOS]
# Health check
curl http://127.0.0.1:7200/health
curl http://127.0.0.1:7200/health/ready

# Expected response
# {"status":"ok",...}
```

```powershell [Windows]
# Health check
Invoke-WebRequest -Uri http://127.0.0.1:7200/health

# Expected response
# {"status":"ok",...}
```

:::

### Access Services

| Service | URL | Description |
|---------|-----|-------------|
| OpenChat API | http://127.0.0.1:7200 | Main API |
| API Docs | http://127.0.0.1:7200/im/v3/docs | Swagger docs |
| WukongIM Demo | http://localhost:5172 | IM demo page |
| WukongIM Admin | http://localhost:5300/web | IM admin panel |
| Prometheus | http://localhost:9090 | Monitoring |

## Your First Chat App

### 1. Register User

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/im/v3/auth/register \
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

Invoke-RestMethod -Uri http://localhost:3000/im/v3/auth/register `
    -Method POST -Headers $headers -Body $body
```

:::

### 2. Login to Get Token

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/im/v3/auth/login \
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

Invoke-RestMethod -Uri http://localhost:3000/im/v3/auth/login `
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
./scripts/precheck.sh --mode standalone

# Unified deploy or update
./scripts/deploy-server.sh production --db-action auto --yes --service

# Runtime
./bin/openchat restart --environment production
./bin/openchat status --environment production
./bin/openchat health --environment production
```

```powershell [Windows]
# System pre-check
.\scripts\precheck.ps1

# Unified deploy or update
.\scripts\deploy-server.ps1 production -DbAction auto -Yes

# Runtime
.\bin\openchat.ps1 restart
.\bin\openchat.ps1 status
Invoke-WebRequest -Uri http://127.0.0.1:7200/health
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
.\scripts\install-manager.ps1 status

# Run diagnosis
.\scripts\precheck.ps1

# Runtime health
.\bin\openchat.ps1 status
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
