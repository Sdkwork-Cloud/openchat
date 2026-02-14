# 插件架构设计

## 设计原则

OpenChat 扩展插件体系的设计遵循以下核心原则：

### 1. 开闭原则 (Open-Closed Principle)

- **对扩展开放**：通过插件接口可以无限扩展系统功能
- **对修改封闭**：核心代码无需修改即可支持新功能

### 2. 依赖倒置原则 (Dependency Inversion Principle)

- 业务代码依赖抽象接口，而非具体实现
- 通过依赖注入实现解耦

### 3. 单一职责原则 (Single Responsibility Principle)

- 每个插件只负责一个领域的功能
- 核心框架专注于生命周期和调度

## 架构分层

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                               │
│                    (Controllers, Gateways)                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Service Layer                                   │
│              (Business Logic, Domain Services)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Proxy Layer ( Facade )                           │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │ UserCenterProxy │  │  StorageProxy   │  │ NotificationProxy│        │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │
└────────────┼─────────────────────┼─────────────────────┼─────────────────┘
             │                     │                     │
             ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Plugin Layer                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │  Default User   │  │ Remote User     │  │  Custom Plugin  │        │
│   │  Center Plugin  │  │ Center Plugin   │  │    ...          │        │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Infrastructure Layer                              │
│       (Database, Cache, External Services, IM Platform)                │
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心机制

### 1. 插件注册机制

```typescript
// 插件注册流程
class ExtensionRegistry {
  private plugins = new Map<string, IExtension>();
  private typeIndex = new Map<ExtensionType, Set<IExtension>>();

  async register(extension: IExtension, config: ExtensionConfig): Promise<void> {
    // 1. 验证插件元信息
    this.validateMeta(extension.meta);

    // 2. 检查依赖
    this.checkDependencies(extension.meta.dependencies);

    // 3. 创建插件上下文
    const context = this.createContext(extension, config);

    // 4. 加载插件
    await extension.onLoad?.(context);

    // 5. 注册到索引
    this.plugins.set(extension.meta.id, extension);
    this.typeIndex.get(extension.type)?.add(extension);

    // 6. 如果启用，自动激活
    if (config.enabled) {
      await this.activate(extension.meta.id);
    }
  }
}
```

### 2. 生命周期管理

插件生命周期包含以下状态：

| 状态 | 说明 | 允许转换到 |
|------|------|-----------|
| `unloaded` | 未加载 | `loading` |
| `loading` | 加载中 | `loaded`,| `loaded` `error` |
 | 已加载 | `activating`, `unloading` |
| `activating` | 激活中 | `active`, `error` |
| `active` | 运行中 | `deactivating` |
| `deactivating` | 停用中 | `loaded`, `error` |
| `inactive` | 已停用 | `activating`, `unloading` |
| `error` | 错误状态 | `unloading` |

### 3. 依赖注入

插件通过 `ExtensionContext` 获取依赖：

```typescript
interface ExtensionContext {
  // 获取配置
  config: ExtensionConfig;
  
  // 日志服务
  logger: ExtensionLogger;
  
  // 获取其他插件
  getExtension: (id: string) => IExtension | null;
  getExtensionsByType: (type: ExtensionType) => IExtension[];
  
  // 事件系统
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, listener: Function) => void;
  off: (event: string, listener: Function) => void;
}
```

### 4. 配置验证

插件配置通过 JSON Schema 进行验证：

```typescript
interface ConfigFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: any;
  description?: string;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

// 示例：用户中心插件配置 Schema
const userCenterSchema = {
  type: 'object',
  properties: {
    jwtSecret: { type: 'string', required: true, minLength: 32 },
    accessTokenExpiresIn: { type: 'number', default: 7200, minimum: 60 },
    refreshTokenExpiresIn: { type: 'number', default: 604800, minimum: 3600 },
  }
};
```

### 5. 健康检查

健康检查支持多层检查：

```typescript
interface ExtensionHealthCheck {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// 检查级别
enum HealthCheckLevel {
  BASIC = 'basic',     // 基础检查：进程存活
  STANDARD = 'standard', // 标准检查：依赖服务
  DEEP = 'deep'        // 深度检查：业务逻辑
}
```

## 扩展点设计

### 1. 用户中心扩展点

| 扩展点 | 接口 | 说明 |
|--------|------|------|
| 用户认证 | `login()`, `register()` | 支持多种认证方式 |
| 用户查询 | `getUserById()`, `getUsers()` | 支持多种查询条件 |
| 用户管理 | `updateUser()`, `deleteUser()` | 用户 CRUD 操作 |
| 密码管理 | `changePassword()`, `resetPassword()` | 密码安全操作 |
| 验证码 | `sendVerificationCode()` | 短信/邮箱验证码 |
| IM 集成 | `syncUserToIM()` | 与 IM 系统同步 |

### 2. 存储扩展点

| 扩展点 | 接口 | 说明 |
|--------|------|------|
| 文件上传 | `upload()` | 支持多种存储后端 |
| 文件下载 | `download()` | 支持 CDN 加速 |
| 文件删除 | `delete()` | 清理存储资源 |

### 3. 通知扩展点

| 扩展点 | 接口 | 说明 |
|--------|------|------|
| 推送通知 | `sendPush()` | 移动端推送 |
| 邮件通知 | `sendEmail()` | 邮件服务 |
| 短信通知 | `sendSms()` | 短信服务 |

## 性能优化

### 1. 插件延迟加载

```typescript
// 按需加载插件
const extension = await extensionRegistry.lazyLoad('plugin-id');
```

### 2. 插件缓存

```typescript
// 插件实例缓存
private pluginCache = new Map<string, WeakRef<IExtension>>();
```

### 3. 批量操作优化

```typescript
// 批量获取用户
const users = await userCenter.getUsers(['id1', 'id2', 'id3', ...]);
```

### 4. 连接池复用

```typescript
// HTTP 连接池
const httpAgent = new Agent({
  keepAlive: true,
  maxSockets: 10,
});
```

## 安全设计

### 1. 配置加密

敏感配置（如 API Key）自动加密存储：

```typescript
interface ConfigFieldSchema {
  secret?: boolean;  // 标记为敏感字段
}
```

### 2. 权限控制

```typescript
interface ExtensionCapabilities {
  // 权限声明
  permissions?: string[];
}
```

### 3. 审计日志

```typescript
// 所有插件操作都记录审计日志
context.logger.info('Plugin operation', {
  extensionId: extension.meta.id,
  operation: 'login',
  userId: user.id,
  timestamp: new Date(),
});
```

## 故障恢复

### 1. 自动重试

```typescript
// 插件加载失败自动重试
await retry(() => extension.onLoad(context), {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
});
```

### 2. 熔断器

```typescript
// 外部服务调用使用熔断器
const breaker = new CircuitBreaker(callExternalService, {
  timeout: 3000,
  errorThreshold: 50,
  resetTimeout: 30000,
});
```

### 3. 降级策略

```typescript
// 插件不可用时使用降级实现
if (!extension.getOnlineStatus) {
  return defaultOfflineStatus();
}
```

## 监控指标

| 指标 | 说明 |
|------|------|
| `extension.load.count` | 插件加载次数 |
| `extension.activate.duration` | 插件激活耗时 |
| `extension.health.check` | 健康检查结果 |
| `extension.request.total` | 请求总数 |
| `extension.request.error` | 请求错误数 |
| `extension.request.latency` | 请求延迟 |

## 最佳实践

### 1. 插件开发

- 遵循单一职责原则
- 实现完整的生命周期钩子
- 提供健康检查实现
- 做好错误处理和日志记录

### 2. 配置管理

- 使用环境变量
- 敏感信息加密
- 提供合理的默认值
- 配置变更时触发回调

### 3. 性能考虑

- 避免阻塞主线程
- 使用异步操作
- 合理使用缓存
- 批量操作优化
