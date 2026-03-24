# Extension Plugin System

## Overview

The OpenChat extension system is a pluggable architecture for integrating external capabilities without coupling them to the IM core.

Core design goals:

- loose coupling
- replaceability
- controlled extensibility
- operational visibility

## Layer Model

The extension system is organized into four layers:

1. Application layer
   Auth, user, and IM services call extension proxies instead of vendor-specific implementations.
2. Proxy layer
   Proxies expose stable interfaces such as user-center integration.
3. Core layer
   Registry, lifecycle management, config validation, and health checking live here.
4. Plugin layer
   Concrete plugins implement the extension contracts.

## Core Components

### ExtensionRegistry

Manages extension registration, discovery, dependency resolution, and primary selection.

```typescript
await extensionRegistry.register(extension, config);

const extension = extensionRegistry.get('plugin-id');
const userCenters = extensionRegistry.getByType(ExtensionType.USER_CENTER);
const primary = extensionRegistry.getPrimary(ExtensionType.USER_CENTER);
```

### ExtensionLifecycleManager

Controls extension state transitions:

- `UNLOADED`
- `LOADING`
- `LOADED`
- `ACTIVATING`
- `ACTIVE`
- `DEACTIVATING`
- `INACTIVE`
- `ERROR`

### ExtensionConfigValidator

Validates extension configuration against schema definitions before activation.

### ExtensionHealthService

Runs periodic health checks and supports auto-recovery policies.

## Plugin Types

| Type | Description | Purpose |
|------|-------------|---------|
| `user-center` | User center plugin | user authentication and profile source |
| `auth-strategy` | Auth strategy plugin | additional authentication methods |
| `storage` | Storage plugin | file storage and object management |
| `notification` | Notification plugin | message notification delivery |
| `ai-model` | AI model plugin | AI model invocation |
| `im-channel` | IM channel plugin | external IM channel integration |
| `custom` | Custom plugin | domain-specific extension points |

## Quick Start

### Using the default user center

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

### Using a remote user center

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

### Environment Configuration

```bash
# User center plugin selection
USER_CENTER_EXTENSION=openchat-user-center-default

# Remote user center configuration
REMOTE_USER_CENTER_BASE_URL=https://your-user-center.com
REMOTE_USER_CENTER_API_PREFIX=/api/v1
REMOTE_USER_CENTER_AUTH_METHOD=bearer
REMOTE_USER_CENTER_API_KEY=your-api-key
REMOTE_USER_CENTER_LOCAL_TOKEN_SIGNING=true

# JWT configuration
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=7200
JWT_REFRESH_EXPIRES_IN=604800

# Health check configuration
EXTENSION_HEALTH_CHECK_ENABLED=true
EXTENSION_HEALTH_CHECK_INTERVAL=60000
EXTENSION_AUTO_RECOVERY=true
```

`REMOTE_USER_CENTER_API_PREFIX` is an external user-center sample path. It is not the OpenChat IM API prefix and does not change `/im/v3` or `/admin/im/v3`.

## File Structure

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

## More

- [User Center Plugin](/en/extension/user-center)
- [Development Guide](/en/extension/development)
