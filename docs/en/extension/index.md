# Extension Plugin System

## Overview

The OpenChat Extension Plugin System is an enterprise-grade pluggable architecture that allows developers to extend and customize system functionality through plugins. The core design principles are **loose coupling, replaceability, extensibility, and high availability**.

## Architecture

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

## Core Components

### ExtensionRegistry

Manages the lifecycle, dependencies, and state of all plugins.

```typescript
// Register plugin
await extensionRegistry.register(extension, config);

// Get plugin
const extension = extensionRegistry.get('plugin-id');

// Get plugins by type
const userCenters = extensionRegistry.getByType(ExtensionType.USER_CENTER);

// Get primary plugin
const primary = extensionRegistry.getPrimary(ExtensionType.USER_CENTER);
```

### ExtensionLifecycleManager

Manages plugin state transitions and lifecycle hooks.

```
State Transitions:

UNLOADED → LOADING → LOADED → ACTIVATING → ACTIVE
    ↑          ↓         ↓          ↓         ↓
    └────── ERROR ←──────┴──────────┴← DEACTIVATING ← INACTIVE
```

### ExtensionConfigValidator

Validates plugin configuration against schema definitions.

### ExtensionHealthService

Periodically checks plugin health status with auto-recovery support.

## Plugin Types

| Type | Description | Purpose |
|------|-------------|---------|
| `user-center` | User Center Plugin | Provides user authentication and management |
| `auth-strategy` | Auth Strategy Plugin | Provides additional authentication methods |
| `storage` | Storage Plugin | Provides file storage capabilities |
| `notification` | Notification Plugin | Provides message notification capabilities |
| `ai-model` | AI Model Plugin | Provides AI model invocation capabilities |
| `im-channel` | IM Channel Plugin | Provides IM message channel capabilities |
| `custom` | Custom Plugin | Custom extension capabilities |

## Quick Start

### Using Default User Center

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

### Using Remote User Center

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

### Environment Configuration

```bash
# .env

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

## File Structure

```
src/extensions/
├── core/
│   ├── extension.interface.ts          # Core interface definitions
│   ├── extension-registry.service.ts   # Plugin registry
│   ├── extension-lifecycle.manager.ts  # Lifecycle manager
│   ├── extension-config.validator.ts   # Config validator
│   └── extension-health.service.ts     # Health check service
├── user-center/
│   ├── user-center.interface.ts        # User center plugin interface
│   ├── default-user-center.extension.ts # Default local user center
│   ├── remote-user-center.extension.ts  # Remote user center
│   └── user-center.proxy.ts            # User center proxy
├── extensions.module.ts                # Extension module
├── index.ts                            # Entry file
└── README.md                           # Documentation
```

## More

- [User Center Plugin](/en/extension/user-center) - Detailed user center plugin documentation
- [Development Guide](/en/extension/development) - How to develop custom plugins
