# Architecture Design

This document details OpenChat's system architecture design, including overall architecture, data flow, module division, and other core design concepts.

## Overall Architecture

OpenChat adopts a **layered architecture** design, divided from bottom to top: infrastructure layer, data layer, service layer, gateway layer, and client layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   Web App    │  PC Client   │  Mobile App  │   Mini App   │  Third Party    │
│   (React)    │   (Electron) │  (React      │   (WeChat)   │  (Telegram/     │
│              │              │   Native)    │              │   WhatsApp)     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬────────┘
       │              │              │              │                │
       └──────────────┴──────────────┴──────────────┴────────────────┘
                                    │
                              ┌─────┴─────┐
                              │   SDK     │
                              │  (Multi-  │
                              │  Platform)│
                              └─────┬─────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                              Gateway Layer                                   │
├───────────────────────────────────┼─────────────────────────────────────────┤
│                           Nginx / Traefik                                    │
│                    (Load Balance / SSL Termination / Routing)               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                              Service Layer                                   │
├───────────────────────────────────┼─────────────────────────────────────────┤
│                           OpenChat Server                                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │   Auth       │    User      │   Message    │    Group     │    RTC      │ │
│  │   Service    │   Service    │   Service    │   Service    │   Service   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘ │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │   Friend     │   AI Bot     │   Webhook    │   Third      │   File      │ │
│  │   Service    │   Service    │   Service    │   Party      │   Service   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                              Message Layer                                   │
├───────────────────────────────────┼─────────────────────────────────────────┤
│                              WuKongIM                                        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │   TCP        │   WebSocket  │   Message    │   Channel    │   Push      │ │
│  │   Gateway    │   Gateway    │   Router     │   Manager    │   Service   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                               Data Layer                                     │
├──────────────────┬────────────────┼────────────────┬─────────────────────────┤
│   PostgreSQL     │     Redis      │    MinIO       │   Elasticsearch         │
│  (Relational)    │  (Cache/Session)│  (File Storage)│   (Full-text Search)    │
└──────────────────┴────────────────┴────────────────┴─────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           Infrastructure Layer                               │
├──────────────────┬────────────────┬────────────────┬─────────────────────────┤
│      Docker      │  Kubernetes    │     CI/CD      │    Monitoring           │
│  (Container)     │  (Orchestration)│  (GitHub       │    (Prometheus/         │
│                  │                │   Actions)     │     Grafana)            │
└──────────────────┴────────────────┴────────────────┴─────────────────────────┘
```

## Core Modules

### 1. Auth Service

Responsible for user authentication and authorization:

- **Features**: User registration, login, token management, permission verification
- **Technology**: JWT, bcrypt, Redis Session
- **API**: `/auth/*`

```typescript
// Authentication Flow
Client -> Login API -> Validate -> Generate JWT -> Return Token
                       -> Store Session in Redis
```

### 2. User Service

Manages user information and status:

- **Features**: User info management, online status, user search
- **Data**: User table, UserStatus table
- **API**: `/users/*`

### 3. Message Service

Handles message-related business:

- **Features**: Message storage, history query, message recall, read receipts
- **Data**: Message table, Conversation table
- **API**: `/messages/*`

### 4. Group Service

Manages groups and group members:

- **Features**: Group creation, member management, group settings
- **Data**: Group table, GroupMember table
- **API**: `/groups/*`

### 5. Friend Service

Manages friend relationships:

- **Features**: Friend requests, friend list, blacklist
- **Data**: Friend table, FriendRequest table
- **API**: `/friends/*`

### 6. RTC Service

Audio/video call management:

- **Features**: Room management, token generation, call records
- **Integration**: Volcengine RTC, Tencent Cloud RTC
- **API**: `/rtc/*`

### 7. AI Bot Service

AI assistant features:

- **Features**: Bot management, conversation management, AI interface calls
- **Integration**: OpenAI GPT, Claude
- **API**: `/ai-bots/*`

## Data Flow

### Message Sending Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Client  │────▶│   OpenChat  │────▶│   WuKongIM  │────▶│   Target    │
│         │     │   Server    │     │             │     │   Client    │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                │                   │                   │
      │ 1. Send Msg    │                   │                   │
      │───────────────▶│                   │                   │
      │                │ 2. Validate       │                   │
      │                │    & Store        │                   │
      │                │                   │ 3. Route Msg      │
      │                │──────────────────▶│                   │
      │                │                   │                   │ 4. Push
      │                │                   │──────────────────▶│
      │                │ 5. Return Result  │                   │
      │◀───────────────│                   │                   │
```

### User Login Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Client  │────▶│   Nginx     │────▶│   OpenChat  │────▶│  PostgreSQL │
│         │     │             │     │   Server    │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                │                   │                   │
      │ 1. Login Req   │                   │                   │
      │───────────────▶│                   │                   │
      │                │ 2. Forward        │                   │
      │                │──────────────────▶│                   │
      │                │                   │ 3. Query User     │
      │                │                   │──────────────────▶│
      │                │                   │◀──────────────────│
      │                │                   │ 4. Validate       │
      │                │                   │    Password       │
      │                │                   │ 5. Generate JWT   │
      │                │ 6. Return Token   │                   │
      │◀───────────────│◀──────────────────│                   │
```

## Technology Stack

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [NestJS](https://nestjs.com/) | ^10.0 | Node.js framework |
| [TypeScript](https://www.typescriptlang.org/) | ^5.0 | Development language |
| [TypeORM](https://typeorm.io/) | ^0.3 | ORM framework |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | Relational database |
| [Redis](https://redis.io/) | 7+ | Cache/Session |
| [WuKongIM](https://githubim.com/) | v2 | IM message service |

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [React](https://react.dev/) | ^18.0 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | ^5.0 | Development language |
| [Tailwind CSS](https://tailwindcss.com/) | ^3.0 | CSS framework |
| [Zustand](https://github.com/pmndrs/zustand) | ^4.4 | State management |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| [Docker](https://www.docker.com/) | Containerization |
| [Docker Compose](https://docs.docker.com/compose/) | Local orchestration |
| [Kubernetes](https://kubernetes.io/) | Production orchestration |
| [Prometheus](https://prometheus.io/) | Monitoring |
| [Grafana](https://grafana.com/) | Visualization |

## Database Design

### Core Table Structure

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    avatar VARCHAR(500),
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    group_id UUID REFERENCES groups(id),
    type VARCHAR(20) NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(500),
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Scalability Design

### Horizontal Scaling

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (LB)       │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  OpenChat   │ │  OpenChat   │ │  OpenChat   │
    │  Server 1   │ │  Server 2   │ │  Server 3   │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │   Redis     │
                    │  (Cluster)  │
                    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │  (Primary-  │
                    │  Replica)   │
                    └─────────────┘
```

### Microservices Split

Future split into independent microservices:

- **User Service**: User management, authentication
- **Message Service**: Message storage, history query
- **Group Service**: Group management, member management
- **RTC Service**: Audio/video calls
- **AI Service**: AI Bot, smart assistant
- **Push Service**: Message push, notifications

## Security Design

### Authentication Security

- JWT Token signature verification
- Token expiration refresh mechanism
- Redis session state storage
- Password bcrypt encryption

### Transport Security

- HTTPS/TLS encrypted transmission
- WebSocket WSS encryption
- API rate limiting protection

### Data Security

- Database connection encryption
- Sensitive field encryption
- Regular data backup

## Monitoring & Logging

### Monitoring Metrics

- **System Metrics**: CPU, memory, disk, network
- **Application Metrics**: QPS, latency, error rate
- **Business Metrics**: Online users, message volume

### Log Collection

```
App Logs -> Filebeat -> Logstash -> Elasticsearch -> Kibana
```

## Deployment Architecture

### Development Environment

```
Docker Compose (Single Node)
├── PostgreSQL
├── Redis
├── WuKongIM
├── OpenChat Server
└── Prometheus
```

### Production Environment

```
Kubernetes Cluster
├── Ingress Controller (Nginx)
├── OpenChat Server (3+ Replicas)
├── PostgreSQL (HA)
├── Redis (Cluster)
├── WuKongIM (Cluster)
└── Monitoring Stack
```

## Performance Optimization

### Database Optimization

- Index optimization
- Read-write separation
- Sharding (future)

### Caching Strategy

- Redis cache for hot data
- Local cache for common configs
- CDN for static resources

### Message Optimization

- Async message queue processing
- Batch message processing
- Message compression

## More Resources

- [API Documentation](/en/api/) - Complete API reference
- [Deployment Guide](/en/deploy/) - Detailed deployment instructions
- [Configuration Guide](/en/config/) - Configuration parameter details
