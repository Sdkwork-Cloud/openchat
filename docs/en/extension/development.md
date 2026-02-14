# Plugin Development Guide

## Overview

This guide will help you develop custom OpenChat extension plugins. By implementing plugin interfaces, you can extend system functionality, integrate with existing systems, or implement custom business logic.

## Plugin Basics

### Plugin Interface

All plugins need to implement the `IExtension` interface:

```typescript
interface IExtension {
  /** Plugin metadata */
  readonly meta: ExtensionMeta;
  
  /** Plugin type */
  readonly type: ExtensionType;
  
  /** Plugin capabilities */
  readonly capabilities?: ExtensionCapabilities;
  
  /** Plugin status */
  readonly status: ExtensionStatus;
  
  /** Get config */
  getConfig(): ExtensionConfig;
  
  /** Update config */
  updateConfig(config: Partial<ExtensionConfig>): Promise<void>;
  
  /** Lifecycle hooks */
  onLoad?(context: ExtensionContext): Promise<void>;
  onUnload?(context: ExtensionContext): Promise<void>;
  onActivate?(context: ExtensionContext): Promise<void>;
  onDeactivate?(context: ExtensionContext): Promise<void>;
  onConfigChange?(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void>;
  
  /** Health check */
  healthCheck?(): Promise<ExtensionHealthCheck>;
}
```

### Plugin Metadata

```typescript
interface ExtensionMeta {
  /** Plugin unique identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Author */
  author?: string;
  /** Homepage */
  homepage?: string;
  /** Dependencies */
  dependencies?: ExtensionDependency[];
  /** Capabilities (can also be defined in meta) */
  capabilities?: ExtensionCapabilities;
}
```

### Plugin Types

```typescript
enum ExtensionType {
  USER_CENTER = 'user-center',
  AUTH_STRATEGY = 'auth-strategy',
  STORAGE = 'storage',
  NOTIFICATION = 'notification',
  AI_MODEL = 'ai-model',
  IM_CHANNEL = 'im-channel',
  CUSTOM = 'custom',
}
```

## Developing User Center Plugin

### Complete Example

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  IUserCenterExtension,
  UserInfo,
  UserAuthResult,
  LoginRequest,
  RegisterRequest,
  UserQueryOptions,
  UserUpdateData,
  PasswordChangeRequest,
  PasswordResetRequest,
  VerificationCodeRequest,
  VerifyCodeRequest,
  UserCenterCapabilities,
  UserCenterEvent,
  UserCenterError,
  UserCenterErrorCode,
  UserOnlineStatus,
} from '@/extensions';
import {
  ExtensionType,
  ExtensionMeta,
  ExtensionStatus,
  ExtensionConfig,
  ExtensionContext,
} from '@/extensions';

@Injectable()
export class MyUserCenterExtension implements IUserCenterExtension {
  private readonly logger = new Logger(MyUserCenterExtension.name);
  private _status: ExtensionStatus = ExtensionStatus.UNLOADED;
  private _config: ExtensionConfig = { enabled: true };
  protected context: ExtensionContext | null = null;

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
          secret: true,
        },
        timeout: {
          type: 'number',
          required: false,
          default: 30000,
          minimum: 1000,
          maximum: 60000,
          description: 'Request timeout in milliseconds',
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
    supportsOnlineStatus: true,
    maxBatchSize: 100,
  };

  get status(): ExtensionStatus {
    return this._status;
  }

  getConfig(): ExtensionConfig {
    return this._config;
  }

  async updateConfig(config: Partial<ExtensionConfig>): Promise<void> {
    const oldConfig = { ...this._config };
    this._config = { ...this._config, ...config };
    if (this.onConfigChange) {
      await this.onConfigChange(oldConfig, this._config);
    }
  }

  async onLoad(context: ExtensionContext): Promise<void> {
    this.context = context;
    this._status = ExtensionStatus.LOADED;
    this.logger.log('Extension loaded');
  }

  async onActivate(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.ACTIVE;
    this.logger.log('Extension activated');
  }

  async onDeactivate(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.INACTIVE;
    this.logger.log('Extension deactivated');
  }

  async onUnload(context: ExtensionContext): Promise<void> {
    this._status = ExtensionStatus.UNLOADED;
    this.logger.log('Extension unloaded');
  }

  async healthCheck() {
    try {
      await this.pingExternalService();
      
      return {
        healthy: true,
        message: 'All services operational',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        message: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }

  // Implement required methods
  async login(request: LoginRequest): Promise<UserAuthResult> {
    try {
      const response = await this.callLoginAPI(request);
      
      this.context?.emit(UserCenterEvent.USER_LOGIN, {
        userId: response.user.id,
        ip: request.ip,
        deviceInfo: request.deviceInfo,
      });

      return {
        success: true,
        user: this.mapUserInfo(response.user),
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        errorCode: UserCenterErrorCode.INVALID_PASSWORD,
      };
    }
  }

  async register(request: RegisterRequest): Promise<UserAuthResult> {
    // Implement registration logic
  }

  async logout(userId: string, deviceInfo?: DeviceInfo): Promise<void> {
    // Implement logout logic
  }

  async refreshToken(refreshToken: string): Promise<UserAuthResult> {
    // Implement token refresh logic
  }

  async validateToken(token: string): Promise<UserInfo | null> {
    // Implement token validation logic
  }

  async getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    // Implement get user logic
  }

  async getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    // Implement get user by username logic
  }

  async getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]> {
    // Implement batch get users logic
  }

  async updateUser(userId: string, data: UserUpdateData): Promise<UserInfo> {
    // Implement update user logic
  }

  async deleteUser(userId: string): Promise<void> {
    // Implement delete user logic
  }

  async searchUsers(keyword: string, limit?: number): Promise<UserInfo[]> {
    // Implement search users logic
  }

  async changePassword(request: PasswordChangeRequest): Promise<void> {
    // Implement change password logic
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    // Implement reset password logic
  }

  async sendVerificationCode(request: VerificationCodeRequest): Promise<void> {
    // Implement send verification code logic
  }

  async verifyCode(request: VerifyCodeRequest): Promise<boolean> {
    // Implement verify code logic
  }

  // Private helper methods
  private async callLoginAPI(request: LoginRequest) {
    // Call external API
  }

  private mapUserInfo(data: any): UserInfo {
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      // ...
    };
  }

  private async pingExternalService() {
    // Check service health
  }
}
```

### Register Plugin

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

## Configuration Schema

### Define Configuration Schema

```typescript
const configSchema: Record<string, ConfigFieldSchema> = {
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
  debug: {
    type: 'boolean',
    required: false,
    default: false,
    description: 'Enable debug mode',
  },
  scopes: {
    type: 'array',
    required: false,
    default: ['read', 'write'],
    description: 'API scopes',
  },
};
```

### Schema Field Types

```typescript
interface ConfigFieldSchema {
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Required */
  required?: boolean;
  /** Default value */
  default?: any;
  /** Description */
  description?: string;
  /** Is secret */
  secret?: boolean;
  /** String min length */
  minLength?: number;
  /** String max length */
  maxLength?: number;
  /** Number minimum */
  minimum?: number;
  /** Number maximum */
  maximum?: number;
  /** Regex pattern */
  pattern?: string;
  /** Enum values */
  enum?: any[];
}
```

## Lifecycle Management

### State Transitions

```
UNLOADED → LOADING → LOADED → ACTIVATING → ACTIVE
    ↑          ↓         ↓          ↓         ↓
    └────── ERROR ←──────┴──────────┴← DEACTIVATING ← INACTIVE
```

### Lifecycle Hooks

```typescript
class MyExtension implements IExtension {
  async onLoad(context: ExtensionContext): Promise<void> {
    // 1. Initialize resources
    // 2. Validate configuration
    // 3. Establish external connections
    this.logger.log('Extension loaded');
  }

  async onActivate(context: ExtensionContext): Promise<void> {
    // 1. Start services
    // 2. Register event listeners
    // 3. Start processing requests
    this.logger.log('Extension activated');
    
    context.on('user:login', this.handleUserLogin.bind(this));
  }

  async onDeactivate(context: ExtensionContext): Promise<void> {
    // 1. Stop accepting new requests
    // 2. Process pending requests
    // 3. Unregister event listeners
    this.logger.log('Extension deactivated');
  }

  async onUnload(context: ExtensionContext): Promise<void> {
    // 1. Release resources
    // 2. Close external connections
    // 3. Clear cache
    this.logger.log('Extension unloaded');
  }

  async onConfigChange(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void> {
    // Handle configuration changes
    if (oldConfig.settings.apiUrl !== newConfig.settings.apiUrl) {
      await this.reconnectToAPI(newConfig.settings.apiUrl);
    }
  }
}
```

## Health Check

### Implement Health Check

```typescript
async healthCheck(): Promise<ExtensionHealthCheck> {
  const checks = await Promise.all([
    this.checkDatabaseConnection(),
    this.checkCacheConnection(),
    this.checkExternalAPI(),
  ]);

  const allHealthy = checks.every(c => c.healthy);

  return {
    healthy: allHealthy,
    message: allHealthy ? 'All checks passed' : 'Some checks failed',
    details: {
      database: checks[0],
      cache: checks[1],
      api: checks[2],
    },
    timestamp: new Date(),
  };
}
```

## Testing Plugins

### Unit Tests

```typescript
describe('MyUserCenterExtension', () => {
  let extension: MyUserCenterExtension;

  beforeEach(() => {
    extension = new MyUserCenterExtension();
  });

  it('should have correct metadata', () => {
    expect(extension.meta.id).toBe('my-custom-user-center');
    expect(extension.type).toBe(ExtensionType.USER_CENTER);
  });

  it('should login successfully', async () => {
    const result = await extension.login({
      username: 'testuser',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.accessToken).toBeDefined();
  });

  it('should return error for invalid credentials', async () => {
    const result = await extension.login({
      username: 'testuser',
      password: 'wrongpassword',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(UserCenterErrorCode.INVALID_PASSWORD);
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
async login(request: LoginRequest): Promise<UserAuthResult> {
  try {
    const response = await this.callLoginAPI(request);
    return {
      success: true,
      user: response.user,
      accessToken: response.token,
    };
  } catch (error) {
    this.logger.error('Login failed:', error);
    return {
      success: false,
      error: 'Login service temporarily unavailable',
      errorCode: UserCenterErrorCode.SERVICE_UNAVAILABLE,
    };
  }
}
```

### 2. Logging

```typescript
async onActivate(context: ExtensionContext): Promise<void> {
  context.logger.info('Extension activating...', {
    extensionId: this.meta.id,
    version: this.meta.version,
  });

  try {
    await this.initializeServices();
    context.logger.info('Extension activated successfully');
  } catch (error) {
    context.logger.error('Failed to activate extension', { error });
    throw error;
  }
}
```

### 3. Dependency Injection

```typescript
@Injectable()
export class MyUserCenterExtension implements IUserCenterExtension {
  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  // ...
}
```

### 4. Configuration Validation

```typescript
async onLoad(context: ExtensionContext): Promise<void> {
  const config = this.getConfig();
  
  if (!config.settings.apiUrl) {
    throw new Error('apiUrl is required');
  }

  if (!config.settings.apiKey) {
    throw new Error('apiKey is required');
  }

  // Validate URL format
  try {
    new URL(config.settings.apiUrl);
  } catch {
    throw new Error('apiUrl must be a valid URL');
  }
}
```
