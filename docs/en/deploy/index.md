# Deployment Overview

OpenChat provides multiple deployment options to meet different scenarios.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Installation Guide](./installation.md) | Detailed installation steps and system requirements |
| [Docker Deployment](./docker.md) | Docker deployment guide |
| [Kubernetes Deployment](./kubernetes.md) | Cluster deployment guide |
| [Traditional Deployment](./traditional.md) | Non-Docker deployment |
| [Quick Start](./quickstart.md) | Quick experience deployment |

## Deployment Methods

| Method | Use Case | Complexity |
|--------|----------|------------|
| Docker Compose | Development, testing, small-scale production | ⭐ |
| Docker Standalone | Production with existing infrastructure | ⭐⭐ |
| Kubernetes | Large-scale production, high availability | ⭐⭐⭐ |
| Traditional | Non-Docker environments | ⭐⭐⭐ |

## One-Click Installation

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# Windows
.\scripts\quick-install.bat
```

## Quick Selection

### Development/Testing

Recommended: Docker Compose one-click deployment:

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick
```

### Production

Recommended: Use production configuration:

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment
cp .env.example .env
vim .env

# Start with production config
docker compose -f docker-compose.prod.yml up -d
```

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| Memory | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |

## Software Dependencies

| Software | Version | Description |
|----------|---------|-------------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.0+ | Container orchestration |
| Node.js | 18+ | Required for standalone deployment |
| PostgreSQL | 15+ | Required for external database |
| Redis | 7+ | Required for external cache |

## Operations Tools

OpenChat provides a complete set of operations tools:

```bash
# Pre-installation check
pnpm run precheck

# Health check
pnpm run health

# Full diagnosis
pnpm run health:full

# View logs
pnpm run docker:logs

# Service management
pnpm run docker:up      # Start services
pnpm run docker:down    # Stop services
pnpm run docker:ps      # View status
```

## Next Steps

- [Docker Deployment](./docker.md) - Detailed Docker Compose guide
- [Kubernetes Deployment](./kubernetes.md) - Cluster deployment
- [Traditional Deployment](./traditional.md) - Non-Docker deployment
- [Quick Start](./quickstart.md) - One-click deployment script
