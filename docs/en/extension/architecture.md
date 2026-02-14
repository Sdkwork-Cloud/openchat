# Plugin Architecture Design

## Design Principles

The OpenChat Extension Plugin System follows these core design principles:

### 1. Open-Closed Principle

- **Open for extension**: System functionality can be infinitely extended through plugin interfaces
- **Closed for modification**: Core code needs no modification to support new features

### 2. Dependency Inversion Principle

- Business code depends on abstract interfaces, not concrete implementations
- Decoupling through dependency injection

### 3. Single Responsibility Principle

- Each plugin is responsible for one domain of functionality
- Core framework focuses on lifecycle and scheduling

## Architecture Layers

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
│   │ UserCenterProxy │  │  StorageProxy   │  │NotificationProxy│        │
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

## Core Mechanisms

### 1. Plugin Registration Mechanism

```typescript
// Plugin registration flow
class ExtensionRegistry {
  private plugins = new Map<string, IExtension>();
  private typeIndex = new Map<ExtensionType, Set<IExtension>>();

  async register(extension: IExtension, config: ExtensionConfig): Promise<void> {
    // 1. Validate plugin metadata
    this.validateMeta(extension.meta);

    // 2. Check dependencies
    this.checkDependencies(extension.meta.dependencies);

    // 3. Create plugin context
    const context = this.createContext(extension, config);

    // 4. Load plugin
    await extension.onLoad?.(context);

    // 5. Register to index
    this.plugins.set(extension.meta.id, extension);
    this.typeIndex.get(extension.type)?.add(extension);

    // 6. Auto-activate if enabled
    if (config.enabled) {
      await this.activate(extension.meta.id);
    }
  }
}
```

### 2. Lifecycle Management

Plugin lifecycle includes the following states:

| State | Description | Transitions To |
|-------|-------------|----------------|
| `unloaded` | Not loaded | `loading` |
| `loading` | Loading | `loaded`, `error` |
| `loaded` | Loaded | `activating`, `unloading` |
| `activating` | Activating | `active`, `error` |
| `active` | Running | `deactivating` |
| `deactivating` | Deactivating | `loaded`, `error` |
| `inactive` | Inactive | `activating`, `unloading` |
| `error` | Error | `unloading` |

### 3. Dependency Injection

Plugins access dependencies through `ExtensionContext`:

```typescript
interface ExtensionContext {
  // Get config
  config: ExtensionConfig;
  
  // Logger service
  logger: ExtensionLogger;
  
  // Get other plugins
  getExtension: (id: string) => IExtension | null;
  getExtensionsByType: (type: ExtensionType) => IExtension[];
  
  // Event system
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, listener: Function) => void;
  off: (event: string, listener: Function) => void;
}
```

### 4. Configuration Validation

Plugin configuration is validated via JSON Schema:

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
```

### 5. Health Check

Health checks support multiple levels:

```typescript
interface ExtensionHealthCheck {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Check levels
enum HealthCheckLevel {
  BASIC = 'basic',     // Basic check: process alive
  STANDARD = 'standard', // Standard check: dependencies
  DEEP = 'deep'        // Deep check: business logic
}
```

## Extension Points

### 1. User Center Extension Points

| Extension Point | Interface | Description |
|-----------------|-----------|-------------|
| User Auth | `login()`, `register()` | Multiple auth methods |
| User Query | `getUserById()`, `getUsers()` | Multiple query conditions |
| User Management | `updateUser()`, `deleteUser()` | User CRUD operations |
| Password Management | `changePassword()`, `resetPassword()` | Password security |
| Verification Code | `sendVerificationCode()` | SMS/Email codes |
| IM Integration | `syncUserToIM()` | Sync with IM system |

### 2. Storage Extension Points

| Extension Point | Interface | Description |
|-----------------|-----------|-------------|
| File Upload | `upload()` | Multiple storage backends |
| File Download | `download()` | CDN acceleration |
| File Delete | `delete()` | Clean storage |

### 3. Notification Extension Points

| Extension Point | Interface | Description |
|-----------------|-----------|-------------|
| Push Notification | `sendPush()` | Mobile push |
| Email Notification | `sendEmail()` | Email service |
| SMS Notification | `sendSms()` | SMS service |

## Performance Optimization

### 1. Lazy Loading

```typescript
// Load plugin on demand
const extension = await extensionRegistry.lazyLoad('plugin-id');
```

### 2. Plugin Caching

```typescript
// Plugin instance cache
private pluginCache = new Map<string, WeakRef<IExtension>>();
```

### 3. Batch Operation Optimization

```typescript
// Batch get users
const users = await userCenter.getUsers(['id1', 'id2', 'id3', ...]);
```

### 4. Connection Pool Reuse

```typescript
// HTTP connection pool
const httpAgent = new Agent({
  keepAlive: true,
  maxSockets: 10,
});
```

## Security Design

### 1. Configuration Encryption

Sensitive configurations (like API Keys) are encrypted automatically:

```typescript
interface ConfigFieldSchema {
  secret?: boolean;  // Mark as sensitive field
}
```

### 2. Permission Control

```typescript
interface ExtensionCapabilities {
  // Permission declarations
  permissions?: string[];
}
```

### 3. Audit Logging

```typescript
// All plugin operations are logged
context.logger.info('Plugin operation', {
  extensionId: extension.meta.id,
  operation: 'login',
  userId: user.id,
  timestamp: new Date(),
});
```

## Fault Recovery

### 1. Automatic Retry

```typescript
// Auto-retry on plugin load failure
await retry(() => extension.onLoad(context), {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
});
```

### 2. Circuit Breaker

```typescript
// Use circuit breaker for external service calls
const breaker = new CircuitBreaker(callExternalService, {
  timeout: 3000,
  errorThreshold: 50,
  resetTimeout: 30000,
});
```

### 3. Degradation Strategy

```typescript
// Use fallback when plugin unavailable
if (!extension.getOnlineStatus) {
  return defaultOfflineStatus();
}
```

## Monitoring Metrics

| Metric | Description |
|--------|-------------|
| `extension.load.count` | Plugin load count |
| `extension.activate.duration` | Plugin activation duration |
| `extension.health.check` | Health check result |
| `extension.request.total` | Total requests |
| `extension.request.error` | Request errors |
| `extension.request.latency` | Request latency |

## Best Practices

### 1. Plugin Development

- Follow single responsibility principle
- Implement complete lifecycle hooks
- Provide health check implementation
- Proper error handling and logging

### 2. Configuration Management

- Use environment variables
- Encrypt sensitive information
- Provide reasonable defaults
- Trigger callbacks on config changes

### 3. Performance Considerations

- Avoid blocking main thread
- Use async operations
- Use caching wisely
- Optimize batch operations
