# 用户中心插件

## 概述

用户中心插件是 OpenChat 扩展体系中最核心的插件类型，负责用户认证、用户管理、在线状态等核心功能。通过用户中心插件，可以轻松对接已有的用户系统或实现自定义的用户管理逻辑。

## 内置插件

### DefaultUserCenterExtension（默认用户中心）

基于本地数据库的用户中心实现，提供完整的用户管理功能。

**主要特性：**
- 用户名/邮箱/手机号登录
- JWT Token 认证
- 用户注册和管理
- 验证码发送和验证
- 与悟空 IM 自动同步

**配置选项：**

```typescript
interface DefaultUserCenterConfig {
  /** JWT 密钥 */
  jwtSecret: string;
  /** Access Token 过期时间（秒） */
  accessTokenExpiresIn: number;
  /** Refresh Token 过期时间（秒） */
  refreshTokenExpiresIn: number;
  /** 密码最小长度 */
  minPasswordLength: number;
  /** 验证码过期时间（秒） */
  verificationCodeExpiresIn: number;
  /** IM WebSocket 地址 */
  imWsUrl: string;
}
```

### RemoteUserCenterExtension（远程用户中心）

对接已有的远程用户中心系统，通过 HTTP API 进行通信。

**主要特性：**
- 支持 RESTful API 对接
- 支持多种认证方式（Bearer Token、API Key）
- 支持本地 Token 签发
- 可配置 API 端点映射

**配置选项：**

```typescript
interface RemoteUserCenterConfig {
  /** 远程服务基础URL */
  baseUrl: string;
  /** API 路径前缀 */
  apiPrefix?: string;
  /** 认证方式 */
  authMethod?: 'bearer' | 'basic' | 'api-key' | 'custom';
  /** API Key (用于 api-key 认证) */
  apiKey?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 请求超时时间 (毫秒) */
  timeout?: number;
  /** 是否启用本地 Token 签发 */
  localTokenSigning?: boolean;
  /** 本地 JWT 密钥 (localTokenSigning=true 时使用) */
  localJwtSecret?: string;
  /** Access Token 过期时间 (秒) */
  accessTokenExpiresIn?: number;
  /** Refresh Token 过期时间 (秒) */
  refreshTokenExpiresIn?: number;
  /** IM WebSocket 地址 */
  imWsUrl?: string;
  /** API 端点映射 */
  endpoints?: {
    login?: string;
    register?: string;
    logout?: string;
    validateToken?: string;
    getUser?: string;
    getUsers?: string;
    updateUser?: string;
    deleteUser?: string;
    searchUsers?: string;
    changePassword?: string;
    resetPassword?: string;
    sendCode?: string;
    verifyCode?: string;
  };
}
```

## 接口定义

### UserInfo（用户信息）

```typescript
interface UserInfo {
  /** 用户唯一标识 */
  id: string;
  /** 用户UUID */
  uuid?: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 昵称 */
  nickname?: string;
  /** 头像 */
  avatar?: string | AvatarMediaResource;
  /** 用户状态 */
  status?: UserOnlineStatus;
  /** 扩展属性 */
  extra?: Record<string, any>;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}
```

### UserAuthResult（认证结果）

```typescript
interface UserAuthResult {
  /** 是否成功 */
  success: boolean;
  /** 用户信息 */
  user?: UserInfo;
  /** 访问令牌 */
  accessToken?: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 令牌过期时间（秒） */
  expiresIn?: number;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: UserCenterErrorCode;
}
```

### LoginRequest（登录请求）

```typescript
interface LoginRequest {
  /** 用户名/邮箱/手机号 */
  username: string;
  /** 密码 */
  password: string;
  /** 登录设备信息 */
  deviceInfo?: DeviceInfo;
  /** 登录IP */
  ip?: string;
}
```

### DeviceInfo（设备信息）

```typescript
interface DeviceInfo {
  /** 设备ID */
  deviceId?: string;
  /** 设备名称 */
  deviceName?: string;
  /** 设备类型 */
  deviceType?: 'web' | 'desktop' | 'mobile' | 'tablet';
  /** 操作系统 */
  os?: string;
  /** 浏览器 */
  browser?: string;
  /** 用户代理 */
  userAgent?: string;
}
```

## 使用方式

### 通过 UserCenterProxy 使用

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
        refreshToken: result.refreshToken,
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

### 获取用户中心状态

```typescript
// 获取状态
const status = this.userCenter.getStatus();
console.log(status);
// {
//   available: true,
//   extensionId: 'openchat-user-center-default',
//   extensionName: 'Default User Center',
//   extensionVersion: '1.0.0',
//   extensionStatus: 'active',
//   capabilities: { ... }
// }

// 检查可用性
if (this.userCenter.isAvailable()) {
  // 用户中心可用
}

// 健康检查
const health = await this.userCenter.healthCheck();
console.log(health);
// {
//   healthy: true,
//   message: 'User center extension is active',
//   details: { extensionId: '...', extensionName: '...' }
// }
```

## 错误处理

### 错误代码

```typescript
enum UserCenterErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',           // 用户不存在
  INVALID_PASSWORD = 'INVALID_PASSWORD',       // 密码错误
  USERNAME_EXISTS = 'USERNAME_EXISTS',         // 用户名已存在
  EMAIL_EXISTS = 'EMAIL_EXISTS',               // 邮箱已存在
  PHONE_EXISTS = 'PHONE_EXISTS',               // 手机号已存在
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE', // 验证码错误
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED', // 验证码过期
  INVALID_TOKEN = 'INVALID_TOKEN',             // Token无效
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',             // Token过期
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN', // 刷新Token无效
  USER_DISABLED = 'USER_DISABLED',             // 用户已禁用
  WEAK_PASSWORD = 'WEAK_PASSWORD',             // 密码强度不足
  INCORRECT_OLD_PASSWORD = 'INCORRECT_OLD_PASSWORD', // 旧密码错误
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 服务不可用
  NOT_SUPPORTED = 'NOT_SUPPORTED',             // 操作不支持
  INVALID_PARAMETER = 'INVALID_PARAMETER',     // 参数错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',     // 权限不足
  RATE_LIMITED = 'RATE_LIMITED',               // 请求过于频繁
}
```

### 使用异常类

```typescript
import { UserCenterError, UserCenterErrorCode } from './extensions';

try {
  await this.userCenter.login(request);
} catch (error) {
  if (error instanceof UserCenterError) {
    console.log('错误代码:', error.code);
    console.log('错误信息:', error.message);
    console.log('错误详情:', error.details);
  }
}

// 创建异常
throw UserCenterError.fromCode(
  UserCenterErrorCode.USER_NOT_FOUND,
  { userId: '123' }
);
```

## 事件系统

### 用户中心事件

| 事件 | 说明 | 载荷 |
|------|------|------|
| `user-center:user-login` | 用户登录 | `{ userId, ip, deviceInfo }` |
| `user-center:user-logout` | 用户登出 | `{ userId, deviceInfo }` |
| `user-center:user-register` | 用户注册 | `{ userId, username, email }` |
| `user-center:user-update` | 用户信息更新 | `{ userId, data }` |
| `user-center:user-delete` | 用户删除 | `{ userId }` |
| `user-center:password-change` | 密码修改 | `{ userId }` |
| `user-center:password-reset` | 密码重置 | `{ userId }` |

### 监听事件

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { UserCenterEvent } from './extensions';

@Injectable()
export class AuditService {
  @OnEvent(UserCenterEvent.USER_LOGIN)
  async handleUserLogin(payload: { userId: string; ip?: string }) {
    await this.logAudit({
      action: 'login',
      userId: payload.userId,
      ip: payload.ip,
      timestamp: new Date(),
    });
  }

  @OnEvent(UserCenterEvent.USER_REGISTER)
  async handleUserRegister(payload: { userId: string; username: string }) {
    // 发送欢迎邮件
    await this.sendWelcomeEmail(payload.userId);
  }
}
```

## 能力声明

用户中心插件通过 `capabilities` 声明其支持的功能：

```typescript
interface UserCenterCapabilities {
  /** 支持的登录方式 */
  supportedLoginMethods?: ('password' | 'sms' | 'email' | 'oauth' | 'ldap')[];
  /** 是否支持注册 */
  supportsRegistration?: boolean;
  /** 是否支持密码重置 */
  supportsPasswordReset?: boolean;
  /** 是否支持多因素认证 */
  supportsMFA?: boolean;
  /** 是否支持用户搜索 */
  supportsUserSearch?: boolean;
  /** 是否支持批量操作 */
  supportsBatchOperations?: boolean;
  /** 是否支持用户在线状态 */
  supportsOnlineStatus?: boolean;
  /** 是否支持用户同步 */
  supportsUserSync?: boolean;
  /** 最大批量查询数量 */
  maxBatchSize?: number;
}
```

### 检查能力

```typescript
const capabilities = this.userCenter.getCapabilities();

if (capabilities.supportsMFA) {
  // 启用多因素认证选项
}

if (capabilities.supportedLoginMethods?.includes('oauth')) {
  // 显示 OAuth 登录按钮
}
```

## IM 集成

用户中心插件与悟空 IM 系统紧密集成：

### 同步用户到 IM

```typescript
// 获取 IM Token
const imToken = await this.userCenter.syncUserToIM(userId);
```

### 准备 IM 连接

```typescript
// 获取 IM 连接配置
const imConfig = await this.userCenter.prepareIMConnection(userId);
// {
//   wsUrl: 'wss://im.example.com',
//   apiUrl: 'https://im.example.com/api',
//   uid: 'user-123',
//   token: 'im-token-xxx',
//   deviceId: 'device-xxx'
// }
```

## 最佳实践

### 1. 缓存策略

```typescript
// 使用缓存优先策略获取用户
const user = await this.userCenter.getUserById(userId, {
  cacheStrategy: 'cache-first',
});
```

### 2. 批量查询优化

```typescript
// 批量获取用户，减少请求次数
const users = await this.userCenter.getUsers(['id1', 'id2', 'id3']);
```

### 3. 设备信息追踪

```typescript
// 登录时记录设备信息
await this.userCenter.login({
  username: 'user',
  password: 'pass',
  deviceInfo: {
    deviceId: 'device-123',
    deviceName: 'Chrome on Windows',
    deviceType: 'web',
    os: 'Windows 11',
    browser: 'Chrome 120',
  },
  ip: '192.168.1.1',
});
```
