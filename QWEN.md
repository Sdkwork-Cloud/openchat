# OpenChat Server - Project Context

## 项目概述

OpenChat 是一个开源的即时通讯平台服务端，基于 **NestJS 11.x** 和 **TypeScript 5.9+** 构建。提供完整的 IM 功能，包括实时消息、群组管理、音视频通话、AI 机器人集成等。

### 核心技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | NestJS | 11.x | 应用服务器框架 |
| 语言 | TypeScript | 5.9+ | 开发语言 |
| 数据库 | PostgreSQL | 15+ | 主数据库 |
| ORM | TypeORM | 0.3.x | 数据库 ORM |
| 缓存 | Redis | 7+ | 缓存、消息队列、WebSocket 适配器 |
| WebSocket | Socket.IO | 4.x | 实时通信 |
| IM 引擎 | WukongIM | v2 | 专业消息引擎 |
| 队列 | BullMQ | 5.x | 异步任务处理 |
| 认证 | JWT + Passport | - | 身份认证 |

### 主要功能模块

- **用户系统** - 注册、登录、个人资料管理
- **好友系统** - 好友添加、删除、分组管理
- **群组系统** - 群组创建、成员管理、权限控制
- **消息系统** - 文本、图片、语音、视频、文件消息
- **会话系统** - 会话列表、置顶、免打扰
- **联系人系统** - 联系人列表管理
- **RTC** - 实时音视频通话
- **AI Bot** - AI 机器人集成
- **第三方集成** - Telegram、WhatsApp、Webhook
- **IoT** - ESP32 设备支持

## 项目结构

```
openchat-server/
├── src/                        # 服务端源代码
│   ├── common/                 # 公共模块
│   │   ├── auth/               # 认证授权（guards, strategies, decorators）
│   │   ├── base/               # 基类
│   │   ├── cache/              # 缓存服务
│   │   ├── config/             # 配置管理
│   │   ├── constants/          # 常量定义
│   │   ├── dto/                # 数据传输对象
│   │   ├── events/             # 事件总线
│   │   ├── exceptions/         # 异常处理
│   │   ├── filters/            # 过滤器
│   │   ├── health/             # 健康检查
│   │   ├── interceptors/       # 拦截器
│   │   ├── logger/             # 日志服务
│   │   ├── metrics/            # 性能监控
│   │   ├── queue/              # 消息队列
│   │   ├── redis/              # Redis 服务
│   │   ├── throttler/          # 限流
│   │   └── utils/              # 工具函数
│   ├── gateways/               # WebSocket 网关
│   ├── modules/                # 业务模块
│   │   ├── agent/              # 智能代理
│   │   ├── ai-bot/             # AI 机器人
│   │   ├── bot-platform/       # 机器人平台
│   │   ├── contact/            # 联系人
│   │   ├── conversation/       # 会话
│   │   ├── friend/             # 好友系统
│   │   ├── group/              # 群组系统
│   │   ├── im-provider/        # IM 提供者
│   │   ├── iot/                # IoT 设备
│   │   ├── message/            # 消息系统
│   │   ├── rtc/                # 实时音视频
│   │   ├── third-party/        # 第三方集成
│   │   ├── user/               # 用户系统
│   │   └── wukongim/           # WukongIM 集成
│   ├── extensions/             # 扩展模块
│   ├── app.module.ts           # 应用主模块
│   ├── bootstrap.ts            # 启动引导
│   ├── data-source.ts          # 数据源配置
│   └── main.ts                 # 入口文件
├── app/                        # 应用程序（前端）
├── sdk/                        # SDK 目录
├── database/                   # 数据库脚本
│   ├── schema.sql              # 数据库结构
│   ├── seed.sql                # 种子数据
│   └── indexes-optimization.sql # 索引优化
├── docker-compose*.yml         # Docker 编排配置
├── scripts/                    # 脚本工具
├── test/                       # 测试文件
└── docs/                       # 文档
```

## 构建与运行

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| pnpm | 8+ | 包管理器 |
| PostgreSQL | 15+ | 数据库（可外部） |
| Redis | 7+ | 缓存（可外部） |
| Docker | 24.0+ | 容器运行（推荐） |

### 安装依赖

```bash
pnpm install
```

### 环境配置

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，至少需要设置：
# JWT_SECRET=your-jwt-secret-at-least-32-characters-long
```

### 开发模式运行

```bash
# 启动开发服务器（带热重载）
pnpm run start:dev

# 或直接使用
pnpm run dev
```

### 生产模式运行

```bash
# 构建
pnpm run build

# 启动生产服务器
pnpm run start:prod
```

### Docker 运行（推荐）

```bash
# 快速启动（包含所有服务）
pnpm run docker:quick

# 或使用 docker compose
docker compose -f docker-compose.quick.yml up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose -f docker-compose.quick.yml down
```

### 健康检查

```bash
# 快速健康检查
pnpm run health

# 完整健康检查
pnpm run health:full
```

### 访问端点

| 服务 | URL |
|------|-----|
| API 服务 | http://localhost:3000 |
| Swagger 文档 | http://localhost:3000/api/docs |
| 健康检查 | http://localhost:3000/health |
| WukongIM Demo | http://localhost:5172 |
| WukongIM 管理 | http://localhost:5300/web |

## 测试

```bash
# 单元测试
pnpm run test

# 测试覆盖率
pnpm run test:cov

# E2E 测试
pnpm run test:e2e

# 监视模式
pnpm run test:watch
```

## 代码质量

```bash
# 代码格式化
pnpm run format

# ESLint 检查
pnpm run lint

# 类型检查
pnpm run typecheck
```

## 数据库迁移

```bash
# 生成迁移文件
pnpm run migration:generate -- -n MigrationName

# 执行迁移
pnpm run migration:run

# 回滚迁移
pnpm run migration:revert

# 初始化数据库
pnpm run db:init

# 插入种子数据
pnpm run db:seed
```

## 开发规范

### 命名约定

| 项目 | 约定 | 示例 |
|------|------|------|
| 类名 | PascalCase | `UserService` |
| 方法名 | camelCase | `getUserById()` |
| 变量名 | camelCase | `userId` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件/目录名 | kebab-case | `user-service.ts` |
| 模块名 | PascalCase | `UserModule` |

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 NestJS 代码风格指南
- 使用 ESLint + Prettier 保证代码质量
- 依赖注入使用构造函数注入
- 服务类使用 `@Injectable()` 装饰器

### 模块结构

每个业务模块应包含：
- `xxx.module.ts` - 模块定义
- `xxx.controller.ts` - HTTP 控制器
- `xxx.service.ts` - 业务逻辑服务
- `xxx.entity.ts` - 数据库实体
- `dto/` - 数据传输对象
- `interfaces/` - 接口定义

### 提交规范

遵循 Conventional Commits：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具配置

## 关键配置项

### 必需配置

```bash
# .env 文件中必须设置
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
```

### 数据库配置

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your-password
DB_NAME=openchat
```

### Redis 配置

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### WukongIM 配置

```bash
WUKONGIM_API_URL=http://localhost:5001
WUKONGIM_TCP_ADDR=localhost:5100
WUKONGIM_WS_URL=ws://localhost:5200
```

## 诊断工具

项目提供了一套完整的诊断和修复工具：

```bash
# 系统预检查
pnpm run precheck

# 运行诊断
pnpm run diagnose

# 自动修复常见问题
pnpm run auto-fix

# 分析日志
pnpm run log:analyze

# 健康监控
pnpm run health:monitor
```

## 常见问题

### WukongIM 连接问题

1. 检查 WukongIM 服务是否运行：`docker ps | grep wukongim`
2. 验证 `WUKONGIM_API_URL` 配置
3. 运行：`pnpm run diagnose`

### 数据库连接问题

1. 确保 PostgreSQL 服务运行：`docker ps | grep postgres`
2. 验证 `.env` 中的数据库配置
3. 运行：`pnpm run auto-fix`

### Redis 连接问题

1. 检查 Redis 服务运行：`docker ps | grep redis`
2. 验证 Redis 配置
3. 运行：`pnpm run auto-fix --redis`

## 相关文档

- [README.md](README.md) - 项目主文档（英文）
- [README_CN.md](README_CN.md) - 项目主文档（中文）
- [ARCHITECT.md](ARCHITECT.md) - 架构标准文档
- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
- [INSTALL_CN.md](INSTALL_CN.md) - 安装指南（中文）
- [INSTALL_EN.md](INSTALL_EN.md) - 安装指南（英文）

## API 路由前缀

- HTTP API: `/im/api/v1`
- WebSocket: `/chat-v2`
- Swagger 文档: `/api/docs`
- 健康检查: `/health`（无前缀）

## 注意事项

1. **环境变量**: 生产环境必须修改 `.env` 中的默认值，特别是 `JWT_SECRET`
2. **数据库同步**: 开发环境 `DB_SYNCHRONIZE=true`，生产环境必须设为 `false`
3. **CORS**: 根据实际需求配置 `CORS_ORIGINS`
4. **资源限制**: Docker 部署时注意调整内存限制配置
5. **日志**: 生产环境建议使用 `LOG_FORMAT=json` 并启用文件日志
