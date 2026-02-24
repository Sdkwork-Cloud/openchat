# OpenChat 框架通用组件总结

## 概述

本文档总结了为 OpenChat 项目打造的所有框架级别通用组件，这些组件遵循高内聚低耦合的设计原则，具备高可用性、易扩展、易维护的特点。

---

## 一、核心基础组件

### 1.1 实体基类系统 (`src/common/base/base.entity.ts`)

| 类名 | 描述 | 特性 |
|------|------|------|
| `BaseEntity` | 基础实体 | 审计字段、软删除、版本号、状态管理、元数据 |
| `AuditableEntity` | 审计实体 | 基础实体 + 创建者/更新者/删除者 |
| `OwnedEntity` | 所有者实体 | 审计实体 + 所有者检查 |
| `VisibleEntity` | 可见性实体 | 审计实体 + 可见性控制 |
| `SortableEntity` | 排序实体 | 审计实体 + 排序/树形结构 |
| `UUIDEntity` | UUID 主键 | UUID 类型主键 |
| `SnowflakeEntity` | 雪花 ID 主键 | 雪花算法 ID 主键 |

**Mixin 模式支持：**
- `TaggableEntity` - 标签支持
- `DescribableEntity` - 描述支持

### 1.2 服务基类系统

| 服务类 | 描述 | 核心功能 |
|--------|------|----------|
| `BaseService` | 基础服务 | 事务处理、批量操作、日志记录 |
| `CrudService<T>` | CRUD 服务 | 完整的增删改查、软删除、批量操作 |
| `EnhancedCacheService` | 增强缓存 | 多级缓存、缓存预热、防击穿 |
| `EventBusService` | 事件总线 | 发布订阅、事件溯源、分布式事件 |
| `BatchOperationService` | 批量操作 | 并发控制、重试机制、进度追踪 |

---

## 二、装饰器系统

### 2.1 API 装饰器 (`src/common/decorators/api.decorator.ts`)

```typescript
@ApiEndpoint({ summary: 'API 描述', auth: true })
@ApiSuccessResponse(UserEntity)
@ApiErrorResponses({ badRequest: true, unauthorized: true })
@ApiPaginatedResponse(UserEntity)
```

### 2.2 用户上下文装饰器 (`src/common/decorators/user-context.decorator.ts`)

| 装饰器 | 描述 |
|--------|------|
| `@CurrentUser()` | 获取当前用户信息 |
| `@CurrentUserId()` | 获取当前用户 ID |
| `@CurrentUserRoles()` | 获取当前用户角色 |
| `@CurrentUserPermissions()` | 获取当前用户权限 |
| `@RequestId()` | 获取请求 ID |
| `@ClientIp()` | 获取客户端 IP |
| `@UserAgent()` | 获取用户代理 |
| `@PaginationParams()` | 获取分页参数 |
| `@SortParams()` | 获取排序参数 |
| `@SearchParams()` | 获取搜索参数 |

### 2.3 缓存控制装饰器 (`src/common/decorators/cache-control.decorator.ts`)

```typescript
@Cache({ key: (userId: string) => `user:${userId}`, ttl: 300 })
@CacheClear({ group: 'users' })
@Debounce(1000)
@Throttle({ limit: 10, ttl: 60 })
@Timeout(5000)
@Retry({ attempts: 3, delay: 1000 })
```

### 2.4 事务装饰器 (`src/common/decorators/transaction.decorator.ts`)

```typescript
@Transaction({ isolation: IsolationLevel.SERIALIZABLE, retries: 3 })
@ReadOnlyTransaction()
@InTransaction()
@RequireNewTransaction()
@TransactionPropagation(Propagation.NESTED)
```

### 2.5 审计装饰器 (`src/common/decorators/audit.decorator.ts`)

```typescript
@Audit({ operation: OperationType.CREATE, description: '创建用户' })
@AuditCreate('创建资源')
@AuditUpdate('更新资源')
@AuditDelete('删除资源')
@AuditRead('查询资源')
@PerformanceMonitor()
@RequestLog()
```

### 2.6 权限装饰器 (`src/common/decorators/permission.decorator.ts`)

```typescript
@Roles('admin')
@Roles(['admin', 'user'], { any: true })
@Permissions('user:create')
@Permissions(['user:read', 'user:write'], { any: true })
@ResourceAccess({ resourceType: 'User', action: 'edit', checkOwnership: true })
@Public()
@RequireAuth()
@AccessControl({ roles: ['admin'], permissions: ['user:*'] })
```

---

## 三、管道系统

### 3.1 数据转换管道

| 管道 | 描述 | 用法示例 |
|------|------|----------|
| `ParseJsonPipe` | JSON 解析 | `@Body(new ParseJsonPipe())` |
| `ParseBooleanPipe` | 布尔值解析 | `@Query('flag', new ParseBooleanPipe())` |
| `ParseArrayPipe` | 数组解析 | `@Query('ids', new ParseArrayPipe())` |
| `ParseNumberArrayPipe` | 数字数组解析 | `@Query('ids', new ParseNumberArrayPipe())` |
| `ParseIdArrayPipe` | ID 数组解析 | `@Query('ids', new ParseIdArrayPipe())` |

### 3.2 数据验证管道

| 管道 | 描述 | 用法示例 |
|------|------|----------|
| `TrimPipe` | 字符串修剪 | `@Body(new TrimPipe())` |
| `TrimObjectPipe` | 对象修剪 | `@Body(new TrimObjectPipe())` |
| `SanitizePipe` | XSS 防护 | `@Body(new SanitizePipe({ removeHtml: true }))` |
| `SanitizeHtmlPipe` | HTML 清理 | `@Body(new SanitizeHtmlPipe())` |
| `ValidateDtoPipe` | DTO 验证 | `@Body(new ValidateDtoPipe(CreateUserDto))` |
| `ValidatePartialDtoPipe` | 部分 DTO 验证 | `@Body(new ValidatePartialDtoPipe(UpdateUserDto))` |

### 3.3 文件验证管道

| 管道 | 描述 | 用法示例 |
|------|------|----------|
| `FileValidationPipe` | 通用文件验证 | `@UploadedFile(new FileValidationPipe({ maxSize: 10 * 1024 * 1024 }))` |
| `ImageValidationPipe` | 图片验证 | `@UploadedFile(new ImageValidationPipe())` |
| `VideoValidationPipe` | 视频验证 | `@UploadedFile(new VideoValidationPipe())` |
| `AudioValidationPipe` | 音频验证 | `@UploadedFile(new AudioValidationPipe())` |
| `PdfValidationPipe` | PDF 验证 | `@UploadedFile(new PdfValidationPipe())` |

---

## 四、DTO 系统

### 4.1 基础 DTO (`src/common/dto/base.dto.ts`)

| DTO 类 | 描述 | 用途 |
|--------|------|------|
| `BaseDto` | 基础 DTO | 所有 DTO 的基类 |
| `CreateDto` | 创建 DTO | POST 请求 |
| `UpdateDto` | 更新 DTO | PUT 请求 |
| `PartialUpdateDto` | 部分更新 DTO | PATCH 请求 |
| `DeleteDto` | 删除 DTO | DELETE 请求 |
| `BatchCreateDto` | 批量创建 DTO | 批量创建 |
| `BatchUpdateDto` | 批量更新 DTO | 批量更新 |
| `BatchDeleteDto` | 批量删除 DTO | 批量删除 |
| `ImportDto` | 导入 DTO | 数据导入 |
| `ExportDto` | 导出 DTO | 数据导出 |
| `SearchDto` | 搜索 DTO | 搜索操作 |
| `FilterDto` | 过滤 DTO | 复杂过滤 |
| `SortDto` | 排序 DTO | 排序参数 |
| `StatsDto` | 统计 DTO | 统计数据 |
| `ChangeStatusDto` | 状态变更 DTO | 状态修改 |

### 4.2 响应 DTO (`src/common/dto/response.dto.ts`)

| 响应 DTO | 描述 | 状态码 |
|----------|------|--------|
| `SuccessResponseDto<T>` | 成功响应 | 200 |
| `ErrorResponseDto` | 错误响应 | 4xx/5xx |
| `PagedResponseDto<T>` | 分页响应 | 200 |
| `CursorPagedResponseDto<T>` | 游标分页响应 | 200 |
| `EmptyResponseDto` | 空响应 | 204 |
| `BooleanResponseDto` | 布尔响应 | 200 |
| `IdResponseDto` | ID 响应 | 201 |
| `BatchResponseDto<T>` | 批量操作响应 | 200/207 |
| `TaskResponseDto` | 异步任务响应 | 202 |
| `ExportResponseDto` | 导出响应 | 200 |
| `ImportResponseDto` | 导入响应 | 200/207 |
| `HealthResponseDto` | 健康检查响应 | 200 |

### 4.3 分页 DTO (`src/common/dto/pagination.dto.ts`)

```typescript
class PaginationDto {
  page: number = 1;
  pageSize: number = 20;
  offset: number;
  limit: number;
}

class CursorPaginationDto {
  cursor?: string;
  limit: number = 20;
}
```

---

## 五、错误处理系统

### 5.1 业务异常 (`src/common/exceptions/business.exception.ts`)

**错误码分类：**

| 范围 | 分类 | 示例 |
|------|------|------|
| 2000 | 成功 | `SUCCESS` |
| 4000-4099 | 客户端错误 | `INVALID_PARAMETER`, `VALIDATION_ERROR` |
| 4100-4199 | 认证错误 | `UNAUTHORIZED`, `INVALID_TOKEN`, `EXPIRED_TOKEN` |
| 4200-4299 | 授权错误 | `FORBIDDEN`, `PERMISSION_DENIED` |
| 4300-4399 | 资源错误 | `RESOURCE_NOT_FOUND`, `RESOURCE_EXISTS` |
| 4400-4499 | 业务错误 | `OPERATION_FAILED`, `BUSINESS_RULE_VIOLATION` |
| 4500-4599 | 限流错误 | `RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED` |
| 4600-4699 | 文件错误 | `FILE_TOO_LARGE`, `INVALID_FILE_TYPE` |
| 5000-5099 | 服务端错误 | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` |
| 5100-5199 | 数据库错误 | `DATABASE_ERROR`, `DATABASE_QUERY_ERROR` |
| 5200-5299 | 缓存错误 | `CACHE_ERROR`, `CACHE_MISS` |
| 5300-5399 | 第三方错误 | `THIRD_PARTY_ERROR` |
| 5400-5499 | 消息队列错误 | `QUEUE_ERROR`, `QUEUE_PUBLISH_FAILED` |

**快捷方法：**
```typescript
BusinessException.validation(errors)
BusinessException.notFound('User', id)
BusinessException.alreadyExists('User', 'username', 'test')
BusinessException.permissionDenied('update', 'user')
BusinessException.unauthorized()
BusinessException.invalidToken()
BusinessException.operationFailed('create user')
BusinessException.rateLimitExceeded(100, 60)
BusinessException.databaseError('Query failed', cause)
```

### 5.2 错误注册表 (`src/common/exceptions/error-registry.ts`)

```typescript
// 注册错误定义
errorRegistry.register({
  code: 4000,
  name: 'INVALID_REQUEST',
  level: ErrorLevel.WARNING,
  category: ErrorCategory.CLIENT,
  messageZh: '请求参数无效',
  messageEn: 'Invalid request parameters',
  causes: ['参数格式错误', '缺少必填字段'],
  solutions: ['检查请求参数格式', '确认必填字段已填写'],
  recoverable: true,
});

// 获取错误详情
const details = errorRegistry.getErrorDetails(4000);

// 使用构建器
const error = createError(4000)
  .name('INVALID_REQUEST')
  .level(ErrorLevel.WARNING)
  .message('请求参数无效', 'Invalid request parameters')
  .build();
```

### 5.3 异常过滤器 (`src/common/filters/http-error.filter.ts`)

```typescript
// 全局异常过滤器
app.useGlobalFilters(new HttpErrorFilter(configService, errorRegistry));

// 业务异常专用过滤器
app.useGlobalFilters(new BusinessExceptionFilter());

// 验证错误专用过滤器
app.useGlobalFilters(new ValidationErrorFilter());
```

---

## 六、类型系统 (`src/common/types/index.ts`)

### 6.1 工具类型

```typescript
// 可选/必填/只读
type Optional<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };

// 深度转换
type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
type DeepReadonly<T> = { readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P] };

// 条件类型
type NonNullable<T> = T extends null | undefined ? never : T;
type Nullable<T> = T | null;
type Maybe<T> = T | null | undefined;

// 结果类型
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
type Success<T> = { success: true; data: T };
type Failure<E = Error> = { success: false; error: E };

// 分页类型
type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

// 设计模式类型
interface Command<T> { execute(): Promise<T>; undo?(): Promise<void>; }
interface Query<T> { execute(): Promise<T>; }
interface Handler<TInput, TOutput> { handle(input: TInput): Promise<TOutput>; }
interface Strategy<T> { canHandle(context: any): boolean; execute(context: any): Promise<T>; }
```

---

## 七、工具函数 (`src/common/utils/index.ts`)

### 7.1 ID 生成

```typescript
generateUuid()           // UUID v4
generateSnowflakeId()    // 雪花 ID
generateShortId(8)       // 短 ID
```

### 7.2 对象操作

```typescript
deepClone(obj)           // 深度克隆
deepMerge(target, ...sources)  // 深度合并
flattenObject(obj)       // 对象扁平化
unflattenObject(obj)     // 对象解扁平化
safeGet(obj, path, default)  // 安全获取
removeNullAndUndefined(obj)  // 移除 null/undefined
```

### 7.3 函数工具

```typescript
debounce(func, wait)     // 防抖
throttle(func, limit)    // 节流
sleep(ms)                // 休眠
retryWithBackoff(op, options)  // 指数退避重试
withTimeout(promise, ms) // 超时处理
parallelLimit(tasks, limit)    // 并发限制
batchProcess(items, processor, options)  // 批量处理
```

### 7.4 格式化工具

```typescript
formatBytes(bytes)       // 格式化字节
formatDuration(ms)       // 格式化持续时间
camelToKebab(str)        // 驼峰转短横线
kebabToCamel(str)        // 短横线转驼峰
capitalize(str)          // 首字母大写
uncapitalize(str)        // 首字母小写
```

### 7.5 加密工具

```typescript
hash(data, algorithm)    // 生成哈希
```

### 7.6 性能优化器 (`src/common/utils/performance-optimizer.ts`)

```typescript
const optimizer = new PerformanceOptimizer({
  slowRequestThreshold: 1000,
  slowQueryThreshold: 1000,
});

optimizer.recordRequest({ path, method, duration, statusCode });
optimizer.recordSlowQuery({ query, duration, parameters });

const metrics = optimizer.getMetrics();
const suggestions = optimizer.getOptimizationSuggestions();
```

---

## 八、缓存系统

### 8.1 增强缓存服务 (`src/common/cache/enhanced-cache.service.ts`)

```typescript
// 基本操作
await cache.get<T>(key, options);
await cache.set<T>(key, value, options);
await cache.del(key);
await cache.exists(key);

// 高级功能
const data = await cache.getOrSet(key, factory, options);
await cache.warmup(key, factory, { refreshInterval: 300 });
await cache.mget(keys);
await cache.mset(entries);
await cache.delGroup('users');

// 统计
const stats = cache.getStats();
```

### 8.2 缓存策略

- **多级缓存**: 本地内存 + Redis
- **防击穿**: 分布式锁保护
- **预热**: 定时刷新缓存
- **分组**: 按组批量清除
- **LRU**: 本地缓存自动淘汰

---

## 九、配置验证 (`src/common/config/config-validation.service.ts`)

```typescript
// 验证配置
const config = configValidationService.validateAll();

// 获取验证后的配置
const validatedConfig = configValidationService.getValidatedConfig();

// 配置分类
interface IAllConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  server: ServerConfig;
  log: LogConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  wukongim?: WukongIMConfig;
}
```

---

## 十、批量操作 (`src/common/services/batch-operation.service.ts`)

```typescript
// 基本批量处理
const result = await batchService.processBatch(
  items,
  async (item) => processor(item),
  { batchSize: 20, concurrency: 5, retries: 3 }
);

// 高并发版本
const result = await batchService.processBatchConcurrent(
  items,
  async (item) => processor(item),
  { maxConcurrency: 10 }
);

// 批量 CRUD
await batchService.bulkCreate(items, creator);
await batchService.bulkUpdate(items, updater);
await batchService.bulkDelete(ids, deleter);

// 流式处理
const results = await batchService.processStream(
  asyncIterable,
  processor,
  { concurrency: 5 }
);
```

---

## 设计原则

### 1. 高内聚
- 每个组件职责单一
- 相关功能集中管理
- 减少模块间依赖

### 2. 低耦合
- 依赖抽象接口
- 使用依赖注入
- 事件驱动解耦

### 3. 易扩展
- 开放封闭原则
- 策略模式支持
- 装饰器模式扩展

### 4. 易维护
- 统一代码风格
- 完整类型定义
- 详细文档注释

### 5. 高性能
- 多级缓存
- 批量处理
- 并发控制
- 连接池优化

### 6. 高可用
- 错误处理完善
- 重试机制
- 熔断限流
- 健康检查

---

## 使用示例

### 完整的 CRUD 操作

```typescript
// Entity
@Entity('users')
export class UserEntity extends AuditableEntity {
  @Column({ unique: true })
  username: string;

  @Column()
  nickname: string;

  @Column({ nullable: true })
  avatar?: string;
}

// DTO
export class CreateUserDto extends CreateDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MaxLength(50)
  nickname: string;
}

export class UpdateUserDto extends PartialUpdateDto {}

// Service
@Injectable()
export class UserService extends CrudService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {
    super(dataSource, userRepository);
  }

  @Cache({ key: (id: string) => `user:${id}`, ttl: 300 })
  async getUser(id: string): Promise<UserEntity> {
    return this.findOneOrFail(id);
  }

  @Audit({ operation: OperationType.CREATE, description: '创建用户' })
  @Transaction()
  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    return this.create(dto);
  }
}

// Controller
@ApiTags('用户管理')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @AuditCreate('创建用户')
  async create(@Body(new ValidateDtoPipe(CreateUserDto)) dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserInfo,
  ) {
    return this.userService.getUser(id);
  }

  @Get()
  async findAll(@SearchParams() params: SearchParams) {
    return this.userService.findWithPagination(params);
  }

  @Put(':id')
  @AuditUpdate('更新用户')
  async update(
    @Param('id') id: string,
    @Body(new ValidatePartialDtoPipe(UpdateUserDto)) dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @AuditDelete('删除用户')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

---

## 总结

本框架提供了一套完整的通用组件系统，包括：

- **20+** 基础类和接口
- **30+** 装饰器
- **15+** 管道
- **20+** DTO 类
- **50+** 错误码定义
- **30+** 工具函数
- **10+** 服务类

所有组件都经过精心设计，遵循 SOLID 原则，支持快速构建企业级应用。
