# OpenChat Server

Enterprise-grade Real-time Communication Platform built with NestJS.

## 🚀 Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 💬 **Real-time Messaging** - WebSocket-based real-time communication
- 👥 **Group Chat** - Full-featured group chat functionality
- 🤖 **AI Integration** - Built-in AI agent and bot support
- 📱 **Multi-platform** - Support for Telegram, WhatsApp, and more
- 🏢 **Enterprise Ready** - Scalable architecture with Redis, PostgreSQL

## 📦 Project Structure

```
src/
├── common/                 # Shared utilities, decorators, filters
│   ├── auth/              # Authentication module
│   ├── base/              # Base classes and services
│   ├── cache/             # Caching module
│   ├── config/            # Configuration
│   ├── decorators/        # Custom decorators
│   ├── dto/               # Base DTOs
│   ├── entities/          # Base entities
│   ├── events/            # Event bus
│   ├── exceptions/        # Exception handling
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth guards
│   ├── interceptors/      # Request/response interceptors
│   ├── logger/            # Logging module
│   ├── middleware/        # Custom middleware
│   ├── pipes/             # Validation pipes
│   ├── queue/             # Message queue
│   ├── redis/             # Redis module
│   ├── services/          # Shared services
│   └── utils/             # Utility functions
├── modules/               # Business modules
│   ├── user/             # User management
│   ├── message/          # Message handling
│   ├── group/            # Group chat
│   ├── friend/           # Friend system
│   ├── contact/          # Contact management
│   ├── conversation/     # Conversation management
│   ├── agent/            # AI Agent
│   ├── ai-bot/           # AI Bot
│   ├── bot-platform/     # Bot platform
│   ├── im-provider/      # IM provider
│   ├── iot/              # IoT device support
│   ├── rtc/              # Real-time communication
│   ├── third-party/      # Third-party integrations
│   ├── wukongim/         # WuKongIM integration
│   └── craw/             # Crawler module
├── extensions/           # Extension modules
│   ├── core/             # Extension core
│   └── user-center/      # User center extension
├── gateways/             # WebSocket gateways
├── app.module.ts         # Main application module
└── main.ts               # Application entry point
```

## 🛠️ Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Message Queue**: BullMQ
- **WebSocket**: Socket.IO
- **Authentication**: JWT + Passport
- **Logging**: Winston
- **Validation**: class-validator

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run linting
npm run lint
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate migrations |

## 🔧 Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=openchat

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

## 📚 Documentation

- [API Documentation](./docs/zh/api/index.md)
- [Architecture Guide](./docs/zh/guide/architecture.md)
- [Deployment Guide](./docs/zh/deploy/index.md)

## 📄 License

MIT License
