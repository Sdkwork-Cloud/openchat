# 服务层文档

## 概述

服务层是 OpenChat 应用的核心部分，负责处理业务逻辑、外部通信和系统功能。所有服务都实现了相应的接口，并通过依赖注入系统进行管理。

## 服务列表

### 1. WebSocket 客户端

**文件路径**: `src/services/websocket.client.ts`

**功能**: 提供实时通信功能，支持消息队列优先级、心跳优化和错误处理。

**核心方法**:
- `connect(url: string): Promise<boolean>`: 连接到 WebSocket 服务器
- `disconnect(): void`: 断开连接
- `send(message: WebSocketMessage): void`: 发送消息
- `onMessage(callback: (message: WebSocketMessage) => void): void`: 注册消息回调
- `onError(callback: (error: Error) => void): void`: 注册错误回调
- `onClose(callback: (code: number, reason: string) => void): void`: 注册关闭回调

**使用示例**:

```typescript
import { websocketClient } from './services/websocket.client';

// 连接到服务器
await websocketClient.connect('wss://chat.example.com');

// 发送消息
websocketClient.send({
  type: 'chat',
  data: {
    content: 'Hello, world!',
    recipient: 'user123'
  },
  priority: 1
});

// 监听消息
websocketClient.onMessage((message) => {
  console.log('Received message:', message);
});
```

### 2. 错误服务

**文件路径**: `src/services/error.service.ts`

**功能**: 提供全局错误处理、错误分类和错误报告功能。

**核心方法**:
- `handleError(error: Error | string): void`: 处理错误
- `reportError(error: Error, context?: any): void`: 报告错误
- `getErrorInfo(error: Error): ErrorInfo`: 获取错误信息
- `onError(callback: (error: ErrorInfo) => void): void`: 注册错误回调

**使用示例**:

```typescript
import { errorService } from './services/error.service';

try {
  // 可能抛出错误的代码
  throw new Error('Something went wrong!');
} catch (error) {
  errorService.handleError(error);
}

// 监听错误
errorService.onError((errorInfo) => {
  console.error('Error occurred:', errorInfo);
});
```

### 3. 安全服务

**文件路径**: `src/services/security.service.ts`

**功能**: 提供输入验证、XSS 保护、CSRF 保护和 CSP 管理功能。

**核心方法**:
- `validateInput(input: any, schema: any): boolean`: 验证输入
- `sanitizeInput(input: string): string`: 清理输入，防止 XSS
- `generateCSRFToken(): string`: 生成 CSRF 令牌
- `verifyCSRFToken(token: string): boolean`: 验证 CSRF 令牌
- `configureCSP(directives: CSPDirectives): void`: 配置 CSP
- `scanSecurityVulnerabilities(): Promise<SecurityScanResult>`: 扫描安全漏洞

**使用示例**:

```typescript
import { securityService } from './services/security.service';

// 验证输入
const isValid = securityService.validateInput({
  email: 'user@example.com',
  password: 'password123'
}, {
  email: 'required|email',
  password: 'required|min:6'
});

// 清理输入
const sanitized = securityService.sanitizeInput('<script>alert("XSS")</script>');

// 扫描安全漏洞
const scanResult = await securityService.scanSecurityVulnerabilities();
console.log('Security scan result:', scanResult);
```

### 4. 文件服务

**文件路径**: `src/services/file.service.ts`

**功能**: 提供文件上传、分块上传和断点续传功能。

**核心方法**:
- `upload(file: File, options?: UploadOptions): Promise<UploadResult>`: 上传文件
- `uploadChunk(fileId: string, chunk: Blob, chunkIndex: number, totalChunks: number): Promise<ChunkUploadResult>`: 上传文件块
- `resumeUpload(fileId: string): Promise<UploadResult>`: 恢复上传
- `cancelUpload(fileId: string): void`: 取消上传
- `onUploadProgress(callback: (progress: UploadProgress) => void): void`: 注册上传进度回调

**使用示例**:

```typescript
import { fileService } from './services/file.service';

// 上传文件
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const result = await fileService.upload(file, {
    chunkSize: 1024 * 1024, // 1MB
    retryAttempts: 3
  });
  console.log('Upload result:', result);
}

// 监听上传进度
fileService.onUploadProgress((progress) => {
  console.log('Upload progress:', progress.percentage);
});
```

### 5. 内存服务

**文件路径**: `src/services/memory.service.ts`

**功能**: 提供内存优化、内存泄漏检测和缓存管理功能。

**核心方法**:
- `initialize(options?: MemoryServiceOptions): void`: 初始化服务
- `getMemoryStats(): MemoryStats`: 获取内存统计信息
- `optimizeMemory(): void`: 优化内存使用
- `detectMemoryLeaks(): Promise<MemoryLeakReport>`: 检测内存泄漏
- `on(event: string, callback: Function): void`: 注册事件回调

**使用示例**:

```typescript
import { memoryService } from './services/memory.service';

// 初始化内存服务
memoryService.initialize({
  cacheSizeLimit: 1000,
  cacheByteLimit: 50 * 1024 * 1024, // 50MB
  memoryThreshold: 80,
  gcInterval: 60 * 1000, // 1分钟
  leakDetectionInterval: 5 * 60 * 1000, // 5分钟
});

// 监听内存警告
memoryService.on('memoryWarning', (stats) => {
  console.warn('Memory warning:', stats);
});

// 监听内存泄漏检测
memoryService.on('memoryLeakDetected', (report) => {
  console.error('Memory leak detected:', report);
});
```

### 6. 缓存服务

**文件路径**: `src/services/cache.service.ts`

**功能**: 提供高级缓存策略，包括 ARC 和分层缓存。

**核心方法**:
- `getCache(name: string): Cache<any>`: 获取缓存实例
- `setCache(name: string, cache: Cache<any>): void`: 设置缓存实例
- `get<K>(cacheName: string, key: K): any`: 获取缓存值
- `set<K, V>(cacheName: string, key: K, value: V, options?: CacheOptions): void`: 设置缓存值
- `delete<K>(cacheName: string, key: K): void`: 删除缓存值
- `clear(cacheName: string): void`: 清空缓存

**使用示例**:

```typescript
import { cacheService } from './services/cache.service';

// 获取或创建缓存
const userCache = cacheService.getCache('users');

// 设置缓存值
cacheService.set('users', 'user123', {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com'
}, {
  ttl: 60 * 60 * 1000, // 1小时
  priority: 1
});

// 获取缓存值
const user = cacheService.get('users', 'user123');
console.log('User:', user);
```

### 7. 算法服务

**文件路径**: `src/services/algorithm.service.ts`

**功能**: 提供高级算法，包括计数布隆过滤器和跳表。

**核心方法**:
- `createCountingBloomFilter(size: number, hashCount: number): CountingBloomFilter`: 创建计数布隆过滤器
- `createSkipList<K, V>(comparator?: (a: K, b: K) => number): SkipList<K, V>`: 创建跳表
- `getDefaultBloomFilter(): CountingBloomFilter`: 获取默认布隆过滤器
- `getDefaultSkipList(): SkipList<string, any>`: 获取默认跳表

**使用示例**:

```typescript
import { algorithmService } from './services/algorithm.service';

// 创建计数布隆过滤器
const bloomFilter = algorithmService.createCountingBloomFilter(1024, 3);

// 添加元素
bloomFilter.add('user123');
bloomFilter.add('user456');

// 检查元素是否存在
console.log('Contains user123:', bloomFilter.contains('user123'));
console.log('Contains user789:', bloomFilter.contains('user789'));

// 创建跳表
const skipList = algorithmService.createSkipList<number, string>();

// 添加元素
skipList.insert(1, 'one');
skipList.insert(2, 'two');
skipList.insert(3, 'three');

// 查找元素
console.log('Value for 2:', skipList.search(2));
```

### 8. 性能服务

**文件路径**: `src/services/performance.service.ts`

**功能**: 提供实时性能监控和分析功能。

**核心方法**:
- `initialize(): void`: 初始化服务
- `startMonitoring(): void`: 开始监控
- `stopMonitoring(): void`: 停止监控
- `getCurrentMetrics(): PerformanceMetrics`: 获取当前性能指标
- `getPerformanceHistory(): PerformanceMetrics[]`: 获取性能历史记录
- `takePerformanceSnapshot(): PerformanceMetrics`: 拍摄性能快照
- `analyzePerformance(): { insights: string[]; recommendations: string[] }`: 分析性能
- `onPerformanceThresholdExceeded(callback: (metrics: PerformanceMetrics) => void): void`: 注册性能阈值超出回调

**使用示例**:

```typescript
import { performanceService } from './services/performance.service';

// 初始化性能服务
performanceService.initialize();

// 开始监控
performanceService.startMonitoring();

// 监听性能阈值超出
performanceService.onPerformanceThresholdExceeded((metrics) => {
  console.warn('Performance threshold exceeded:', metrics);
});

// 分析性能
const analysis = performanceService.analyzePerformance();
console.log('Performance analysis:', analysis);
```

### 9. 功能开关服务

**文件路径**: `src/services/feature.service.ts`

**功能**: 提供基于特性标志的功能管理系统。

**核心方法**:
- `initialize(): void`: 初始化服务
- `isFeatureEnabled(key: string): boolean`: 检查功能是否启用
- `enableFeature(key: string): boolean`: 启用功能
- `disableFeature(key: string): boolean`: 禁用功能
- `toggleFeature(key: string): boolean`: 切换功能状态
- `getFeature(key: string): FeatureFlag | null`: 获取功能信息
- `getAllFeatures(): FeatureFlag[]`: 获取所有功能
- `registerFeature(feature: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag`: 注册功能
- `updateFeature(key: string, updates: Partial<FeatureFlag>): FeatureFlag | null`: 更新功能
- `deleteFeature(key: string): boolean`: 删除功能
- `onFeatureChanged(callback: (feature: FeatureFlag) => void): void`: 注册功能变化回调

**使用示例**:

```typescript
import { featureService } from './services/feature.service';

// 初始化功能开关服务
featureService.initialize();

// 检查功能是否启用
if (featureService.isFeatureEnabled('webSocket.enable')) {
  console.log('WebSocket is enabled');
} else {
  console.log('WebSocket is disabled');
}

// 启用功能
featureService.enableFeature('microfrontends.enable');

// 监听功能变化
featureService.onFeatureChanged((feature) => {
  console.log('Feature changed:', feature);
});
```

### 10. 工具链服务

**文件路径**: `src/services/toolchain.service.ts`

**功能**: 提供代码生成和开发工具链管理功能。

**核心方法**:
- `initialize(): void`: 初始化服务
- `generateComponent(options: Partial<ComponentTemplateOptions>): { component: string; test?: string; style?: string }`: 生成组件
- `generateService(options: Partial<ServiceTemplateOptions>): { interface?: string; implementation: string; test?: string }`: 生成服务
- `getConfig(): ToolchainConfig`: 获取配置
- `updateConfig(config: Partial<ToolchainConfig>): void`: 更新配置

**使用示例**:

```typescript
import { toolchainService } from './services/toolchain.service';

// 初始化工具链服务
toolchainService.initialize();

// 生成组件
const componentResult = toolchainService.generateComponent({
  name: 'user-profile',
  type: 'functional',
  withProps: true,
  withState: true,
  withEffects: true,
  withStyles: true,
  withTests: true
});

console.log('Generated component:', componentResult.component);

// 生成服务
const serviceResult = toolchainService.generateService({
  name: 'user',
  withInterface: true,
  withImplementation: true,
  withTests: true
});

console.log('Generated service:', serviceResult.implementation);
```

## 依赖注入

所有服务都通过依赖注入系统进行管理，可以通过容器解析获取服务实例。

**使用示例**:

```typescript
import { container } from './di';

// 解析服务
const websocketClient = container.resolve('websocketClient');
const errorService = container.resolve('errorService');

// 使用服务
await websocketClient.connect('wss://chat.example.com');
```

## 服务初始化

所有服务都需要在应用启动时进行初始化，可以通过 `services` 数组统一初始化。

**示例** (在 `main.tsx` 中):

```typescript
// 初始化所有服务
const services = [
  'errorService',
  'securityService',
  'fileService',
  'memoryService',
  'pluginManager',
  'websocketClient',
  'cacheService',
  'algorithmService',
  'performanceService',
  'featureService',
  'toolchainService'
];

services.forEach(serviceName => {
  const service = container.resolve(serviceName);
  if (service && typeof service.initialize === 'function') {
    service.initialize();
  }
});
```
