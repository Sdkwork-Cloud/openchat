# Overview

OpenChat is an **open source instant messaging solution** that provides a complete technology stack from server to client, helping developers quickly build enterprise-level instant messaging applications.

## What is OpenChat?

OpenChat is not just a chat server, it's a **complete instant messaging ecosystem**:

- **Server** - High-performance backend service based on NestJS
- **SDK** - Multi-language client SDKs (TypeScript, Java, Go, Python)
- **Applications** - Ready-to-use sample applications (Web, PC, Mobile)
- **Integration** - Deep integration with WukongIM, supports third-party platforms

## Core Features

### 🚀 Instant Messaging

| Feature | Status | Description |
|---------|--------|-------------|
| One-on-one Chat | ✅ | Private messaging |
| Group Chat | ✅ | Support up to 500 members |
| Message Recall | ✅ | Recall within 2 minutes |
| Read Receipts | ✅ | Message read status |
| Multimedia Messages | ✅ | Text, image, voice, video, file |
| Message Search | ✅ | Full-text search history |
| Offline Push | ✅ | Offline message notifications |

### 🔊 Real-time Audio/Video

| Feature | Status | Description |
|---------|--------|-------------|
| Audio Calls | ✅ | HD voice calls |
| Video Calls | ✅ | 1080P video calls |
| Screen Sharing | ✅ | Desktop/window sharing |
| Group Calls | ✅ | Multi-party video conferencing |
| Recording | ✅ | Call recording and playback |

### 🤖 AI Assistant

| Feature | Status | Description |
|---------|--------|-------------|
| GPT Integration | ✅ | Built-in ChatGPT support |
| Smart Customer Service | ✅ | Auto-reply bot |
| AI Bot | ✅ | Custom AI bots |
| Multi-model Support | ✅ | Support OpenAI, Claude, etc. |

### 🔌 Third-party Integration

| Feature | Status | Description |
|---------|--------|-------------|
| Telegram | ✅ | Message sync |
| WhatsApp | ✅ | Message sync |
| Webhook | ✅ | Custom integration |
| Open API | ✅ | RESTful API |

## Architecture

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
│  │  Auth/AuthZ │   User Mgmt │   Message   │   Group Mgmt│   Audio/Video │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┴───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Message Layer (WukongIM)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Connection  │  Message   │   Offline   │   Message   │    Online       ││
│  │   Manager    │   Router   │   Storage   │    Sync     │    Status       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  PostgreSQL  │    Redis     │    MinIO     │ Elasticsearch│  Prometheus│ │
│  │   Database   │  Cache/Queue │   Storage    │    Search    │ Monitoring│ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴───────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Server

| Technology | Version | Description |
|------------|---------|-------------|
| [NestJS](https://nestjs.com/) | 11.x | Enterprise Node.js framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.9+ | Type-safe JavaScript |
| [TypeORM](https://typeorm.io/) | 0.3.x | Powerful ORM framework |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | High-performance RDBMS |
| [Redis](https://redis.io/) | 7+ | In-memory database & queue |
| [WukongIM](https://githubim.com/) | v2 | Professional IM engine |

### DevOps

| Technology | Description |
|------------|-------------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Kubernetes | Cluster orchestration |
| Prometheus | Monitoring & alerting |
| GitHub Actions | CI/CD |

## Use Cases

### 💼 Enterprise

- Internal communication tools
- Project collaboration platforms
- Customer service systems

### 🛒 E-commerce

- Buyer-seller communication
- Customer support systems
- Order notifications

### 🎓 Education

- Teacher-student interaction
- Online classrooms
- Learning communities

### 🏥 Healthcare

- Doctor-patient communication
- Remote consultation
- Health consultations

### 🎮 Gaming

- In-game chat
- Guild systems
- Voice chat

## Why OpenChat?

### ✅ Open Source

- AGPL-3.0 License
- Fully open source code, customizable
- Community-driven, continuous updates

### ✅ Ready to Use

- Installation wizard for one-click deployment
- Complete operations toolkit
- Rich sample applications

### ✅ High Performance

- Based on WukongIM, supports millions of concurrent connections
- Message latency < 100ms
- Horizontal scaling support

### ✅ Secure

- JWT authentication
- End-to-end encryption
- Comprehensive permission control

### ✅ Complete Ecosystem

- Multi-language SDKs
- Multi-platform applications
- Rich plugins

## Quick Start

### Local Deployment

```bash
# Use installation wizard
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.sh | bash

# Or Docker Compose
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
docker compose up -d
```

After deployment, access:
- OpenChat API: http://localhost:3000
- App API Docs: http://localhost:3000/im/v3/docs
- App OpenAPI JSON: http://localhost:3000/im/v3/openapi.json
- Admin API Docs: http://localhost:3000/admin/im/v3/docs
- Admin OpenAPI JSON: http://localhost:3000/admin/im/v3/openapi.json
- WukongIM Demo: http://localhost:5172

## Next Steps

- [Quick Start](./quickstart.md) - Get started with OpenChat in 5 minutes
- [Architecture](./architecture.md) - Understand the system architecture
- [Features](./features.md) - Explore all features
- [API Documentation](/en/api/) - View complete API documentation

