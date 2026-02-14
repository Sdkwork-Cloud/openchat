# Quick Start

This guide will help you set up and run OpenChat in 5 minutes.

## Requirements

Before you begin, make sure your system meets the following requirements:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| Memory | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |
| OS | Linux/macOS/Windows(WSL2) | Linux |

### Software Dependencies

| Software | Version | Description |
|----------|---------|-------------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.0+ | Container orchestration |

## Installation Methods

### Method 1: Installation Wizard (Recommended)

**Linux / macOS:**

```bash
# Download and run the installation wizard
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.sh | bash

# Or clone and run
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/setup-wizard.sh
```

**Windows:**

```powershell
# Download and run the installation wizard
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.bat" -OutFile "setup-wizard.bat"
.\setup-wizard.bat
```

The installation wizard will guide you through:
1. Select installation environment (Development/Test/Production)
2. Select installation mode (Docker/Standalone/Hybrid)
3. Configure database connection
4. Configure Redis connection
5. Auto-generate configuration files
6. Start services

### Method 2: Docker Compose

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services
docker compose up -d

# Check service status
docker compose ps
```

### Method 3: Manual Deployment

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment variables
cp .env.production .env
vim .env

# Start services
docker compose up -d
```

## Verify Installation

### Run Installation Tests

```bash
# Quick test
./scripts/install-test.sh quick

# Full test
./scripts/install-test.sh full
```

### Test API

```bash
# Test health check
curl http://localhost:3000/health

# Expected response
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### Access Services

| Service | URL | Description |
|---------|-----|-------------|
| OpenChat API | http://localhost:3000 | Main API |
| API Docs | http://localhost:3000/api/docs | Swagger documentation |
| WukongIM Demo | http://localhost:5172 | IM demo page |
| WukongIM Admin | http://localhost:5300/web | IM admin panel |
| Prometheus | http://localhost:9090 | Monitoring dashboard |

## Your First Chat Application

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123",
    "nickname": "User One"
  }'
```

### 2. Login to Get Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

Response example:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "User One"
    }
  }
}
```

### 3. Use the SDK

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

```bash
# System pre-check
./scripts/precheck.sh

# Error diagnosis
./scripts/diagnose.sh

# Auto-fix
./scripts/auto-fix.sh --all

# Log analysis
./scripts/log-analyzer.sh analyze

# Health monitoring
./scripts/health-check.sh --monitor
```

## Troubleshooting

### Port Conflicts

If you see port conflicts, modify the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Map host 3001 to container 3000
```

### Firewall Configuration

Make sure the following ports are open:

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 5100/tcp
sudo ufw allow 5200/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### Installation Failed

```bash
# Check installation status
./scripts/install-manager.sh status

# Resume installation
./scripts/install-manager.sh resume

# Run diagnostics
./scripts/diagnose.sh

# Auto-fix
./scripts/auto-fix.sh --all
```

## Next Steps

- [Overview](./overview) - Learn about OpenChat's core features
- [Architecture](./architecture) - Understand the system architecture
- [API Documentation](/en/api/) - View complete API documentation
- [SDK Documentation](/en/sdk/) - Learn how to use the SDK

## Get Help

- 💬 [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- 🐛 [Issue Tracker](https://github.com/Sdkwork-Cloud/openchat/issues)
- 📧 Email: contact@sdkwork.com
