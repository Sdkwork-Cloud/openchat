# 架构设计

本文档详细介绍 OpenChat 的系统架构设计，包括整体架构、数据流、模块划分等核心设计思想。

## 整体架构

OpenChat 采用**分层架构**设计，从下到上分为：基础设施层、数据层、服务层、网关层和客户端层。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client Layer)                         │
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
│                              网关层 (Gateway Layer)                          │
├───────────────────────────────────┼─────────────────────────────────────────┤
│                           Nginx / Traefik                                    │
│                    (负载均衡 / SSL终止 / 路由)                                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                              服务层 (Service Layer)                          │
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
│                              消息层 (Message Layer)                          │
├───────────────────────────────────┼─────────────────────────────────────────┤
│                              悟空IM (WuKongIM)                               │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │   TCP        │   WebSocket  │   Message    │   Channel    │   Push      │ │
│  │   Gateway    │   Gateway    │   Router     │   Manager    │   Service   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                               数据层 (Data Layer)                            │
├──────────────────┬────────────────┼────────────────┬─────────────────────────┤
│   PostgreSQL     │     Redis      │    MinIO       │   Elasticsearch         │
│  (关系型数据)     │   (缓存/会话)   │   (文件存储)    │    (全文搜索)           │
└──────────────────┴────────────────┴────────────────┴─────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           基础设施层 (Infrastructure Layer)                  │
├──────────────────┬────────────────┬────────────────┬─────────────────────────┤
│      Docker      │  Kubernetes    │     CI/CD      │    Monitoring           │
│   (容器化)        │   (编排)        │   (GitHub      │    (Prometheus/         │
│                  │                │    Actions)    │     Grafana)            │
└──────────────────┴────────────────┴────────────────┴─────────────────────────┘
```

## 核心模块

### 1. 认证服务 (Auth Service)

负责用户认证和授权：

- **功能**: 用户注册、登录、Token 管理、权限验证
- **技术**: JWT、bcrypt、Redis Session
- **API**: `/auth/*`

```typescript
// 认证流程
Client -> Login API -> Validate -> Generate JWT -> Return Token
                    -> Store Session in Redis
```

### 2. 用户服务 (User Service)

管理用户信息和状态：

- **功能**: 用户信息管理、在线状态、用户搜索
- **数据**: User 表、UserStatus 表
- **API**: `/users/*`

### 3. 消息服务 (Message Service)

处理消息相关业务：

- **功能**: 消息存储、历史查询、消息撤回、已读回执
- **数据**: Message 表、Conversation 表
- **API**: `/messages/*`

### 4. 群组服务 (Group Service)

管理群组和群成员：

- **功能**: 群组创建、成员管理、群设置
- **数据**: Group 表、GroupMember 表
- **API**: `/groups/*`

### 5. 好友服务 (Friend Service)

管理好友关系：

- **功能**: 好友申请、好友列表、黑名单
- **数据**: Friend 表、FriendRequest 表
- **API**: `/friends/*`

### 6. RTC 服务 (RTC Service)

音视频通话管理：

- **功能**: 房间管理、Token 生成、通话记录
- **集成**: 火山引擎 RTC、腾讯云 RTC
- **API**: `/rtc/*`

### 7. AI Bot 服务

AI 助手功能：

- **功能**: Bot 管理、对话管理、AI 接口调用
- **集成**: OpenAI GPT、Claude
- **API**: `/ai-bots/*`

## 数据流

### 消息发送流程

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Client  │────▶│   OpenChat  │────▶│   悟空IM    │────▶│   Target    │
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

### 用户登录流程

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

## 技术选型

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [NestJS](https://nestjs.com/) | ^10.0 | Node.js 框架 |
| [TypeScript](https://www.typescriptlang.org/) | ^5.0 | 开发语言 |
| [TypeORM](https://typeorm.io/) | ^0.3 | ORM 框架 |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | 关系型数据库 |
| [Redis](https://redis.io/) | 7+ | 缓存/会话 |
| [悟空IM](https://githubim.com/) | v2 | IM 消息服务 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | ^18.0 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | ^5.0 | 开发语言 |
| [Tailwind CSS](https://tailwindcss.com/) | ^3.0 | CSS 框架 |
| [Zustand](https://github.com/pmndrs/zustand) | ^4.4 | 状态管理 |

### 基础设施

| 技术 | 用途 |
|------|------|
| [Docker](https://www.docker.com/) | 容器化 |
| [Docker Compose](https://docs.docker.com/compose/) | 本地编排 |
| [Kubernetes](https://kubernetes.io/) | 生产编排 |
| [Prometheus](https://prometheus.io/) | 监控 |
| [Grafana](https://grafana.com/) | 可视化 |

## 数据库设计

### 核心表结构

```sql
-- 用户表
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

-- 消息表
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

-- 群组表
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(500),
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 扩展性设计

### 水平扩展

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

### 微服务拆分

未来可拆分为独立微服务：

- **用户服务**: 用户管理、认证授权
- **消息服务**: 消息存储、历史查询
- **群组服务**: 群组管理、成员管理
- **RTC 服务**: 音视频通话
- **AI 服务**: AI Bot、智能助手
- **推送服务**: 消息推送、通知

## 安全设计

### 认证安全

- JWT Token 签名验证
- Token 过期刷新机制
- Redis 存储会话状态
- 密码 bcrypt 加密

### 传输安全

- HTTPS/TLS 加密传输
- WebSocket WSS 加密
- API 限流保护

### 数据安全

- 数据库连接加密
- 敏感字段加密存储
- 定期数据备份

## 监控与日志

### 监控指标

- **系统指标**: CPU、内存、磁盘、网络
- **应用指标**: QPS、延迟、错误率
- **业务指标**: 在线用户数、消息量

### 日志收集

```
App Logs -> Filebeat -> Logstash -> Elasticsearch -> Kibana
```

## 部署架构

### 开发环境

```
Docker Compose (Single Node)
├── PostgreSQL
├── Redis
├── 悟空IM
├── OpenChat Server
└── Prometheus
```

### 生产环境

```
Kubernetes Cluster
├── Ingress Controller (Nginx)
├── OpenChat Server (3+ Replicas)
├── PostgreSQL (HA)
├── Redis (Cluster)
├── 悟空IM (Cluster)
└── Monitoring Stack
```

## 性能优化

### 数据库优化

- 索引优化
- 读写分离
- 分库分表（未来）

### 缓存策略

- Redis 缓存热点数据
- 本地缓存常用配置
- CDN 加速静态资源

### 消息优化

- 消息队列异步处理
- 批量消息处理
- 消息压缩传输

## 更多资源

- [API 文档](/api/) - 完整的 API 接口文档
- [部署指南](/deploy/) - 详细的部署说明
- [配置说明](/config/) - 配置项详细说明
