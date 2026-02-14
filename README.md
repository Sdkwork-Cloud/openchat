<div align="center">

<img src="./docs/assets/images/branding/logo.png" width="150" alt="OpenChat Logo">

# OpenChat

**Open Source Instant Messaging Platform - Server, SDK & Application All-in-One**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E.svg?logo=nestjs)](https://nestjs.com/)
[![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED.svg?logo=docker)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?logo=redis)](https://redis.io/)
[![WukongIM](https://img.shields.io/badge/WukongIM-v2-orange.svg)](https://githubim.com/)

[English](README.md) | [中文](README_CN.md)

</div>

---

## 📖 Table of Contents

- [📖 Table of Contents](#-table-of-contents)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Docker Deployment (Recommended)](#docker-deployment-recommended)
- [✨ Features](#-features)
  - [💬 Instant Messaging](#-instant-messaging)
  - [🔊 Real-time Audio/Video](#-real-time-audiovideo)
  - [🤖 AI Assistant](#-ai-assistant)
  - [🔌 Third-party Integration](#-third-party-integration)
  - [🛠️ System Features](#️-system-features)
- [📁 Architecture](#-architecture)
- [🔧 Technology Stack](#-technology-stack)
- [📚 API Documentation](#-api-documentation)
- [🏗️ Project Structure](#️-project-structure)
- [🌐 Integration](#-integration)
- [⚡ Performance Optimization](#-performance-optimization)
- [🔒 Security](#-security)
- [📊 Monitoring & Logging](#-monitoring--logging)
- [📦 Deployment](#-deployment)
- [👨‍💻 Development Guide](#️-development-guide)
- [🧪 Testing](#-testing)
- [❓ Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [💬 Community](#-community)
- [📷 Screenshots](#-screenshots)

---

## 🚀 Quick Start

### Prerequisites

| Dependency | Version | Description |
|------------|---------|-------------|
| Docker | 24.0+ | Container runtime (recommended) |
| Docker Compose | 2.0+ | Container orchestration |
| Node.js | 18+ | Runtime environment (standalone) |
| PostgreSQL | 15+ | Primary database (external) |
| Redis | 7+ | Cache and message queue (external) |

### One-Click Installation (Recommended)

**Linux / macOS:**

```bash
# Quick install
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# Or clone and install
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

**Windows:**

```powershell
# Quick install
.\scripts\quick-install.bat

# Or PowerShell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

### Pre-Installation Check

```bash
# Linux / macOS
pnpm run precheck

# Windows
pnpm run precheck:win
```

The pre-check script will verify:
- Operating system and architecture
- Memory and disk space
- Docker and Docker Compose
- Port availability
- Network connectivity

### Docker Quick Start

```bash
# Quick start (all services in one command)
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
vim .env

# Start with Docker
pnpm run docker:quick

# Or start in development mode
pnpm run dev
```

### Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api/docs

# Run health check script
pnpm run health
```

### Access Points

After installation, access the following services:

| Service | URL |
|---------|-----|
| OpenChat API | http://localhost:3000 |
| API Documentation | http://localhost:3000/api/docs |
| Health Check | http://localhost:3000/health |
| WukongIM Demo | http://localhost:5172 |
| WukongIM Admin | http://localhost:5300/web |

---

## ✨ Features

### 💬 Instant Messaging

| Feature | Status | Description |
|---------|--------|-------------|
| One-on-one Chat | ✅ | Private messaging |
| Group Chat | ✅ | Support up to 500 members |
| Message Recall | ✅ | Recall within 2 minutes |
| Read Receipts | ✅ | Message read status |
| Multimedia Messages | ✅ | Text, images, voice, video, files |
| Message Search | ✅ | Full-text search history |
| Offline Push | ✅ | Offline message notifications |

### 🔊 Real-time Audio/Video

| Feature | Status | Description |
|---------|--------|-------------|
| Audio Calls | ✅ | HD voice calls |
| Video Calls | ✅ | 1080P video calls |
| Screen Sharing | ✅ | Desktop/window sharing |
| Group Calls | ✅ | Multi-party video conferencing |
| Recording & Playback | ✅ | Call recording and playback |

### 🤖 AI Assistant

| Feature | Status | Description |
|---------|--------|-------------|
| GPT Integration | ✅ | Built-in ChatGPT support |
| Smart Customer Service | ✅ | Automated Q&A bot |
| AI Bot | ✅ | Custom AI robots |
| Multi-model Support | ✅ | OpenAI, Claude, etc. |

### 🔌 Third-party Integration

| Feature | Status | Description |
|---------|--------|-------------|
| Telegram | ✅ | Message sync |
| WhatsApp | ✅ | Message sync |
| Webhook | ✅ | Custom integration |
| Open API | ✅ | RESTful API |

### 🛠️ System Features

| Feature | Status | Description |
|---------|--------|-------------|
| User Management | ✅ | Registration, login, profile |
| Friend System | ✅ | Add, delete, group management |
| Group System | ✅ | Create, member management, permissions |
| WebSocket | ✅ | Real-time message push |
| Distributed Deployment | ✅ | Cluster deployment support |
| Performance Monitoring | ✅ | Prometheus metrics |
| Security Authentication | ✅ | JWT + RBAC |
| Rate Limiting | ✅ | Abuse prevention |

---

## 📁 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│   Web App    │  PC Client   │  Mobile App  │ Mini Program │   IoT Device   │
│   (React)    │   (Tauri)    │  (React Nat) │   (WeChat)   │    (ESP32)     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │              │                │
       └──────────────┴──────────────┴──────────────┴────────────────┘
                                    │
                                    │ WebSocket / HTTP
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Service Layer (NestJS)                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬───────────────┐  │
│  │    Auth     │    User     │   Message   │    Group    │      RTC      │  │
│  │  Auth & Auth│   Mgmt      │   Service   │   Mgmt      │   Audio/Video │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┴───────────────┘  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬───────────────┐  │
│  │   Friend    │   Contact   │   AI Bot    │  ThirdParty │      IoT      │  │
│  │   Mgmt      │   List      │   Service   │ Integration │   Devices     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┴───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SDK / API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Message Layer (WukongIM)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Connection │  Message   │   Offline   │  Message   │    Online        ││
│  │  Management │  Routing   │   Storage   │   Sync     │    Status        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  PostgreSQL  │    Redis     │    MinIO     │ Elasticsearch│ Prometheus│  │
│  │  Primary DB  │ Cache/Queue  │ Obj Storage  │   Search     │ Monitoring│  │
│  └──────────────┴──────────────┴──────────────┴──────────────┴───────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### Backend

| Technology | Version | Description |
|------------|---------|-------------|
| [NestJS](https://nestjs.com/) | 11.x | Enterprise Node.js framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.9+ | Type-safe JavaScript |
| [TypeORM](https://typeorm.io/) | 0.3.x | Powerful ORM framework |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | High-performance RDBMS |
| [Redis](https://redis.io/) | 7+ | In-memory database & queue |
| [BullMQ](https://docs.bullmq.io/) | 5.x | Message queue |
| [Socket.IO](https://socket.io/) | 4.x | Real-time communication |
| [WukongIM](https://githubim.com/) | v2 | Professional IM engine |
| [Passport](http://www.passportjs.org/) | 0.7+ | Authentication middleware |
| [JWT](https://jwt.io/) | - | Token-based authentication |

### DevOps

| Technology | Description |
|------------|-------------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Kubernetes | Cluster orchestration |
| Prometheus | Monitoring & alerting |
| GitHub Actions | CI/CD |

---

## 📚 API Documentation

### Swagger UI

Start the server and navigate to:

```
http://localhost:3000/api/docs
```

### API Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| Authentication | `/api/auth/*` | Login, register, token refresh |
| Users | `/api/users/*` | User info, profile management |
| Messages | `/api/messages/*` | Send messages, query history |
| Groups | `/api/groups/*` | Group creation, member management |
| Friends | `/api/friends/*` | Friend requests, list management |
| Contacts | `/api/contacts/*` | Contact management |
| RTC | `/api/rtc/*` | Call signaling, room management |

### Full API Documentation

For detailed API documentation, please refer to [API Documentation](./docs/api/index.md)

---

## 🏗️ Project Structure

```
openchat/
├── 📁 src/                        # Server source code
│   ├── 📁 common/                 # Common modules
│   │   ├── 📁 auth/               # Authentication & authorization
│   │   │   ├── guards/            # Auth guards
│   │   │   ├── strategies/        # Auth strategies
│   │   │   ├── auth-manager.service.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── token-blacklist.service.ts
│   │   ├── 📁 base/               # Base classes
│   │   ├── 📁 cache/              # Cache services
│   │   ├── 📁 config/             # Configuration management
│   │   ├── 📁 constants/          # Constants definition
│   │   ├── 📁 dto/                # Data transfer objects
│   │   ├── 📁 events/             # Event bus
│   │   ├── 📁 exceptions/         # Exception handling
│   │   ├── 📁 filters/            # Filters
│   │   ├── 📁 health/             # Health checks
│   │   ├── 📁 interceptors/       # Interceptors
│   │   ├── 📁 logger/             # Logging services
│   │   ├── 📁 metrics/            # Performance monitoring
│   │   ├── 📁 queue/              # Message queue
│   │   ├── 📁 redis/              # Redis services
│   │   ├── 📁 throttler/          # Rate limiting
│   │   └── 📁 utils/              # Utility functions
│   ├── 📁 gateways/               # WebSocket gateways
│   ├── 📁 modules/                # Business modules
│   │   ├── 📁 agent/              # Intelligent agents
│   │   ├── 📁 ai-bot/             # AI bots
│   │   ├── 📁 bot-platform/       # Bot platform
│   │   ├── 📁 contact/            # Contacts
│   │   ├── 📁 conversation/       # Conversations
│   │   ├── 📁 friend/             # Friends system
│   │   ├── 📁 group/              # Groups system
│   │   ├── 📁 im-provider/        # IM providers
│   │   ├── 📁 iot/                # IoT
│   │   ├── 📁 message/            # Messages system
│   │   ├── 📁 rtc/                # Real-time communication
│   │   ├── 📁 third-party/        # Third-party integration
│   │   ├── 📁 user/               # User system
│   │   └── 📁 wukongim/           # WukongIM integration
│   ├── app.module.ts              # Application module
│   ├── bootstrap.ts               # Bootstrap
│   ├── data-source.ts             # Data source config
│   └── main.ts                    # Entry point
├── 📁 sdk/                        # SDK directory
│   ├── 📁 typescript/             # TypeScript SDK
│   ├── 📁 android/                # Android SDK
│   ├── 📁 ios/                    # iOS SDK
│   ├── 📁 flutter/                # Flutter SDK
│   ├── 📁 python/                 # Python SDK
│   └── 📁 nodejs/                 # Node.js SDK
├── 📁 app/                        # Applications
│   ├── 📁 openchat/               # Main app
│   ├── 📁 openchat-admin/         # Admin panel
│   ├── 📁 openchat-react-mobile/  # Mobile app
│   └── 📁 openchat-react-pc/      # PC client
├── 📁 docs/                       # Documentation
│   ├── 📁 assets/                 # Assets
│   │   ├── 📁 images/             # Images
│   │   │   ├── 📁 branding/       # Branding
│   │   │   │   └── logo.png       # Project logo
│   │   │   ├── 📁 screenshots/    # Screenshots
│   │   │   └── 📁 social/         # Social media
│   │   │       └── wechat-qr.png  # WeChat QR code
│   │   ├── 📁 videos/             # Videos
│   │   └── 📁 icons/              # Icons
│   ├── 📁 api/                    # API docs
│   ├── 📁 guide/                  # User guide
│   └── 📁 sdk/                    # SDK docs
├── 📁 database/                   # Database
│   ├── schema.sql                 # Database schema
│   ├── seed.sql                   # Seed data
│   └── indexes-optimization.sql   # Index optimization
├── 📁 k8s/                        # Kubernetes configs
│   ├── 📁 base/                   # Base configs
│   └── 📁 overlays/               # Environment configs
├── 📁 scripts/                    # Scripts
│   ├── quick-start.sh             # Quick start
│   ├── install.sh                 # Installation (Linux/macOS)
│   ├── install.bat                # Installation (Windows)
│   ├── setup-wizard.sh            # Interactive setup wizard
│   ├── install-manager.sh         # Installation state manager
│   ├── install-test.sh            # Installation verification
│   ├── precheck.sh                # System pre-check
│   ├── diagnose.sh                # Error diagnosis
│   ├── auto-fix.sh                # Auto-fix tool
│   ├── log-analyzer.sh            # Log analysis
│   ├── health-check.sh            # Health monitoring
│   ├── post-install.sh            # Post-installation config
│   └── uninstall.sh               # Uninstall script
├── 📁 test/                       # Tests
│   ├── __mocks__/                 # Mock files
│   ├── app.e2e-spec.ts            # E2E tests
│   └── setup.ts                   # Test config
├── 📁 xiaozhi-esp32/              # ESP32 IoT firmware
├── .env.example                   # Environment example
├── docker-compose.yml             # Docker compose
├── Dockerfile                     # Docker image
├── jest.config.js                 # Jest config
├── package.json                   # Package config
├── tsconfig.json                  # TypeScript config
├── LICENSE                        # License
├── README.md                      # English docs
└── README_CN.md                   # Chinese docs
```

---

## 🌐 Integration

### WukongIM Integration

OpenChat is deeply integrated with WukongIM for reliable real-time messaging:

| Feature | Description |
|---------|-------------|
| Message Sending | All messages sent through WukongIM |
| User Sync | Local database syncs with WukongIM user data |
| Group Sync | Bidirectional group data synchronization |
| Message Confirmation | Delivery confirmation and read receipts |
| Online Status | Real-time online status management |

### Third-party Services

| Service | Status | Description |
|---------|--------|-------------|
| Telegram | ✅ | Message sync |
| WhatsApp | ✅ | Message sync |
| Webhook | ✅ | Custom integration |

---

## ⚡ Performance Optimization

### Database Optimization

- **Connection Pool Management**: Optimized pool size and timeout settings
- **Index Optimization**: Key field indexing, 10x query performance improvement
- **Batch Operations**: Batch insert and update, reduced database round trips

### Caching Strategy

- **Redis Cache**: Hot data caching, reduced database queries
- **Local Cache**: LRU cache, reduced network overhead
- **Cache Warmup**: Preload hot data on startup

### Message Processing

- **Message Queue**: Asynchronous processing of time-consuming operations
- **Batch Sending**: Group message batch processing
- **Exponential Backoff Retry**: Improved message sending reliability

### Concurrency Control

- **Rate Limiting**: Prevent system overload
- **Concurrency Limit**: Control concurrent request count
- **Graceful Degradation**: Auto degradation under high load

---

## 🔒 Security

### Authentication & Authorization

| Feature | Description |
|---------|-------------|
| JWT Authentication | Secure user authentication mechanism |
| Multi-factor Auth | Support multiple authentication methods |
| Token Blacklist | Support active logout |
| RBAC Permissions | Role-based access control |

### Security Protection

| Feature | Description |
|---------|-------------|
| CORS Configuration | Cross-origin resource sharing settings |
| Helmet Security Headers | Enhanced application security |
| Input Validation | Prevent malicious input |
| Rate Limiting | Prevent brute force attacks |
| Sensitive Data Masking | Automatic log masking |

---

## 📊 Monitoring & Logging

### Performance Monitoring

- **Prometheus Metrics**: Real-time system performance metrics collection
- **Health Checks**: System health status checks
- **Performance Tracing**: Request latency tracing

### Log Management

- **Structured Logging**: JSON format log output
- **Log Levels**: Support debug/info/warn/error levels
- **Log Files**: Support file output and log rotation
- **Request Tracing**: Request ID tracing

---

## 📦 Deployment

### Docker Compose Deployment (Recommended)

```bash
# Development environment (includes PostgreSQL, Redis, WukongIM, Prometheus)
docker compose up -d

# Production environment
docker compose -f docker-compose.prod.yml up -d

# Using external database and Redis
docker compose -f docker-compose.external-db.yml up -d

# Scale services
docker compose up -d --scale app=3
```

### Docker Standalone Deployment

```bash
# Build image
docker build -t openchat/server:latest .

# Run container (requires external PostgreSQL and Redis)
docker run -d \
  --name openchat \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USER=openchat \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=openchat \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your-jwt-secret \
  openchat/server:latest
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
kubectl apply -k k8s/overlays/production

# Check deployment status
kubectl get pods -n openchat
```

---

## 👨‍💻 Development Guide

### Code Style

- Use TypeScript strict mode
- Follow NestJS code style guidelines
- Use ESLint + Prettier for code quality

### Development Commands

```bash
# Start development server
pnpm run start:dev

# Code formatting
pnpm run format

# Linting
pnpm run lint

# Type checking
pnpm run typecheck
```

### Database Migration

```bash
# Generate migration file
pnpm run migration:generate -- -n MigrationName

# Run migration
pnpm run migration:run

# Revert migration
pnpm run migration:revert
```

---

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run test coverage
pnpm run test:cov

# Run E2E tests
pnpm run test:e2e

# Watch mode
pnpm run test:watch
```

---

## ❓ Troubleshooting

### Diagnostic Tools

OpenChat provides a comprehensive set of diagnostic and repair tools:

```bash
# System pre-check
./scripts/precheck.sh

# Run diagnostics
./scripts/diagnose.sh

# Auto-fix common issues
./scripts/auto-fix.sh --all

# Analyze logs
./scripts/log-analyzer.sh analyze

# Health monitoring
./scripts/health-check.sh --monitor
```

### Common Issues

#### WukongIM Connection Issues

1. Check if WukongIM server is running: `docker ps | grep wukongim`
2. Verify `WUKONGIM_API_URL` configuration
3. Check network connectivity: `./scripts/diagnose.sh --network`

#### Database Connection Issues

1. Ensure PostgreSQL service is running: `docker ps | grep postgres`
2. Verify database configuration in `.env`
3. Check database user permissions
4. Run: `./scripts/auto-fix.sh --database`

#### Redis Connection Issues

1. Check if Redis service is running: `docker ps | grep redis`
2. Verify Redis configuration
3. Run: `./scripts/auto-fix.sh --redis`

#### Container Issues

1. Check container status: `docker compose ps`
2. View container logs: `./scripts/log-analyzer.sh containers`
3. Restart containers: `./scripts/auto-fix.sh --containers`

#### Installation Issues

1. Check installation state: `./scripts/install-manager.sh status`
2. Resume interrupted installation: `./scripts/install-manager.sh resume`
3. Reset installation: `./scripts/install-manager.sh reset`

For detailed troubleshooting guide, see [Installation Documentation](./docs/deploy/installation.md)

---

## 🤝 Contributing

We welcome all forms of contributions!

### Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing

### Contribution Guide

For detailed contribution guidelines, please refer to [Contributing Guide](CONTRIBUTING.md)

---

## 📄 License

OpenChat is open source software licensed under the [AGPL-3.0 License](LICENSE).

---

## 💬 Community

Join our community to get help, share ideas, and contribute to the project!

| Platform | Link |
|----------|------|
| GitHub Discussions | [![GitHub Discussions](https://img.shields.io/badge/GitHub%20Discussions-181717?logo=github&logoColor=white)](https://github.com/Sdkwork-Cloud/openchat/discussions) |
| X (Twitter) | [![X](https://img.shields.io/badge/X-1DA1F2?logo=x&logoColor=white)](https://x.com/openchat_cloud) |
| Discord | [![Discord](https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white)](https://discord.gg/openchat) |
| WeChat Official Account | Scan the QR code below |
| Email | [![Email](https://img.shields.io/badge/Email-D14836?logo=gmail&logoColor=white)](mailto:contact@sdkwork.com) |

<div align="center">
  <img src="./docs/assets/images/social/wechat-qr.png" width="200" alt="WeChat Official Account QR Code">
  <p>OpenChat Official Account</p>
</div>

---

## 📷 Screenshots

<div align="center">

### Web Interface

<img src="./docs/assets/images/screenshots/web/chat.png" width="300" alt="Web Chat Interface">
<img src="./docs/assets/images/screenshots/web/group.png" width="300" alt="Web Group Interface">

### Mobile Interface

<img src="./docs/assets/images/screenshots/mobile/chat.png" width="200" alt="Mobile Chat Interface">
<img src="./docs/assets/images/screenshots/mobile/profile.png" width="200" alt="Mobile Profile Interface">

### Video Call

<img src="./docs/assets/images/screenshots/video/call.png" width="300" alt="Video Call Interface">

</div>

---

<div align="center">

**If you find this project helpful, please give us a ⭐ Star!**

[![Star History Chart](https://api.star-history.com/svg?repos=Sdkwork-Cloud/openchat&type=Date)](https://star-history.com/#Sdkwork-Cloud/openchat&Date)

---

© 2024 Sdkwork Cloud. All rights reserved.

</div>
