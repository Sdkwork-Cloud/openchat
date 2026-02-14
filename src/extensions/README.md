# OpenChat 扩展插件体系

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

### 1. ExtensionRegistry（插件注册中心）

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

### 2. ExtensionLifecycleManager（生命周期管理器）

管理插件的状态转换和生命周期钩子。

```
状态转换图：

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  UNLOADED   │────▶│   LOADING   │────▶│   LOADED    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  INACTIVE   │◀────│DEACTIVATING │◀────│ ACTIVATING  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       ▲
       │              ┌─────────────┐          │
       └─────────────▶│   ACTIVE    │──────────┘
                      └─────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │   ERROR     │
                      └─────────────┘
```

### 3. ExtensionConfigValidator（配置验证器）

验证插件配置是否符合 Schema 定义。

```typescript
const result = configValidator.validate(extension, config);
if (!result.valid) {
  console.error('Config errors:', result.errors);
}
```

### 4. ExtensionHealthService（健康检查服务）

定期检查插件健康状态，支持自动恢复。

```typescript
// 获取系统健康报告
const report = await healthService.getSystemHealthReport();

// 手动触发健康检查
const report = await healthService.triggerHealthCheck();
```

## 插件类型

| 类型 | 说明 | 用途 |
|------|------|------|
| `USER_CENTER` | 用户中心插件 | 提供用户认证和管理能力 |
| `AUTH_STRATEGY` | 认证策略插件 | 提供额外的认证方式 |
| `STORAGE` | 存储插件 | 提供文件存储能力 |
| `NOTIFICATION` | 通知插件 | 提供消息通知能力 |
| `AI_MODEL` | AI 模型插件 | 提供 AI 模型调用能力 |
| `IM_CHANNEL` | IM 渠道插件 | 提供 IM 消息渠道能力 |
| `CUSTOM` | 自定义插件 | 自定义扩展能力 |

## 快速开始

### 1. 使用默认用户中心

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

### 2. 使用远程用户中心

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

### 3. 环境变量配置

```bash
# .env

# 用户中心插件选择
USER_CENTER_EXTENSION=openchat-user-center-default

# 远程用户中心配置
REMOTE_USER_CENTER_URL=https://your-user-center.com
REMOTE_USER_CENTER_API_PREFIX=/api/v1
REMOTE_USER_CENTER_AUTH_METHOD=bearer
REMOTE_USER_CENTER_API_KEY=your-api-key
REMOTE_USER_CENTER_LOCAL_TOKEN=true

# JWT 配置
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=7200
JWT_REFRESH_EXPIRES_IN=604800

# 健康检查配置
EXTENSION_HEALTH_CHECK_ENABLED=true
EXTENSION_HEALTH_CHECK_INTERVAL=60000
EXTENSION_UNHEALTHY_THRESHOLD=3
EXTENSION_AUTO_RECOVERY=true
EXTENSION_RECOVERY_RETRIES=3
```

## 开发自定义用户中心插件

### 1. 实现插件接口

```typescript
import { Injectable } from '@nestjs/common';
import {
  IUserCenterExtension,
  UserInfo,
  UserAuthResult,
  LoginRequest,
  ExtensionType,
  ExtensionMeta,
  UserCenterCapabilities,
} from './extensions';

@Injectable()
export class MyUserCenterExtension implements IUserCenterExtension {
  readonly meta: ExtensionMeta = {
    id: 'my-custom-user-center',
    name: 'My Custom User Center',
    version: '1.0.0',
    description: 'Custom user center implementation',
    author: 'Your Name',
    capabilities: {
      configSchema: {
        apiUrl: {
          type: 'string',
          required: true,
          description: 'API endpoint URL',
        },
        apiKey: {
          type: 'string',
          required: true,
          description: 'API key for authentication',
        },
      },
    },
  };

  readonly type = ExtensionType.USER_CENTER;

  readonly capabilities: UserCenterCapabilities = {
    supportedLoginMethods: ['password', 'oauth'],
    supportsRegistration: true,
    supportsPasswordReset: true,
    supportsUserSearch: true,
    supportsBatchOperations: true,
  };

  async login(request: LoginRequest): Promise<UserAuthResult> {
    // 实现登录逻辑
    const response = await this.callLoginAPI(request);
    
    return {
      success: true,
      user: this.mapUser(response.user),
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    };
  }

  // 实现其他必需方法...
}
```

### 2. 注册插件

```typescript
// app.module.ts
import { ExtensionsModule } from './extensions';
import { MyUserCenterExtension } from './my-user-center.extension';

@Module({
  imports: [
    ExtensionsModule.forRoot({
      useDefaultUserCenter: false,
      extensions: [MyUserCenterExtension],
      primaryUserCenterId: 'my-custom-user-center',
    }),
  ],
})
export class AppModule {}
```

### 3. 使用用户中心代理

```typescript
import { Injectable } from '@nestjs/common';
import { UserCenterProxy } from './extensions';

@Injectable()
export class AuthService {
  constructor(private readonly userCenter: UserCenterProxy) {}

  async login(username: string, password: string) {
    const result = await this.userCenter.login({ username, password });
    
    if (result.success) {
      return {
        user: result.user,
        token: result.accessToken,
      };
    }
    
    throw new UnauthorizedException(result.error);
  }

  async getCurrentUser(userId: string) {
    return this.userCenter.getUserById(userId);
  }

  async checkCapabilities() {
    return this.userCenter.getCapabilities();
  }
}
```

## 插件生命周期钩子

```typescript
class MyExtension implements IExtension {
  async onLoad(context: ExtensionContext): Promise<void> {
    // 初始化资源
    context.logger.info('Extension loaded');
  }

  async onActivate(context: ExtensionContext): Promise<void> {
    // 启动服务
    context.logger.info('Extension activated');
    
    // 监听事件
    context.on('user:login', this.handleUserLogin.bind(this));
  }

  async onDeactivate(context: ExtensionContext): Promise<void> {
    // 停止服务
    context.logger.info('Extension deactivated');
  }

  async onUnload(context: ExtensionContext): Promise<void> {
    // 释放资源
    context.logger.info('Extension unloaded');
  }

  async onConfigChange(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void> {
    // 处理配置变更
    console.log('Config changed:', { oldConfig, newConfig });
  }
}
```

## 健康检查

### 实现健康检查

```typescript
class MyExtension implements IExtension {
  async healthCheck(): Promise<ExtensionHealthCheck> {
    try {
      // 检查外部服务连接
      await this.pingExternalService();
      
      return {
        healthy: true,
        message: 'All services operational',
        details: {
          latency: 50,
          connections: 10,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message,
        timestamp: new Date(),
      };
    }
  }
}
```

### 获取健康报告

```typescript
@Injectable()
export class HealthController {
  constructor(private readonly healthService: ExtensionHealthService) {}

  @Get('health/extensions')
  async getExtensionsHealth() {
    return this.healthService.getSystemHealthReport();
  }
}
```

## 事件系统

### 插件事件

| 事件 | 说明 |
|------|------|
| `extension:before-load` | 插件加载前 |
| `extension:after-load` | 插件加载后 |
| `extension:before-activate` | 插件激活前 |
| `extension:after-activate` | 插件激活后 |
| `extension:before-deactivate` | 插件停用前 |
| `extension:after-deactivate` | 插件停用后 |
| `extension:before-unload` | 插件卸载前 |
| `extension:after-unload` | 插件卸载后 |
| `extension:config-changed` | 插件配置变更 |
| `extension:error` | 插件错误 |

### 用户中心事件

| 事件 | 说明 |
|------|------|
| `user-center:user-login` | 用户登录 |
| `user-center:user-logout` | 用户登出 |
| `user-center:user-register` | 用户注册 |
| `user-center:user-update` | 用户信息更新 |
| `user-center:user-delete` | 用户删除 |
| `user-center:password-change` | 密码修改 |
| `user-center:password-reset` | 密码重置 |

### 监听事件

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuditService {
  @OnEvent('user-center:user-login')
  async handleUserLogin(payload: { userId: string; ip?: string }) {
    await this.logAudit({
      action: 'login',
      userId: payload.userId,
      ip: payload.ip,
      timestamp: new Date(),
    });
  }
}
```

## 最佳实践

### 1. 错误处理

```typescript
async login(request: LoginRequest): Promise<UserAuthResult> {
  try {
    const response = await this.remoteLogin(request);
    return {
      success: true,
      user: response.user,
      accessToken: response.token,
    };
  } catch (error) {
    this.logger.error('Login failed:', error);
    return {
      success: false,
      error: '登录服务暂时不可用，请稍后重试',
      errorCode: UserCenterErrorCode.SERVICE_UNAVAILABLE,
    };
  }
}
```

### 2. 缓存策略

```typescript
async getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null> {
  const cacheStrategy = options?.cacheStrategy || 'cache-first';
  
  if (cacheStrategy === 'cache-first') {
    const cached = await this.cache.get(`user:${userId}`);
    if (cached) return cached;
  }
  
  const user = await this.fetchUser(userId);
  
  if (user && cacheStrategy !== 'network-only') {
    await this.cache.set(`user:${userId}`, user, 300);
  }
  
  return user;
}
```

### 3. 配置 Schema

```typescript
readonly capabilities: ExtensionCapabilities = {
  configSchema: {
    apiUrl: {
      type: 'string',
      required: true,
      description: 'API endpoint URL',
      pattern: '^https?://.*',
    },
    timeout: {
      type: 'number',
      required: false,
      default: 30000,
      minimum: 1000,
      maximum: 60000,
      description: 'Request timeout in milliseconds',
    },
    retries: {
      type: 'number',
      required: false,
      default: 3,
      minimum: 0,
      maximum: 10,
      description: 'Number of retry attempts',
    },
  },
};
```

## 迁移指南

### 从内置用户中心迁移到远程用户中心

1. **配置环境变量**
```bash
USER_CENTER_EXTENSION=openchat-user-center-remote
REMOTE_USER_CENTER_URL=https://your-sso.example.com
```

2. **更新模块配置**
```typescript
ExtensionsModule.forRoot({
  useDefaultUserCenter: false,
  useRemoteUserCenter: true,
})
```

3. **验证接口兼容性**
确保远程用户中心 API 返回的数据格式符合 `UserInfo` 接口定义。

4. **测试认证流程**
- 测试登录/登出
- 测试 Token 刷新
- 测试用户信息获取

## 常见问题

### Q: 如何切换用户中心插件？

A: 通过环境变量 `USER_CENTER_EXTENSION` 指定插件ID，或在模块配置中设置 `primaryUserCenterId`。

### Q: 远程用户中心返回的数据格式不兼容怎么办？

A: 在 `RemoteUserCenterExtension` 中重写 `mapUserInfo` 方法进行数据转换。

### Q: 如何实现多租户用户中心？

A: 创建自定义插件，在 `login` 方法中根据租户标识选择不同的认证逻辑。

### Q: 插件加载失败怎么办？

A: 检查插件依赖是否满足，查看日志中的错误信息，确保 `onLoad` 方法没有抛出异常。

### Q: 如何调试插件问题？

A: 使用插件上下文提供的日志服务，查看插件状态和健康检查报告。

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
