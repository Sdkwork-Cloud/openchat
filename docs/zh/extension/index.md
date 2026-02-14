# 扩展插件体系

## 概述

OpenChat 扩展插件体系是一个企业级的可插拔架构设计，允许开发者通过插件的方式扩展和定制系统功能。核心设计理念是**松耦合、可替换、可扩展、高可用**。

## 架构设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Application Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Auth Service   │  │  User Service   │  │   IM Service    │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                  │
│           ▼                    ▼                    ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┤
│  │                      Extension Proxy Layer                          │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │
│  │  │ UserCenterProxy │  │   Other Proxies │                          │
│  │  └────────┬────────┘  └─────────────────┘                          │
│  └───────────┼─────────────────────────────────────────────────────────┤
│              │                                                          │
│              ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┤
│  │                      Extension Core Layer                           │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │  │ ExtensionRegistry │  │ LifecycleManager  │  │ ConfigValidator │ │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
│  │  ┌───────────────────┐                                              │
│  │  │  HealthService    │                                              │
│  │  └───────────────────┘                                              │
│  └─────────────────────────────────────────────────────────────────────┤
│              │                                                          │
│              ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┤
│  │                      Extension Plugins                              │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  │ Default User    │  │ Remote User     │  │ Custom Plugin   │     │
│  │  │ Center Plugin   │  │ Center Plugin   │  │   ...           │     │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│  └─────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心组件

### ExtensionRegistry（插件注册中心）

负责管理所有插件的生命周期、依赖关系和状态。

```typescript
// 注册插件
await extensionRegistry.register(extension, config);

// 获取插件
const extension = extensionRegistry.get('plugin-id');

// 获取指定类型的插件
const userCenters = extensionRegistry.getByType(ExtensionType.USER_CENTER);

// 获取最高优先级的插件
const primary = extensionRegistry.getPrimary(ExtensionType.USER_CENTER);
```

### ExtensionLifecycleManager（生命周期管理器）

管理插件的状态转换和生命周期钩子。

```
状态转换图：

UNLOADED → LOADING → LOADED → ACTIVATING → ACTIVE
    ↑          ↓         ↓          ↓         ↓
    └────── ERROR ←──────┴──────────┴← DEACTIVATING ← INACTIVE
```

### ExtensionConfigValidator（配置验证器）

验证插件配置是否符合 Schema 定义。

### ExtensionHealthService（健康检查服务）

定期检查插件健康状态，支持自动恢复。

## 插件类型

| 类型 | 说明 | 用途 |
|------|------|------|
| `user-center` | 用户中心插件 | 提供用户认证和管理能力 |
| `auth-strategy` | 认证策略插件 | 提供额外的认证方式 |
| `storage` | 存储插件 | 提供文件存储能力 |
| `notification` | 通知插件 | 提供消息通知能力 |
| `ai-model` | AI 模型插件 | 提供 AI 模型调用能力 |
| `im-channel` | IM 渠道插件 | 提供 IM 消息渠道能力 |
| `custom` | 自定义插件 | 自定义扩展能力 |

## 快速开始

### 使用默认用户中心

```typescript
// app.module.ts
import { ExtensionsModule } from './extensions';

@Module({
  imports: [
    ExtensionsModule.forRoot({
      useDefaultUserCenter: true,
      enableHealthCheck: true,
    }),
  ],
})
export class AppModule {}
```

### 使用远程用户中心

```typescript
// app.module.ts
import { ExtensionsModule } from './extensions';

@Module({
  imports: [
    ExtensionsModule.forRoot({
      useDefaultUserCenter: false,
      useRemoteUserCenter: true,
      primaryUserCenterId: 'openchat-user-center-remote',
    }),
  ],
})
export class AppModule {}
```

### 环境变量配置

```bash
# .env

# 用户中心插件选择
USER_CENTER_EXTENSION=openchat-user-center-default

# 远程用户中心配置
REMOTE_USER_CENTER_BASE_URL=https://your-user-center.com
REMOTE_USER_CENTER_API_PREFIX=/api/v1
REMOTE_USER_CENTER_AUTH_METHOD=bearer
REMOTE_USER_CENTER_API_KEY=your-api-key
REMOTE_USER_CENTER_LOCAL_TOKEN_SIGNING=true

# JWT 配置
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=7200
JWT_REFRESH_EXPIRES_IN=604800

# 健康检查配置
EXTENSION_HEALTH_CHECK_ENABLED=true
EXTENSION_HEALTH_CHECK_INTERVAL=60000
EXTENSION_AUTO_RECOVERY=true
```

## 文件结构

```
src/extensions/
├── core/
│   ├── extension.interface.ts          # 核心接口定义
│   ├── extension-registry.service.ts   # 插件注册中心
│   ├── extension-lifecycle.manager.ts  # 生命周期管理器
│   ├── extension-config.validator.ts   # 配置验证器
│   └── extension-health.service.ts     # 健康检查服务
├── user-center/
│   ├── user-center.interface.ts        # 用户中心插件接口
│   ├── default-user-center.extension.ts # 默认本地用户中心
│   ├── remote-user-center.extension.ts  # 远程用户中心
│   └── user-center.proxy.ts            # 用户中心代理
├── extensions.module.ts                # 扩展模块
├── index.ts                            # 入口文件
└── README.md                           # 使用文档
```

## 更多内容

- [用户中心插件](/zh/extension/user-center) - 用户中心插件详细文档
- [开发指南](/zh/extension/development) - 如何开发自定义插件
