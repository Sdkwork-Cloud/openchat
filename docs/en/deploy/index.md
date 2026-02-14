# Deployment Overview

OpenChat provides multiple deployment options to meet different scenarios.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Installation Guide](./installation) | Detailed installation steps and system requirements |
| [Docker Deployment](./docker) | Docker deployment guide |
| [Kubernetes Deployment](./kubernetes) | Cluster deployment guide |
| [Traditional Deployment](./traditional) | Non-Docker deployment |
| [Quick Start](./quickstart) | Quick experience deployment |

## Deployment Methods

| Method | Use Case | Complexity |
|--------|----------|------------|
| Docker Compose | Development, testing, small-scale production | ⭐ |
| Docker Standalone | Production with existing infrastructure | ⭐⭐ |
| Kubernetes | Large-scale production, high availability | ⭐⭐⭐ |
| Traditional | Non-Docker environments | ⭐⭐⭐ |

## One-Click Installation

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash
```

## Quick Selection

### Development/Testing

Recommended: Docker Compose one-click deployment:

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services
docker compose up -d
```

### Production

Recommended: Installation wizard:

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.sh | bash

# Windows
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.bat" -OutFile "setup-wizard.bat"
.\setup-wizard.bat
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
# System pre-check
./scripts/precheck.sh

# Installation verification
./scripts/install-test.sh quick

# Error diagnosis
./scripts/diagnose.sh

# Auto-fix
./scripts/auto-fix.sh --all

# Log analysis
./scripts/log-analyzer.sh analyze

# Health monitoring
./scripts/health-check.sh --monitor
```

## Next Steps

- [Docker Deployment](./docker) - Detailed Docker Compose guide
- [Kubernetes Deployment](./kubernetes) - Cluster deployment
- [Traditional Deployment](./traditional) - Non-Docker deployment
- [Quick Start](./quickstart) - One-click deployment script
