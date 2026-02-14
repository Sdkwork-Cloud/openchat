# User Center Plugin

## Overview

The User Center Plugin is the most core plugin type in the OpenChat extension system, responsible for user authentication, user management, online status, and other core functions. Through the user center plugin, you can easily integrate with existing user systems or implement custom user management logic.

## Built-in Plugins

### DefaultUserCenterExtension

User center implementation based on local database, providing complete user management functionality.

**Main Features:**
- Username/email/phone login
- JWT Token authentication
- User registration and management
- Verification code sending and validation
- Automatic sync with WuKong IM

**Configuration Options:**

```typescript
interface DefaultUserCenterConfig {
  /** JWT secret */
  jwtSecret: string;
  /** Access token expiration time (seconds) */
  accessTokenExpiresIn: number;
  /** Refresh token expiration time (seconds) */
  refreshTokenExpiresIn: number;
  /** Minimum password length */
  minPasswordLength: number;
  /** Verification code expiration time (seconds) */
  verificationCodeExpiresIn: number;
  /** IM WebSocket URL */
  imWsUrl: string;
}
```

### RemoteUserCenterExtension

Integrates with existing remote user center systems via HTTP API.

**Main Features:**
- RESTful API integration
- Multiple authentication methods (Bearer Token, API Key)
- Local token signing support
- Configurable API endpoint mapping

**Configuration Options:**

```typescript
interface RemoteUserCenterConfig {
  /** Remote service base URL */
  baseUrl: string;
  /** API path prefix */
  apiPrefix?: string;
  /** Authentication method */
  authMethod?: 'bearer' | 'basic' | 'api-key' | 'custom';
  /** API Key (for api-key authentication) */
  apiKey?: string;
  /** Custom request headers */
  headers?: Record<string, string>;
  /** Request timeout (milliseconds) */
  timeout?: number;
  /** Enable local token signing */
  localTokenSigning?: boolean;
  /** Local JWT secret (used when localTokenSigning=true) */
  localJwtSecret?: string;
  /** Access token expiration time (seconds) */
  accessTokenExpiresIn?: number;
  /** Refresh token expiration time (seconds) */
  refreshTokenExpiresIn?: number;
  /** IM WebSocket URL */
  imWsUrl?: string;
  /** API endpoint mapping */
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

## Interface Definitions

### UserInfo

```typescript
interface UserInfo {
  /** User unique identifier */
  id: string;
  /** User UUID */
  uuid?: string;
  /** Username */
  username: string;
  /** Email */
  email?: string;
  /** Phone */
  phone?: string;
  /** Nickname */
  nickname?: string;
  /** Avatar */
  avatar?: string | AvatarMediaResource;
  /** User status */
  status?: UserOnlineStatus;
  /** Extended properties */
  extra?: Record<string, any>;
  /** Created at */
  createdAt?: Date;
  /** Updated at */
  updatedAt?: Date;
}
```

### UserAuthResult

```typescript
interface UserAuthResult {
  /** Success or not */
  success: boolean;
  /** User info */
  user?: UserInfo;
  /** Access token */
  accessToken?: string;
  /** Refresh token */
  refreshToken?: string;
  /** Token expiration time (seconds) */
  expiresIn?: number;
  /** Error message */
  error?: string;
  /** Error code */
  errorCode?: UserCenterErrorCode;
}
```

### LoginRequest

```typescript
interface LoginRequest {
  /** Username/email/phone */
  username: string;
  /** Password */
  password: string;
  /** Login device info */
  deviceInfo?: DeviceInfo;
  /** Login IP */
  ip?: string;
}
```

### DeviceInfo

```typescript
interface DeviceInfo {
  /** Device ID */
  deviceId?: string;
  /** Device name */
  deviceName?: string;
  /** Device type */
  deviceType?: 'web' | 'desktop' | 'mobile' | 'tablet';
  /** Operating system */
  os?: string;
  /** Browser */
  browser?: string;
  /** User agent */
  userAgent?: string;
}
```

## Usage

### Using UserCenterProxy

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

### Getting User Center Status

```typescript
// Get status
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

// Check availability
if (this.userCenter.isAvailable()) {
  // User center is available
}

// Health check
const health = await this.userCenter.healthCheck();
console.log(health);
// {
//   healthy: true,
//   message: 'User center extension is active',
//   details: { extensionId: '...', extensionName: '...' }
// }
```

## Error Handling

### Error Codes

```typescript
enum UserCenterErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',           // User not found
  INVALID_PASSWORD = 'INVALID_PASSWORD',       // Invalid password
  USERNAME_EXISTS = 'USERNAME_EXISTS',         // Username already exists
  EMAIL_EXISTS = 'EMAIL_EXISTS',               // Email already exists
  PHONE_EXISTS = 'PHONE_EXISTS',               // Phone already exists
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE', // Invalid verification code
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED', // Verification code expired
  INVALID_TOKEN = 'INVALID_TOKEN',             // Invalid token
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',             // Token expired
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN', // Invalid refresh token
  USER_DISABLED = 'USER_DISABLED',             // User disabled
  WEAK_PASSWORD = 'WEAK_PASSWORD',             // Weak password
  INCORRECT_OLD_PASSWORD = 'INCORRECT_OLD_PASSWORD', // Incorrect old password
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // Service unavailable
  NOT_SUPPORTED = 'NOT_SUPPORTED',             // Operation not supported
  INVALID_PARAMETER = 'INVALID_PARAMETER',     // Invalid parameter
  PERMISSION_DENIED = 'PERMISSION_DENIED',     // Permission denied
  RATE_LIMITED = 'RATE_LIMITED',               // Rate limited
}
```

### Using Exception Class

```typescript
import { UserCenterError, UserCenterErrorCode } from './extensions';

try {
  await this.userCenter.login(request);
} catch (error) {
  if (error instanceof UserCenterError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error details:', error.details);
  }
}

// Create exception
throw UserCenterError.fromCode(
  UserCenterErrorCode.USER_NOT_FOUND,
  { userId: '123' }
);
```

## Event System

### User Center Events

| Event | Description | Payload |
|-------|-------------|---------|
| `user-center:user-login` | User login | `{ userId, ip, deviceInfo }` |
| `user-center:user-logout` | User logout | `{ userId, deviceInfo }` |
| `user-center:user-register` | User registration | `{ userId, username, email }` |
| `user-center:user-update` | User info update | `{ userId, data }` |
| `user-center:user-delete` | User deletion | `{ userId }` |
| `user-center:password-change` | Password change | `{ userId }` |
| `user-center:password-reset` | Password reset | `{ userId }` |

### Listening to Events

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
    // Send welcome email
    await this.sendWelcomeEmail(payload.userId);
  }
}
```

## Capabilities

User center plugins declare their supported features through `capabilities`:

```typescript
interface UserCenterCapabilities {
  /** Supported login methods */
  supportedLoginMethods?: ('password' | 'sms' | 'email' | 'oauth' | 'ldap')[];
  /** Supports registration */
  supportsRegistration?: boolean;
  /** Supports password reset */
  supportsPasswordReset?: boolean;
  /** Supports MFA */
  supportsMFA?: boolean;
  /** Supports user search */
  supportsUserSearch?: boolean;
  /** Supports batch operations */
  supportsBatchOperations?: boolean;
  /** Supports online status */
  supportsOnlineStatus?: boolean;
  /** Supports user sync */
  supportsUserSync?: boolean;
  /** Max batch size */
  maxBatchSize?: number;
}
```

### Checking Capabilities

```typescript
const capabilities = this.userCenter.getCapabilities();

if (capabilities.supportsMFA) {
  // Enable MFA option
}

if (capabilities.supportedLoginMethods?.includes('oauth')) {
  // Show OAuth login button
}
```

## IM Integration

The user center plugin integrates closely with the WuKong IM system:

### Sync User to IM

```typescript
// Get IM Token
const imToken = await this.userCenter.syncUserToIM(userId);
```

### Prepare IM Connection

```typescript
// Get IM connection config
const imConfig = await this.userCenter.prepareIMConnection(userId);
// {
//   wsUrl: 'wss://im.example.com',
//   apiUrl: 'https://im.example.com/api',
//   uid: 'user-123',
//   token: 'im-token-xxx',
//   deviceId: 'device-xxx'
// }
```

## Best Practices

### 1. Caching Strategy

```typescript
// Get user with cache-first strategy
const user = await this.userCenter.getUserById(userId, {
  cacheStrategy: 'cache-first',
});
```

### 2. Batch Query Optimization

```typescript
// Batch get users to reduce requests
const users = await this.userCenter.getUsers(['id1', 'id2', 'id3']);
```

### 3. Device Info Tracking

```typescript
// Record device info on login
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
