/**
 * 通用模块 - 框架级核心组件
 * 
 * 提供高内聚低耦合的通用服务和组件，支持快速构建企业级应用
 * 
 * @framework
 */

import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { RedisModule } from './redis/redis.module';

// 基础服务
import { BaseService } from './base/base.service';
import { BaseEntity, AuditableEntity, OwnedEntity, VisibleEntity, SortableEntity, UUIDEntity, SnowflakeEntity, TaggableEntity, DescribableEntity, EntityStatus, Visibility, IEntity, IAuditable, ISoftDelete, Taggable, Describable } from './base/base.entity';
import { EnhancedCacheService } from './base/enhanced-cache.service';

// 认证授权
import { AuthManagerService } from './auth/auth-manager.service';
import { AuthStrategy } from './auth/auth-strategy.interface';
import { TokenBlacklistService } from './auth/token-blacklist.service';
import { PermissionGuard, RoleGuard, OwnerGuard, AdminOnly, Authenticated } from './guards';

// 缓存
import { CacheService } from './services/cache.service';

// 配置
import { ConfigCenterService, Config, ConfigNamespaceDecorator } from './services/config-center.service';

// 分布式锁
import { DistributedLockService, UseLock } from './services/distributed-lock.service';

// 权限服务
import { PermissionService } from './services/permission.service';

// 事件总线
import { EventBusService, OnEvent, InMemoryEventStore, IEvent, IEventHandler } from './events/event-bus.service';

// 异常处理
import { BusinessException, BusinessErrorCode, createError, ValidationErrorBuilder } from './exceptions/business.exception';

// 过滤器
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { BusinessExceptionFilter } from './filters/business-exception.filter';

// 拦截器
import { TransformInterceptor, TimingInterceptor, MetadataInterceptor } from './interceptors/transform.interceptor';

// 管道
import { ValidationPipe } from './pipes/validation.pipe';

// DTO
import {
  BaseDto,
  TimestampDto,
  BaseEntityDto,
  AuditableDto,
  PaginationQueryDto,
  SearchQueryDto,
  SortDto,
  StatusDto,
  KeywordDto,
  IdsDto,
  DateRangeDto,
  EmailDto,
  PhoneDto,
  PasswordDto,
  UsernameDto,
  NicknameDto,
  UrlDto,
  NumericIdParamDto,
  StringIdParamDto,
  UuidParamDto,
  CoordinatesDto,
  FileUploadDto,
  BooleanQueryDto,
  NumberRangeDto,
  createEnumDto,
  createArrayDto,
} from './dto/base.dto';

import {
  SuccessResponseDto,
  ErrorResponseDto,
  PagedResponseDto,
  CursorPagedResponseDto,
  EmptyResponseDto,
  BooleanResponseDto,
  IdResponseDto,
  BatchResponseDto,
  TaskResponseDto,
  ExportResponseDto,
  ImportResponseDto,
  HealthResponseDto,
  buildResponseMeta,
  ApiResponseDecorator,
  ResponseMeta,
  PaginationMeta,
  ApiResponse,
} from './dto/response.dto';

// ID 生成器
import { IdGeneratorService, GenerateId } from './services/id-generator.service';

// 性能监控
import { PerformanceMonitorService, MonitorPerformance } from './monitoring/performance-monitor.service';

// 分页服务
import { PaginationService, Paginate } from './services/pagination.service';

// 限流
import { RateLimitService, RateLimitPolicies } from './services/rate-limit.service';

// 熔断器
import { CircuitBreakerService, CircuitBreaker } from './services/circuit-breaker.service';

// 加密服务
import { EncryptionService, Encrypted, Hashed } from './services/encryption.service';

// WebSocket
import { BaseWebSocketGateway, OnWebSocketMessage } from './websocket/base-websocket.gateway';

// 工具类
import { EntityFinder } from './utils/entity-finder.util';

// 常量
export { BusinessErrorCode, EntityStatus, Visibility, RateLimitPolicies };

// 类型导出
export type {
  IEntity,
  IAuditable,
  ISoftDelete,
  Taggable,
  Describable,
  IEvent,
  IEventHandler,
  ResponseMeta,
  PaginationMeta,
  ApiResponse,
};

// 服务导出
export {
  BaseService,
  BaseEntity,
  AuditableEntity,
  OwnedEntity,
  VisibleEntity,
  SortableEntity,
  UUIDEntity,
  SnowflakeEntity,
  EnhancedCacheService,
  
  AuthManagerService,
  AuthStrategy,
  TokenBlacklistService,
  
  CacheService,
  ConfigCenterService,
  DistributedLockService,
  EventBusService,
  InMemoryEventStore,
  BusinessException,

  AllExceptionsFilter,
  BusinessExceptionFilter,
  
  TransformInterceptor,
  TimingInterceptor,
  MetadataInterceptor,
  
  ValidationPipe,
  
  BaseDto,
  TimestampDto,
  BaseEntityDto,
  AuditableDto,
  PaginationQueryDto,
  SearchQueryDto,
  SortDto,
  StatusDto,
  KeywordDto,
  IdsDto,
  DateRangeDto,
  EmailDto,
  PhoneDto,
  PasswordDto,
  UsernameDto,
  NicknameDto,
  UrlDto,
  NumericIdParamDto,
  StringIdParamDto,
  UuidParamDto,
  CoordinatesDto,
  FileUploadDto,
  BooleanQueryDto,
  NumberRangeDto,
  
  SuccessResponseDto,
  ErrorResponseDto,
  PagedResponseDto,
  CursorPagedResponseDto,
  EmptyResponseDto,
  BooleanResponseDto,
  IdResponseDto,
  BatchResponseDto,
  TaskResponseDto,
  ExportResponseDto,
  ImportResponseDto,
  HealthResponseDto,
  
  IdGeneratorService,
  PerformanceMonitorService,
  PaginationService,
  RateLimitService,
  CircuitBreakerService,
  EncryptionService,
  BaseWebSocketGateway,
  EntityFinder,
};

// 装饰器导出
export {
  TaggableEntity,
  DescribableEntity,
  GenerateId,
  OnEvent,
  UseLock,
  MonitorPerformance,
  Paginate,
  CircuitBreaker,
  Encrypted,
  Hashed,
  OnWebSocketMessage,
  PermissionGuard,
  RoleGuard,
  OwnerGuard,
  AdminOnly,
  Authenticated,
  Config,
  ConfigNamespaceDecorator,
  createEnumDto,
  createArrayDto,
  buildResponseMeta,
  ApiResponseDecorator,
  createError,
  ValidationErrorBuilder,
};

/**
 * 通用模块配置选项
 */
export interface CommonModuleOptions {
  global?: boolean;
  enableCache?: boolean;
  enableEvents?: boolean;
  enableLock?: boolean;
  enableMetrics?: boolean;
  enableRateLimit?: boolean;
  enableCircuitBreaker?: boolean;
  enableEncryption?: boolean;
  imports?: any[];
  providers?: Provider[];
  exports?: any[];
}

/**
 * 通用模块
 */
@Global()
@Module({
  imports: [
    RedisModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
    }),
  ],
  providers: [
    AuthManagerService,
    TokenBlacklistService,
    CacheService,
    EnhancedCacheService,
    ConfigCenterService,
    DistributedLockService,
    EventBusService,
    IdGeneratorService,
    PerformanceMonitorService,
    PaginationService,
    RateLimitService,
    CircuitBreakerService,
    EncryptionService,
    EntityFinder,
    PermissionService,
    AllExceptionsFilter,
    BusinessExceptionFilter,
    TransformInterceptor,
    TimingInterceptor,
    MetadataInterceptor,
    ValidationPipe,
  ],
  exports: [
    AuthManagerService,
    TokenBlacklistService,
    CacheService,
    EnhancedCacheService,
    ConfigCenterService,
    DistributedLockService,
    EventBusService,
    IdGeneratorService,
    PerformanceMonitorService,
    PaginationService,
    RateLimitService,
    CircuitBreakerService,
    EncryptionService,
    EntityFinder,
    PermissionService,
    AllExceptionsFilter,
    BusinessExceptionFilter,
    TransformInterceptor,
    TimingInterceptor,
    MetadataInterceptor,
    ValidationPipe,
  ],
})
export class CommonModule {
  static forRoot(options: CommonModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [];
    const exports: any[] = [];

    if (options.enableCache !== false) {
      providers.push(CacheService, EnhancedCacheService);
      exports.push(CacheService, EnhancedCacheService);
    }

    if (options.enableEvents !== false) {
      providers.push(EventBusService);
      exports.push(EventBusService);
    }

    if (options.enableLock) {
      providers.push(DistributedLockService);
      exports.push(DistributedLockService);
    }

    if (options.enableMetrics) {
      providers.push(PerformanceMonitorService);
      exports.push(PerformanceMonitorService);
    }

    if (options.enableRateLimit) {
      providers.push(RateLimitService);
      exports.push(RateLimitService);
    }

    if (options.enableCircuitBreaker) {
      providers.push(CircuitBreakerService);
      exports.push(CircuitBreakerService);
    }

    if (options.enableEncryption) {
      providers.push(EncryptionService);
      exports.push(EncryptionService);
    }

    if (options.providers) {
      providers.push(...options.providers);
    }

    if (options.exports) {
      exports.push(...options.exports);
    }

    return {
      module: CommonModule,
      global: options.global ?? true,
      imports: [...(options.imports || [])],
      providers,
      exports,
    };
  }
}
