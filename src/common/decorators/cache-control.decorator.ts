/**
 * 缓存控制装饰器
 * 提供灵活的缓存策略配置
 *
 * @framework
 */

import { SetMetadata, applyDecorators, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  /** 只读缓存 */
  READ_ONLY = 'read-only',
  /** 读写缓存 */
  READ_WRITE = 'read-write',
  /** 先刷新缓存 */
  REFRESH_BEFORE = 'refresh-before',
  /** 条件缓存 */
  CONDITIONAL = 'conditional',
  /** 分布式缓存 */
  DISTRIBUTED = 'distributed',
}

/**
 * 缓存装饰器选项
 */
export interface CacheOptions {
  /** 缓存键 */
  key?: string | ((...args: any[]) => string);
  /** 缓存过期时间（秒） */
  ttl?: number;
  /** 缓存策略 */
  strategy?: CacheStrategy;
  /** 缓存前缀 */
  prefix?: string;
  /** 是否缓存 null 值 */
  cacheNull?: boolean;
  /** 缓存条件 */
  condition?: (result: any) => boolean;
  /** 是否忽略缓存 */
  ignoreCache?: boolean;
  /** 刷新缓存 */
  refresh?: boolean;
  /** 缓存组（用于批量清除） */
  group?: string;
  /** 是否启用统计 */
  enableStats?: boolean;
}

/**
 * 缓存键元数据
 */
export const CACHE_KEY_METADATA = 'cache:key';
/**
 * 缓存选项元数据
 */
export const CACHE_OPTIONS_METADATA = 'cache:options';
/**
 * 缓存清除元数据
 */
export const CACHE_CLEAR_METADATA = 'cache:clear';

/**
 * 缓存装饰器
 *
 * @example
 * // 基本用法
 * @Cache({ ttl: 300 })
 * @Get('data')
 * getData() {
 *   return this.service.getData();
 * }
 *
 * @example
 * // 自定义缓存键
 * @Cache({ key: (userId: string) => `user:${userId}`, ttl: 600 })
 * @Get('user/:userId')
 * getUser(@Param('userId') userId: string) {
 *   return this.service.getUser(userId);
 * }
 *
 * @example
 * // 缓存组
 * @Cache({ group: 'users', ttl: 300 })
 * @Get('users')
 * getUsers() {
 *   return this.service.getUsers();
 * }
 */
export function Cache(options: CacheOptions = {}): MethodDecorator {
  const key = typeof options.key === 'function' ? undefined : options.key;

  return applyDecorators(
    SetMetadata(CACHE_KEY_METADATA, key),
    SetMetadata(CACHE_OPTIONS_METADATA, options),
  );
}

/**
 * 缓存清除装饰器
 * 用于清除指定缓存
 *
 * @example
 * // 清除单个缓存
 * @CacheClear({ key: (userId: string) => `user:${userId}` })
 * @Put('user/:userId')
 * updateUser(@Param('userId') userId: string) {
 *   return this.service.updateUser(userId);
 * }
 *
 * @example
 * // 清除缓存组
 * @CacheClear({ group: 'users' })
 * @Post('user')
 * createUser() {
 *   return this.service.createUser();
 * }
 */
export function CacheClear(options: { key?: string | ((...args: any[]) => string); group?: string } = {}): MethodDecorator {
  return SetMetadata(CACHE_CLEAR_METADATA, options);
}

/**
 * 缓存拦截器
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 获取缓存元数据
    const cacheKey = Reflect.getMetadata(CACHE_KEY_METADATA, context.getHandler());
    const cacheOptions = Reflect.getMetadata(CACHE_OPTIONS_METADATA, context.getHandler());
    const cacheClear = Reflect.getMetadata(CACHE_CLEAR_METADATA, context.getHandler());

    // 如果需要清除缓存
    if (cacheClear) {
      return next.handle().pipe(
        tap(() => {
          // 这里可以添加清除缓存的逻辑
          // await cacheService.clear(cacheClear.key, cacheClear.group);
        }),
      );
    }

    // 如果没有缓存配置，直接执行
    if (!cacheOptions && !cacheKey) {
      return next.handle();
    }

    // 构建缓存键
    const fullKey = this.buildCacheKey(request, cacheKey, cacheOptions);

    // TODO: 从缓存获取数据
    // const cached = await cacheService.get(fullKey);
    // if (cached !== undefined) {
    //   response.setHeader('X-Cache', 'HIT');
    //   return of(cached);
    // }

    // 执行并缓存结果
    return next.handle().pipe(
      tap(async (result) => {
        // 检查是否应该缓存
        if (cacheOptions?.condition && !cacheOptions.condition(result)) {
          return;
        }

        // 检查是否缓存 null 值
        if (result === null && cacheOptions?.cacheNull === false) {
          return;
        }

        // TODO: 缓存结果
        // await cacheService.set(fullKey, result, cacheOptions?.ttl);
        response.setHeader('X-Cache', 'MISS');
      }),
    );
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(
    request: any,
    explicitKey: string | undefined,
    options?: CacheOptions,
  ): string {
    const prefix = options?.prefix || 'api';
    let key: string;

    if (explicitKey) {
      key = explicitKey;
    } else {
      // 使用 URL 和请求方法作为键
      key = `${request.method}:${request.url}`;
    }

    return `${prefix}:${key}`;
  }
}

/**
 * 防抖装饰器
 * 防止短时间内重复请求
 *
 * @example
 * @Debounce(1000)
 * @Post('search')
 * search(@Body() query: SearchQuery) {
 *   return this.service.search(query);
 * }
 */
export function Debounce(delayMs: number = 300): MethodDecorator {
  return SetMetadata('debounce:delay', delayMs);
}

/**
 * 节流装饰器
 * 限制请求频率
 *
 * @example
 * @Throttle({ limit: 10, ttl: 60 })
 * @Get('data')
 * getData() {
 *   return this.service.getData();
 * }
 */
export function Throttle(options: { limit: number; ttl: number } = { limit: 10, ttl: 60 }): MethodDecorator {
  return SetMetadata('throttle:options', options);
}

/**
 * 请求超时装饰器
 *
 * @example
 * @Timeout(5000)
 * @Get('slow-endpoint')
 * slowEndpoint() {
 *   return this.service.slowOperation();
 * }
 */
export function Timeout(ms: number): MethodDecorator {
  return SetMetadata('timeout:ms', ms);
}

/**
 * 重试装饰器
 *
 * @example
 * @Retry({ attempts: 3, delay: 1000 })
 * @Get('external-api')
 * callExternalApi() {
 *   return this.externalService.call();
 * }
 */
export function Retry(options: { attempts?: number; delay?: number } = {}): MethodDecorator {
  return SetMetadata('retry:options', options);
}
