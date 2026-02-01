# Deployment Overview

OpenChat supports multiple deployment methods.

## Deployment Options

| Method | Scenario | Complexity |
|--------|----------|------------|
| [Docker Compose](./docker) | Development/Testing/Small Production | ⭐ |
| [Kubernetes](./kubernetes) | Large Production/Cloud Native | ⭐⭐⭐⭐ |
| [Traditional](./traditional) | Legacy Systems/Special Environments | ⭐⭐⭐ |
| [Quick Start](./quickstart) | One-click deployment | ⭐ |

## System Requirements

### Minimum

- CPU: 2 cores
- Memory: 4 GB
- Disk: 20 GB

### Recommended

- CPU: 4+ cores
- Memory: 8+ GB
- Disk: 50+ GB SSD

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | OpenChat API | REST API |
| 5100 | WuKongIM TCP | TCP connections |
| 5200 | WuKongIM WebSocket | WebSocket connections |
| 5300 | WuKongIM Admin | Admin panel |
| 5172 | WuKongIM Demo | Demo app |
