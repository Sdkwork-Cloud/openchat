# 扩展插件体系

## 概述

OpenChat 扩展插件体系用于在不破坏 IM 核心边界的前提下接入外部能力或替换默认实现。

核心目标：

- 低耦合
- 可替换
- 可扩展
- 可观测

## 分层模型

扩展体系分为四层：

1. 应用层
   认证、用户、IM 等业务服务通过代理层访问扩展能力。
2. 代理层
   对上提供稳定接口，例如用户中心代理。
3. 核心层
   负责注册、生命周期、配置校验和健康检查。
4. 插件层
   提供具体的扩展实现。

## 核心组件

### ExtensionRegistry

负责扩展注册、发现、依赖解析与主扩展选择。

```typescript
await extensionRegistry.register(extension, config);

const extension = extensionRegistry.get('plugin-id');
const userCenters = extensionRegistry.getByType(ExtensionType.USER_CENTER);
const primary = extensionRegistry.getPrimary(ExtensionType.USER_CENTER);
```

### ExtensionLifecycleManager

控制扩展的状态流转：

- `UNLOADED`
- `LOADING`
- `LOADED`
- `ACTIVATING`
- `ACTIVE`
- `DEACTIVATING`
- `INACTIVE`
- `ERROR`

### ExtensionConfigValidator

在扩展激活前按 schema 校验配置。

### ExtensionHealthService

负责周期性健康检查，并支持自动恢复策略。

## 插件类型

| 类型 | 说明 | 用途 |
|------|------|------|
| `user-center` | 用户中心插件 | 用户认证与资料来源 |
| `auth-strategy` | 认证策略插件 | 扩展认证方式 |
| `storage` | 存储插件 | 文件与对象存储 |
| `notification` | 通知插件 | 消息通知投递 |
| `ai-model` | AI 模型插件 | AI 模型调用 |
| `im-channel` | IM 通道插件 | 外部 IM 通道接入 |
| `custom` | 自定义插件 | 业务自定义扩展点 |

## 快速开始

### 使用默认用户中心

```typescript
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

`REMOTE_USER_CENTER_API_PREFIX` 是外部用户中心服务的示例路径，不是 OpenChat IM 自身的 `/im/v3` 或 `/admin/im/v3` 前缀。

## 目录结构

```text
src/extensions/
|- core/
|  |- extension.interface.ts
|  |- extension-registry.service.ts
|  |- extension-lifecycle.manager.ts
|  |- extension-config.validator.ts
|  |- extension-health.service.ts
|- user-center/
|  |- user-center.interface.ts
|  |- default-user-center.extension.ts
|  |- remote-user-center.extension.ts
|  |- user-center.proxy.ts
|- extensions.module.ts
|- index.ts
```

## 更多内容

- [用户中心插件](/zh/extension/user-center)
- [开发指南](/zh/extension/development)