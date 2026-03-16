<div align="center">

<img src="./docs/assets/images/branding/logo.png" width="150" alt="OpenChat Logo">

# OpenChat

**开源即时通讯解决方案 - 服务端、SDK、应用一体化**

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

## 📖 目录

- [📖 目录](#-目录)
- [🚀 快速开始](#-快速开始)
  - [环境要求](#环境要求)
  - [安装步骤](#安装步骤)
  - [Docker 部署（推荐）](#docker-部署推荐)
- [✨ 功能特性](#-功能特性)
  - [💬 即时通讯](#-即时通讯)
  - [🔊 实时音视频](#-实时音视频)
  - [🤖 AI 助手](#-ai-助手)
  - [🔌 第三方集成](#-第三方集成)
  - [🛠️ 系统功能](#️-系统功能)
- [📁 系统架构](#-系统架构)
- [🔧 技术栈](#-技术栈)
- [📚 API 文档](#-api-文档)
- [🏗️ 项目结构](#️-项目结构)
- [🌐 集成](#-集成)
- [⚡ 性能优化](#-性能优化)
- [🔒 安全](#-安全)
- [📊 监控与日志](#-监控与日志)
- [📦 部署](#-部署)
- [👨‍💻 开发指南](#️-开发指南)
- [🧪 测试](#-测试)
- [❓ 常见问题](#-常见问题)
- [🤝 贡献指南](#-贡献指南)
- [📄 许可证](#-许可证)
- [💬 社区](#-社区)
- [📷 截图](#-截图)

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Docker | 24.0+ | 容器运行时（推荐） |
| Docker Compose | 2.0+ | 容器编排 |
| Node.js | 18+ | 运行环境（独立部署） |
| PostgreSQL | 15+ | 主数据库（外部） |
| Redis | 7+ | 缓存和消息队列（外部） |

### 一键安装（推荐）

**Linux / macOS:**

```bash
# 快速安装
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# 或克隆后安装
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

**Windows:**

```powershell
# 快速安装
.\scripts\quick-install.bat

# 或 PowerShell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

### 安装前检查

```bash
# Linux / macOS
./scripts/precheck.sh

# Windows
scripts\precheck.bat
```

安装前检查脚本将验证：
- 操作系统和架构
- 内存和磁盘空间
- Docker 和 Docker Compose
- 端口可用性
- 网络连接

### Docker 快速启动

```bash
# 快速启动（一条命令启动所有服务）
docker compose -f docker-compose.quick.yml up -d

# 或使用部署脚本（会做依赖和端口检查）
./scripts/docker-deploy.sh install

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 手动安装

```bash
# 克隆项目
git clone <your-openchat-repo-url> openchat-server
cd openchat-server

# 安装依赖
npm install

# 配置环境
cp .env.example .env.development
vim .env.development

# 初始化数据库（全新库）
./scripts/init-database.sh development

# 存量库升级（可重复执行）
./scripts/apply-db-patches.sh development

# 或开发模式启动
npm run start:dev
```

### 验证安装

```bash
# 健康检查
curl http://localhost:3000/health

# API 文档
open http://localhost:3000/api/docs

# 运行健康检查脚本
./scripts/health-check.sh
```

### 访问地址

安装完成后，可访问以下服务：

| 服务 | 地址 |
|------|------|
| OpenChat API | http://localhost:3000 |
| API 文档 | http://localhost:3000/api/docs |
| 健康检查 | http://localhost:3000/health |
| 悟空IM Demo | http://localhost:5172 |
| 悟空IM 管理后台 | http://localhost:5300/web |

---

## ✨ 功能特性

### 💬 即时通讯

| 功能 | 状态 | 说明 |
|------|------|------|
| 单聊 | ✅ | 一对一私聊 |
| 群聊 | ✅ | 支持最多 500 人群组 |
| 消息撤回 | ✅ | 2 分钟内可撤回 |
| 已读回执 | ✅ | 消息已读状态 |
| 多媒体消息 | ✅ | 文本、图片、语音、视频、文件 |
| 消息搜索 | ✅ | 全文搜索历史消息 |
| 离线推送 | ✅ | 离线消息推送通知 |

### 🔊 实时音视频

| 功能 | 状态 | 说明 |
|------|------|------|
| 音频通话 | ✅ | 高清语音通话 |
| 视频通话 | ✅ | 1080P 视频通话 |
| 屏幕共享 | ✅ | 桌面/窗口共享 |
| 群组通话 | ✅ | 多人音视频会议 |
| 录制回放 | ✅ | 通话录制与回放 |

### 🤖 AI 助手

| 功能 | 状态 | 说明 |
|------|------|------|
| GPT 集成 | ✅ | 内置 ChatGPT 支持 |
| 智能客服 | ✅ | 自动问答机器人 |
| AI Bot | ✅ | 自定义 AI 机器人 |
| 多模型支持 | ✅ | 支持 OpenAI、Claude 等 |

### 🔌 第三方集成

| 功能 | 状态 | 说明 |
|------|------|------|
| Telegram | ✅ | 消息同步 |
| WhatsApp | ✅ | 消息同步 |
| Webhook | ✅ | 自定义集成 |
| 开放 API | ✅ | RESTful API |

### 🛠️ 系统功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 用户管理 | ✅ | 注册、登录、个人资料 |
| 好友系统 | ✅ | 添加、删除、分组管理 |
| 群组系统 | ✅ | 创建、成员管理、权限控制 |
| WebSocket | ✅ | 实时消息推送 |
| 分布式部署 | ✅ | 支持集群部署 |
| 性能监控 | ✅ | Prometheus 指标 |
| 安全认证 | ✅ | JWT + RBAC |
| 限流保护 | ✅ | 防止滥用 |

---

## 📁 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client Layer)                         │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│   Web App    │  PC Client   │  Mobile App  │ Mini Program │   IoT Device   │
│   (React)    │   (Tauri)    │  (React Nat) │   (微信)      │    (ESP32)     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │              │                │
       └──────────────┴──────────────┴──────────────┴────────────────┘
                                    │
                                    │ WebSocket / HTTP
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           服务层 (Service Layer - NestJS)                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬───────────────┐  │
│  │    Auth     │    User     │   Message   │    Group    │      RTC      │  │
│  │   认证授权   │   用户管理   │   消息服务   │   群组管理   │    音视频     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┴───────────────┘  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬───────────────┐  │
│  │   Friend    │   Contact   │   AI Bot    │  ThirdParty │      IoT      │  │
│  │   好友管理   │   通讯录     │   AI机器人  │   第三方集成  │   物联网设备  │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┴───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SDK / API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        消息引擎层 (Message Layer - WukongIM)                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  连接管理  │  消息路由  │  离线存储  │  消息同步  │  在线状态            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据层 (Data Layer)                             │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  PostgreSQL  │    Redis     │    MinIO     │ Elasticsearch│  Prometheus│ │
│  │   主数据库    │  缓存/队列   │   对象存储    │   搜索引擎    │   监控     │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴───────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 技术栈

### 后端技术

| 技术 | 版本 | 说明 |
|------|------|------|
| [NestJS](https://nestjs.com/) | 11.x | 企业级 Node.js 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.9+ | 类型安全的 JavaScript |
| [TypeORM](https://typeorm.io/) | 0.3.x | 强大的 ORM 框架 |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | 高性能关系数据库 |
| [Redis](https://redis.io/) | 7+ | 内存数据库和消息队列 |
| [BullMQ](https://docs.bullmq.io/) | 5.x | 消息队列 |
| [Socket.IO](https://socket.io/) | 4.x | 实时通信 |
| [WukongIM](https://githubim.com/) | v2 | 专业 IM 引擎 |
| [Passport](http://www.passportjs.org/) | 0.7+ | 认证中间件 |
| [JWT](https://jwt.io/) | - | 基于令牌的认证 |

### DevOps

| 技术 | 说明 |
|------|------|
| Docker | 容器化部署 |
| Docker Compose | 多容器编排 |
| Kubernetes | 集群编排 |
| Prometheus | 监控告警 |
| GitHub Actions | CI/CD |

---

## 📚 API 文档

### Swagger UI

启动服务后访问：

```
http://localhost:3000/api/docs
```

### API 端点

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `/api/auth/*` | 登录、注册、Token 刷新 |
| 用户 | `/api/users/*` | 用户信息、资料管理 |
| 消息 | `/api/messages/*` | 消息发送、历史查询 |
| 群组 | `/api/groups/*` | 群组创建、成员管理 |
| 好友 | `/api/friends/*` | 好友申请、列表管理 |
| 联系人 | `/api/contacts/*` | 通讯录管理 |
| 音视频 | `/api/rtc/*` | 通话信令、房间管理 |

### 完整 API 文档

详细 API 文档请参考 [API 文档](./docs/zh/api/index.md)。

部署与安装命令速查请参考 [命令速查](./docs/COMMANDS_CN.md)。

---

## 🏗️ 项目结构

```
openchat/
├── 📁 src/                        # 服务端源码
│   ├── 📁 common/                 # 公共模块
│   │   ├── 📁 auth/               # 认证授权
│   │   │   ├── guards/            # 认证守卫
│   │   │   ├── strategies/        # 认证策略
│   │   │   ├── auth-manager.service.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── token-blacklist.service.ts
│   │   ├── 📁 base/               # 基础类
│   │   ├── 📁 cache/              # 缓存服务
│   │   ├── 📁 config/             # 配置管理
│   │   ├── 📁 constants/          # 常量定义
│   │   ├── 📁 dto/                # 数据传输对象
│   │   ├── 📁 events/             # 事件总线
│   │   ├── 📁 exceptions/         # 异常处理
│   │   ├── 📁 filters/            # 过滤器
│   │   ├── 📁 health/             # 健康检查
│   │   ├── 📁 interceptors/       # 拦截器
│   │   ├── 📁 logger/             # 日志服务
│   │   ├── 📁 metrics/            # 性能监控
│   │   ├── 📁 queue/              # 消息队列
│   │   ├── 📁 redis/              # Redis 服务
│   │   ├── 📁 throttler/          # 限流
│   │   └── 📁 utils/              # 工具函数
│   ├── 📁 gateways/               # WebSocket 网关
│   ├── 📁 modules/                # 业务模块
│   │   ├── 📁 agent/              # 智能代理
│   │   ├── 📁 ai-bot/             # AI 机器人
│   │   ├── 📁 bot-platform/       # 机器人平台
│   │   ├── 📁 contact/            # 联系人
│   │   ├── 📁 conversation/       # 会话管理
│   │   ├── 📁 friend/             # 好友系统
│   │   ├── 📁 group/              # 群组系统
│   │   ├── 📁 im-provider/        # IM 提供者
│   │   ├── 📁 iot/                # 物联网
│   │   ├── 📁 message/            # 消息系统
│   │   ├── 📁 rtc/                # 实时音视频
│   │   ├── 📁 third-party/        # 第三方集成
│   │   ├── 📁 user/               # 用户系统
│   │   └── 📁 wukongim/           # 悟空IM 集成
│   ├── app.module.ts              # 应用模块
│   ├── bootstrap.ts               # 启动引导
│   ├── data-source.ts             # 数据源配置
│   └── main.ts                    # 入口文件
├── 📁 sdk/                        # SDK 目录
│   ├── 📁 typescript/             # TypeScript SDK
│   ├── 📁 android/                # Android SDK
│   ├── 📁 ios/                    # iOS SDK
│   ├── 📁 flutter/                # Flutter SDK
│   ├── 📁 python/                 # Python SDK
│   └── 📁 nodejs/                 # Node.js SDK
├── 📁 app/                        # 应用目录
│   ├── 📁 openchat/               # 主应用
│   ├── 📁 openchat-admin/         # 管理后台
│   ├── 📁 openchat-react-mobile/  # 移动端
│   └── 📁 openchat-react-pc/      # PC 端
├── 📁 docs/                       # 文档
│   ├── 📁 assets/                 # 资源文件
│   │   ├── 📁 images/             # 图片
│   │   │   ├── 📁 branding/       # 品牌图片
│   │   │   │   └── logo.png       # 项目 Logo
│   │   │   ├── 📁 screenshots/    # 截图
│   │   │   └── 📁 social/         # 社交媒体
│   │   │       └── wechat-qr.png  # 微信二维码
│   │   ├── 📁 videos/             # 视频
│   │   └── 📁 icons/              # 图标
│   ├── 📁 api/                    # API 文档
│   ├── 📁 guide/                  # 使用指南
│   └── 📁 sdk/                    # SDK 文档
├── 📁 database/                   # 数据库
│   ├── schema.sql                 # 数据库结构
│   ├── seed.sql                   # 初始数据
│   └── indexes-optimization.sql   # 索引优化
├── 📁 k8s/                        # Kubernetes 配置
│   ├── 📁 base/                   # 基础配置
│   └── 📁 overlays/               # 环境配置
├── 📁 scripts/                    # 脚本
│   ├── quick-start.sh             # 快速启动
│   ├── install.sh                 # 安装脚本 (Linux/macOS)
│   ├── install.bat                # 安装脚本 (Windows)
│   ├── setup-wizard.sh            # 交互式安装向导
│   ├── install-manager.sh         # 安装状态管理
│   ├── install-test.sh            # 安装验证测试
│   ├── precheck.sh                # 系统预检查
│   ├── diagnose.sh                # 错误诊断工具
│   ├── auto-fix.sh                # 自动修复工具
│   ├── log-analyzer.sh            # 日志分析工具
│   ├── health-check.sh            # 健康监控
│   ├── post-install.sh            # 安装后配置
│   └── uninstall.sh               # 卸载脚本
├── 📁 test/                       # 测试
│   ├── __mocks__/                 # Mock 文件
│   ├── app.e2e-spec.ts            # E2E 测试
│   └── setup.ts                   # 测试配置
├── 📁 xiaozhi-esp32/              # ESP32 IoT 固件
├── .env.example                   # 环境变量示例
├── docker-compose.yml             # Docker 编排
├── Dockerfile                     # Docker 镜像
├── jest.config.js                 # Jest 配置
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript 配置
├── LICENSE                        # 许可证
├── README.md                      # 英文文档
└── README_CN.md                   # 中文文档
```

---

## 🌐 集成

### WukongIM 集成

OpenChat 与 WukongIM 深度集成，提供可靠的实时消息服务：

| 功能 | 说明 |
|------|------|
| 消息发送 | 所有消息通过 WukongIM 发送 |
| 用户同步 | 本地数据库与 WukongIM 用户数据同步 |
| 群组同步 | 群组数据双向同步 |
| 消息确认 | 支持消息送达确认和已读回执 |
| 在线状态 | 实时在线状态管理 |

### 第三方服务

| 服务 | 状态 | 说明 |
|------|------|------|
| Telegram | ✅ | 消息同步 |
| WhatsApp | ✅ | 消息同步 |
| Webhook | ✅ | 自定义集成 |

---

## ⚡ 性能优化

### 数据库优化

- **连接池管理**：优化的连接池大小和超时设置
- **索引优化**：关键字段索引，查询性能提升 10x
- **批量操作**：批量插入和更新，减少数据库往返

### 缓存策略

- **Redis 缓存**：热点数据缓存，减少数据库查询
- **本地缓存**：LRU 缓存，减少网络开销
- **缓存预热**：启动时预加载热点数据

### 消息处理

- **消息队列**：异步处理耗时操作
- **批量发送**：群消息批量处理
- **指数退避重试**：提高消息发送可靠性

### 并发控制

- **限流保护**：防止系统过载
- **并发限制**：控制并发请求数量
- **优雅降级**：高负载时自动降级

---

## 🔒 安全

### 认证授权

| 功能 | 说明 |
|------|------|
| JWT 认证 | 安全的用户认证机制 |
| 多因素认证 | 支持多种认证方式 |
| Token 黑名单 | 支持主动登出 |
| RBAC 权限 | 基于角色的访问控制 |

### 安全防护

| 功能 | 说明 |
|------|------|
| CORS 配置 | 跨域资源共享配置 |
| Helmet 安全头 | 增强应用安全性 |
| 输入验证 | 防止恶意输入 |
| 限流保护 | 防止暴力破解 |
| 敏感信息脱敏 | 日志自动脱敏 |

---

## 📊 监控与日志

### 性能监控

- **Prometheus 指标**：实时收集系统性能指标
- **健康检查**：系统健康状态检查
- **性能追踪**：请求耗时追踪

### 日志管理

- **结构化日志**：JSON 格式日志输出
- **日志级别**：支持 debug/info/warn/error 级别
- **日志文件**：支持文件输出和日志轮转
- **请求追踪**：请求 ID 追踪

---

## 📦 部署

### Docker Compose 部署（推荐）

```bash
# 开发环境（包含 PostgreSQL、Redis、WukongIM、Prometheus）
docker compose up -d

# 生产环境
docker compose -f docker-compose.prod.yml up -d

# 使用外部数据库和 Redis
docker compose -f docker-compose.external-db.yml up -d

# 扩展服务
docker compose up -d --scale app=3
```

### Docker 独立部署

```bash
# 构建镜像
docker build -t openchat/server:latest .

# 运行容器（需要外部 PostgreSQL 和 Redis）
docker run -d \
  --name openchat \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USERNAME=openchat \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=openchat \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your-jwt-secret \
  openchat/server:latest
```

### Kubernetes 部署

```bash
# 部署到 Kubernetes
kubectl apply -k k8s/overlays/production

# 查看部署状态
kubectl get pods -n openchat
```

---

## 👨‍💻 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 NestJS 代码风格指南
- 使用 ESLint + Prettier 保证代码质量

### 开发命令

```bash
# 启动开发服务器
npm run start:dev

# 代码格式化
npm run format

# 代码检查
npm run lint

# 类型检查
npm run lint:types
```

### 数据库初始化与补丁

```bash
# 全新数据库初始化（schema + 可选 seed）
./scripts/init-database.sh development

# 存量数据库补丁升级（patches）
./scripts/apply-db-patches.sh development
```

---

## 🧪 测试

```bash
# 运行单元测试
npm run test

# 运行测试覆盖率
npm run test:cov

# 运行 E2E 测试
npm run test:e2e

# 监视模式
npm run test:watch
```

---

## ❓ 常见问题

### 诊断工具

OpenChat 提供了一套完整的诊断和修复工具：

```bash
# 系统预检查
./scripts/precheck.sh

# 运行诊断
./scripts/diagnose.sh

# 自动修复常见问题
./scripts/auto-fix.sh --all

# 分析日志
./scripts/log-analyzer.sh analyze

# 健康监控
./scripts/health-check.sh --monitor
```

### 常见问题

#### WukongIM 连接问题

1. 检查 WukongIM 服务是否运行：`docker ps | grep wukongim`
2. 验证 `WUKONGIM_API_URL` 配置
3. 检查网络连通性：`./scripts/diagnose.sh --network`

#### 数据库连接问题

1. 确保 PostgreSQL 服务运行：`docker ps | grep postgres`
2. 验证 `.env` 中的数据库配置
3. 检查数据库用户权限
4. 运行：`./scripts/auto-fix.sh --database`

#### Redis 连接问题

1. 检查 Redis 服务是否运行：`docker ps | grep redis`
2. 验证 Redis 配置
3. 运行：`./scripts/auto-fix.sh --redis`

#### 容器问题

1. 检查容器状态：`docker compose ps`
2. 查看容器日志：`./scripts/log-analyzer.sh containers`
3. 重启容器：`./scripts/auto-fix.sh --containers`

#### 安装问题

1. 检查安装状态：`./scripts/install-manager.sh status`
2. 恢复中断的安装：`./scripts/install-manager.sh resume`
3. 重置安装：`./scripts/install-manager.sh reset`

详细故障排除指南请参考 [安装文档](./INSTALL_CN.md) 与 [命令速查](./docs/COMMANDS_CN.md)

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献步骤

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 行为准则

贡献前请阅读 [行为准则](CODE_OF_CONDUCT.md)

### 贡献指南

详细贡献指南请参考 [贡献指南](CONTRIBUTING.md)

---

## 📄 许可证

OpenChat 是开源软件，使用 [AGPL-3.0 许可证](LICENSE) 授权。

---

## 💬 社区

加入我们的社区，获取帮助、分享想法、参与项目！

| 平台 | 链接 |
|------|------|
| GitHub Discussions | [![GitHub Discussions](https://img.shields.io/badge/GitHub%20Discussions-181717?logo=github&logoColor=white)](https://github.com/Sdkwork-Cloud/openchat/discussions) |
| X (Twitter) | [![X](https://img.shields.io/badge/X-1DA1F2?logo=x&logoColor=white)](https://x.com/openchat_cloud) |
| Discord | [![Discord](https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white)](https://discord.gg/openchat) |
| 微信公众号 | 扫描下方二维码 |
| 邮箱 | [![Email](https://img.shields.io/badge/Email-D14836?logo=gmail&logoColor=white)](mailto:contact@sdkwork.com) |

<div align="center">
  <img src="./docs/assets/images/social/wechat-qr.png" width="200" alt="微信公众号二维码">
  <p>OpenChat 官方公众号</p>
</div>

---

## 📷 截图

<div align="center">

### Web 界面

<img src="./docs/assets/images/screenshots/web/chat.png" width="300" alt="Web 聊天界面">
<img src="./docs/assets/images/screenshots/web/group.png" width="300" alt="Web 群组界面">

### 移动端界面

<img src="./docs/assets/images/screenshots/mobile/chat.png" width="200" alt="移动端聊天界面">
<img src="./docs/assets/images/screenshots/mobile/profile.png" width="200" alt="移动端个人资料界面">

### 视频通话

<img src="./docs/assets/images/screenshots/video/call.png" width="300" alt="视频通话界面">

</div>

---

<div align="center">

**如果这个项目对你有帮助，请给我们一个 ⭐️ Star！**

[![Star History Chart](https://api.star-history.com/svg?repos=Sdkwork-Cloud/openchat&type=Date)](https://star-history.com/#Sdkwork-Cloud/openchat&Date)

---

© 2024 Sdkwork Cloud. All rights reserved.

</div>
