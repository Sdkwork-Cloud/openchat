# 插件开发指南

## 概述

本指南将帮助你开发自定义的 OpenChat 扩展插件。通过实现插件接口，你可以扩展系统功能、对接已有系统或实现自定义业务逻辑。

## 插件基础

### 插件接口

所有插件都需要实现 `IExtension` 接口：

```typescript
interface IExtension {
  /** 插件元信息 */
  readonly meta: ExtensionMeta;
  
  /** 插件类型 */
  readonly type: ExtensionType;
  
  /** 插件能力声明 */
  readonly capabilities?: ExtensionCapabilities;
  
  /** 插件状态 */
  readonly status: ExtensionStatus;
  
  /** 获取配置 */
  getConfig(): ExtensionConfig;
  
  /** 更新配置 */
  updateConfig(config: Partial<ExtensionConfig>): Promise<void>;
  
  /** 生命周期钩子 */
  onLoad?(context: ExtensionContext): Promise<void>;
  onUnload?(context: ExtensionContext): Promise<void>;
  onActivate?(context: ExtensionContext): Promise<void>;
  onDeactivate?(context: ExtensionContext): Promise<void>;
  onConfigChange?(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void>;
  
  /** 健康检查 */
  healthCheck?(): Promise<ExtensionHealthCheck>;
}
```

### 插件元信息

```typescript
interface ExtensionMeta {
  /** 插件唯一标识 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 主页 */
  homepage?: string;
  /** 依赖的其他插件 */
  dependencies?: ExtensionDependency[];
  /** 能力声明（在 meta 中也可以定义） */
  capabilities?: ExtensionCapabilities;
}
```

### 插件类型

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

## 开发用户中心插件

### 完整示例

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
      // 检查外部服务连接
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

  // 实现必需方法
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
    // 实现注册逻辑
  }

  async logout(userId: string, deviceInfo?: DeviceInfo): Promise<void> {
    // 实现登出逻辑
  }

  async refreshToken(refreshToken: string): Promise<UserAuthResult> {
    // 实现刷新令牌逻辑
  }

  async validateToken(token: string): Promise<UserInfo | null> {
    // 实现令牌验证逻辑
  }

  async getUserById(userId: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    // 实现获取用户逻辑
  }

  async getUserByUsername(username: string, options?: UserQueryOptions): Promise<UserInfo | null> {
    // 实现根据用户名获取用户逻辑
  }

  async getUsers(userIds: string[], options?: UserQueryOptions): Promise<UserInfo[]> {
    // 实现批量获取用户逻辑
  }

  async updateUser(userId: string, data: UserUpdateData): Promise<UserInfo> {
    // 实现更新用户逻辑
  }

  async deleteUser(userId: string): Promise<void> {
    // 实现删除用户逻辑
  }

  async searchUsers(keyword: string, limit?: number): Promise<UserInfo[]> {
    // 实现搜索用户逻辑
  }

  async changePassword(request: PasswordChangeRequest): Promise<void> {
    // 实现修改密码逻辑
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    // 实现重置密码逻辑
  }

  async sendVerificationCode(request: VerificationCodeRequest): Promise<void> {
    // 实现发送验证码逻辑
  }

  async verifyCode(request: VerifyCodeRequest): Promise<boolean> {
    // 实现验证验证码逻辑
  }

  // 私有辅助方法
  private async callLoginAPI(request: LoginRequest) {
    // 调用外部 API
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
    // 检查服务健康状态
  }
}
```

### 注册插件

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

## 开发其他类型插件

### 存储插件示例

```typescript
@Injectable()
export class MyStorageExtension implements IStorageExtension {
  readonly meta: ExtensionMeta = {
    id: 'my-storage',
    name: 'My Storage Plugin',
    version: '1.0.0',
  };

  readonly type = ExtensionType.STORAGE;

  readonly capabilities: StorageCapabilities = {
    supportsUpload: true,
    supportsDownload: true,
    supportsDelete: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
  };

  async upload(file: Buffer, options: UploadOptions): Promise<StorageResult> {
    // 实现上传逻辑
  }

  async download(fileId: string): Promise<Buffer> {
    // 实现下载逻辑
  }

  async delete(fileId: string): Promise<void> {
    // 实现删除逻辑
  }

  async getUrl(fileId: string): Promise<string> {
    // 获取文件 URL
  }
}
```

### 通知插件示例

```typescript
@Injectable()
export class MyNotificationExtension implements INotificationExtension {
  readonly meta: ExtensionMeta = {
    id: 'my-notification',
    name: 'My Notification Plugin',
    version: '1.0.0',
  };

  readonly type = ExtensionType.NOTIFICATION;

  readonly capabilities: NotificationCapabilities = {
    supportsPush: true,
    supportsEmail: true,
    supportsSms: true,
  };

  async sendPush(userId: string, notification: PushNotification): Promise<void> {
    // 发送推送通知
  }

  async sendEmail(userId: string, email: EmailNotification): Promise<void> {
    // 发送邮件
  }

  async sendSms(userId: string, sms: SmsNotification): Promise<void> {
    // 发送短信
  }
}
```

## 配置 Schema

### 定义配置 Schema

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

### Schema 字段类型

```typescript
interface ConfigFieldSchema {
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  default?: any;
  /** 描述 */
  description?: string;
  /** 是否为敏感信息 */
  secret?: boolean;
  /** 字符串最小长度 */
  minLength?: number;
  /** 字符串最大长度 */
  maxLength?: number;
  /** 数字最小值 */
  minimum?: number;
  /** 数字最大值 */
  maximum?: number;
  /** 正则模式 */
  pattern?: string;
  /** 枚举值 */
  enum?: any[];
}
```

## 生命周期管理

### 状态流转

```
UNLOADED → LOADING → LOADED → ACTIVATING → ACTIVE
    ↑          ↓         ↓          ↓         ↓
    └────── ERROR ←──────┴──────────┴← DEACTIVATING ← INACTIVE
```

### 生命周期钩子

```typescript
class MyExtension implements IExtension {
  async onLoad(context: ExtensionContext): Promise<void> {
    // 1. 初始化资源
    // 2. 验证配置
    // 3. 建立外部连接
    this.logger.log('Extension loaded');
  }

  async onActivate(context: ExtensionContext): Promise<void> {
    // 1. 启动服务
    // 2. 注册事件监听
    // 3. 开始处理请求
    this.logger.log('Extension activated');
    
    context.on('user:login', this.handleUserLogin.bind(this));
  }

  async onDeactivate(context: ExtensionContext): Promise<void> {
    // 1. 停止接收新请求
    // 2. 处理未完成的请求
    // 3. 取消事件监听
    this.logger.log('Extension deactivated');
  }

  async onUnload(context: ExtensionContext): Promise<void> {
    // 1. 释放资源
    // 2. 关闭外部连接
    // 3. 清理缓存
    this.logger.log('Extension unloaded');
  }

  async onConfigChange(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void> {
    // 处理配置变更
    if (oldConfig.settings.apiUrl !== newConfig.settings.apiUrl) {
      await this.reconnectToAPI(newConfig.settings.apiUrl);
    }
  }
}
```

## 健康检查

### 实现健康检查

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

## 测试插件

### 单元测试

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

## 最佳实践

### 1. 错误处理

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
      error: '登录服务暂时不可用，请稍后重试',
      errorCode: UserCenterErrorCode.SERVICE_UNAVAILABLE,
    };
  }
}
```

### 2. 日志记录

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

### 3. 依赖注入

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

### 4. 配置验证

```typescript
async onLoad(context: ExtensionContext): Promise<void> {
  const config = this.getConfig();
  
  if (!config.settings.apiUrl) {
    throw new Error('apiUrl is required');
  }

  if (!config.settings.apiKey) {
    throw new Error('apiKey is required');
  }

  // 验证 URL 格式
  try {
    new URL(config.settings.apiUrl);
  } catch {
    throw new Error('apiUrl must be a valid URL');
  }
}
```
