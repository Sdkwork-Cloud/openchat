# 依赖注入系统文档

## 概述

OpenChat 应用实现了一个完整的依赖注入系统，用于管理服务的生命周期和依赖关系。这个系统借鉴了 Angular 和 NestJS 等框架的依赖注入理念，但采用了更轻量级的实现方式。

## 核心概念

### 1. 容器 (Container)

容器是依赖注入系统的核心，负责注册和解析服务实例。

**文件路径**: `src/di/container.ts`

### 2. 模块 (Module)

模块用于组织和注册相关的服务，提供了一种结构化的方式来管理服务的注册。

**文件路径**: `src/di/types.ts`

### 3. 服务 (Service)

服务是应用中的可重用组件，通过依赖注入系统进行管理。服务通常实现了特定的接口，并通过容器进行注册和解析。

## 快速开始

### 1. 注册服务

服务可以通过容器的 `register` 或 `registerSingleton` 方法进行注册。

```typescript
import { container } from './di';

// 注册单例服务
container.registerSingleton('userService', () => new UserService());

// 注册瞬态服务（每次解析都会创建新实例）
container.register('logger', () => new Logger());
```

### 2. 解析服务

服务可以通过容器的 `resolve` 方法进行解析。

```typescript
import { container } from './di';

// 解析服务
const userService = container.resolve('userService');
const logger = container.resolve('logger');

// 使用服务
const users = await userService.getUsers();
logger.log('Users fetched:', users);
```

### 3. 使用模块

模块提供了一种结构化的方式来注册多个相关的服务。

```typescript
import { container, CoreModule } from './di';

// 注册模块
const coreModule = new CoreModule();
container.registerModule(coreModule);

// 解析模块中注册的服务
const websocketClient = container.resolve('websocketClient');
const errorService = container.resolve('errorService');
```

## 核心 API

### 容器 API

#### 1. `register<T>(key: string, factory: () => T): void`

注册一个瞬态服务，每次解析都会创建新实例。

**参数**:
- `key`: 服务的唯一标识符
- `factory`: 创建服务实例的工厂函数

**使用示例**:

```typescript
container.register('logger', () => new Logger());
```

#### 2. `registerSingleton<T>(key: string, factory: () => T): void`

注册一个单例服务，第一次解析时创建实例，后续解析返回相同的实例。

**参数**:
- `key`: 服务的唯一标识符
- `factory`: 创建服务实例的工厂函数

**使用示例**:

```typescript
container.registerSingleton('userService', () => new UserService());
```

#### 3. `resolve<T>(key: string): T`

解析服务实例。

**参数**:
- `key`: 服务的唯一标识符

**返回值**:
- 服务实例

**使用示例**:

```typescript
const userService = container.resolve('userService');
```

#### 4. `registerModule(module: Module): void`

注册模块，模块会在容器中注册其包含的所有服务。

**参数**:
- `module`: 要注册的模块实例

**使用示例**:

```typescript
const coreModule = new CoreModule();
container.registerModule(coreModule);
```

#### 5. `getRegisteredKeys(): string[]`

获取所有已注册服务的键。

**返回值**:
- 已注册服务的键数组

**使用示例**:

```typescript
const registeredKeys = container.getRegisteredKeys();
console.log('Registered services:', registeredKeys);
```

### 模块 API

模块需要实现 `Module` 接口，该接口定义了一个 `configure` 方法，用于配置模块中的服务注册。

**接口定义**:

```typescript
export interface Module {
  configure(container: Container): void;
}
```

**使用示例**:

```typescript
import { Module } from './di/types';
import { UserService } from './services/user.service';
import { Logger } from './services/logger.service';

export class UserModule implements Module {
  configure(container: any): void {
    container.registerSingleton('userService', () => new UserService());
    container.register('logger', () => new Logger());
  }
}
```

## 核心模块

OpenChat 应用定义了一个核心模块 `CoreModule`，用于注册所有核心服务。

**文件路径**: `src/di/modules/core.module.ts`

**注册的服务**:

| 服务名称 | 类型 | 描述 |
|---------|------|------|
| errorService | 单例 | 错误处理服务 |
| securityService | 单例 | 安全服务 |
| fileService | 单例 | 文件服务 |
| memoryService | 单例 | 内存服务 |
| pluginManager | 单例 | 插件管理器 |
| websocketClient | 单例 | WebSocket 客户端 |
| cacheService | 单例 | 缓存服务 |
| algorithmService | 单例 | 算法服务 |
| performanceService | 单例 | 性能服务 |
| featureService | 单例 | 功能开关服务 |
| toolchainService | 单例 | 工具链服务 |

## 最佳实践

### 1. 使用接口

为服务定义接口，这样可以更容易地进行测试和替换实现。

```typescript
// 定义接口
export interface UserService {
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User>;
  createUser(user: User): Promise<User>;
}

// 实现接口
export class UserServiceImpl implements UserService {
  async getUsers(): Promise<User[]> {
    // 实现逻辑
  }

  async getUser(id: string): Promise<User> {
    // 实现逻辑
  }

  async createUser(user: User): Promise<User> {
    // 实现逻辑
  }
}

// 注册服务
container.registerSingleton('userService', () => new UserServiceImpl());
```

### 2. 使用模块组织服务

使用模块来组织相关的服务，这样可以更好地管理服务的注册和依赖关系。

```typescript
export class AuthModule implements Module {
  configure(container: any): void {
    container.registerSingleton('authService', () => new AuthServiceImpl());
    container.registerSingleton('tokenService', () => new TokenServiceImpl());
    container.registerSingleton('userService', () => new UserServiceImpl());
  }
}
```

### 3. 依赖解析

服务可以通过构造函数注入其他服务，容器会自动解析这些依赖。

```typescript
import { container } from './di';

export class UserService {
  private logger: Logger;

  constructor() {
    // 解析依赖
    this.logger = container.resolve('logger');
  }

  async getUsers(): Promise<User[]> {
    this.logger.log('Getting users...');
    // 实现逻辑
  }
}

// 注册服务
container.registerSingleton('logger', () => new Logger());
container.registerSingleton('userService', () => new UserService());
```

### 4. 测试

依赖注入系统使得测试变得更加容易，因为可以轻松地替换服务的实现。

```typescript
import { container } from './di';
import { UserService } from './services/user.service';

// 测试时注册模拟服务
container.registerSingleton('userService', () => ({
  getUsers: async () => [
    { id: '1', name: 'Test User' }
  ],
  getUser: async (id: string) => ({ id, name: 'Test User' }),
  createUser: async (user: User) => ({ ...user, id: '1' })
} as UserService));

// 测试代码
const userService = container.resolve('userService');
const users = await userService.getUsers();
expect(users).toHaveLength(1);
expect(users[0].name).toBe('Test User');
```

## 高级特性

### 1. 服务类型注册

除了使用字符串键注册服务外，还可以使用类型作为键，这样可以获得更好的类型安全性。

```typescript
import { container } from './di';
import { UserService } from './services/user.service';

// 注册服务
container.registerSingleton('UserService', () => new UserServiceImpl());

// 解析服务
const userService = container.resolve<UserService>('UserService');
```

### 2. 模块嵌套

模块可以嵌套，一个模块可以注册另一个模块。

```typescript
export class AppModule implements Module {
  configure(container: any): void {
    // 注册其他模块
    const coreModule = new CoreModule();
    container.registerModule(coreModule);

    const authModule = new AuthModule();
    container.registerModule(authModule);

    // 注册应用特定的服务
    container.registerSingleton('appService', () => new AppService());
  }
}
```

### 3. 配置管理

依赖注入系统可以用于管理应用配置。

```typescript
import { container } from './di';

// 注册配置
container.registerSingleton('config', () => ({
  apiUrl: 'https://api.example.com',
  timeout: 10000,
  retries: 3
}));

// 在服务中使用配置
export class ApiService {
  private config: any;

  constructor() {
    this.config = container.resolve('config');
  }

  async fetchData(endpoint: string) {
    const url = `${this.config.apiUrl}/${endpoint}`;
    // 实现逻辑
  }
}
```

## 故障排除

### 1. 服务未找到

如果尝试解析未注册的服务，会抛出错误。确保服务已经正确注册。

```typescript
// 错误：服务未注册
const service = container.resolve('nonExistentService'); // 抛出错误

// 解决方法：注册服务
container.registerSingleton('nonExistentService', () => new NonExistentService());
const service = container.resolve('nonExistentService'); // 现在可以正常解析
```

### 2. 循环依赖

如果服务之间存在循环依赖，可能会导致问题。尽量避免循环依赖，或者使用延迟解析来解决。

```typescript
// 避免循环依赖
// 不好的做法：UserService 依赖 AuthService，AuthService 依赖 UserService

// 好的做法：提取共享逻辑到单独的服务
class UserService {
  constructor(private tokenService: TokenService) {}
}

class AuthService {
  constructor(private tokenService: TokenService) {}
}

class TokenService {}
```

### 3. 服务初始化顺序

确保服务的依赖在服务初始化之前已经注册。

```typescript
// 错误：依赖服务未注册
container.registerSingleton('userService', () => new UserService()); // UserService 依赖 logger
container.registerSingleton('logger', () => new Logger());

// 正确：先注册依赖服务
container.registerSingleton('logger', () => new Logger());
container.registerSingleton('userService', () => new UserService()); // 现在 logger 已经注册
```

## 总结

依赖注入系统是 OpenChat 应用的重要组成部分，它提供了一种结构化的方式来管理服务的生命周期和依赖关系。通过使用依赖注入系统，开发人员可以：

- 更容易地管理服务的依赖关系
- 更容易地进行测试和模拟
- 更容易地替换服务的实现
- 更好地组织应用的代码结构

依赖注入系统的设计灵感来自于 Angular 和 NestJS 等现代框架，但采用了更轻量级的实现方式，适合 React 应用的需求。
