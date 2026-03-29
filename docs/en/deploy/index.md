# Deployment Overview

OpenChat provides multiple deployment options to meet different scenarios.

## Quick Navigation

| Document                                   | Description                                         |
| ------------------------------------------ | --------------------------------------------------- |
| [Installation Guide](./installation.md)    | Detailed installation steps and system requirements |
| [Docker Deployment](./docker.md)           | Docker deployment guide                             |
| [Kubernetes Deployment](./kubernetes.md)   | Cluster deployment guide                            |
| [Traditional Deployment](./traditional.md) | Non-Docker deployment                               |
| [Quick Start](./quickstart.md)             | Quick experience deployment                         |
| [Monitoring and Alerting](./monitoring.md) | Prometheus/Grafana templates and alert rules        |

## Deployment Methods

| Method            | Use Case                                     | Complexity |
| ----------------- | -------------------------------------------- | ---------- |
| Docker Compose    | Development, testing, small-scale production | ⭐         |
| Docker Standalone | Production with existing infrastructure      | ⭐⭐       |
| Kubernetes        | Large-scale production, high availability    | ⭐⭐⭐     |
| Traditional       | Non-Docker environments                      | ⭐⭐⭐     |

## Recommended Host Deployment

```bash
# edit .env.production first
./scripts/deploy-server.sh production --db-action auto --yes --service
```

## Quick Selection

### Development/Testing

Recommended: Docker Compose quick deployment:

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Start all services
docker compose -f docker-compose.quick.yml up -d

```

### Production

Recommended: use the unified standalone deploy entrypoint on a host with PostgreSQL and Redis available:

```bash
# Clone the project
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Configure environment
vim .env.production

# Install, build, init/patch DB automatically, install systemd, restart service
./scripts/deploy-server.sh production --db-action auto --yes --service
```

## System Requirements

| Component | Minimum | Recommended |
| --------- | ------- | ----------- |
| CPU       | 2 cores | 4 cores     |
| Memory    | 4 GB    | 8 GB        |
| Disk      | 20 GB   | 50 GB SSD   |

## Software Dependencies

| Software       | Version  | Description                        |
| -------------- | -------- | ---------------------------------- |
| Docker         | 24.0+    | Container runtime                  |
| Docker Compose | 2.0+     | Container orchestration            |
| Node.js        | 20.19.0+ | Required for standalone deployment |
| PostgreSQL     | 15+      | Required for external database     |
| Redis          | 7+       | Required for external cache        |

## Operations Tools

OpenChat provides a complete set of operations tools:

```bash
# Pre-installation check
./scripts/precheck.sh --mode standalone

# Service runtime
./bin/openchat status --environment production
./bin/openchat health --environment production

# Linux service management
systemctl status openchat.service
systemctl restart openchat.service
```

## Next Steps

- [Docker Deployment](./docker.md) - Detailed Docker Compose guide
- [Kubernetes Deployment](./kubernetes.md) - Cluster deployment
- [Traditional Deployment](./traditional.md) - Non-Docker deployment
- [Quick Start](./quickstart.md) - One-click deployment script
- [Monitoring and Alerting](./monitoring.md) - Metrics, alerts, and dashboard templates
