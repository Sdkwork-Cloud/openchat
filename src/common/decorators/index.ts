/**
 * 装饰器模块索引
 * 提供通用的装饰器和元数据
 *
 * @framework
 */

// API 装饰器
export * from './api.decorator';

// 缓存控制装饰器
export * from './cache-control.decorator';

// 事务装饰器
export * from './transaction.decorator';

// 审计装饰器
export * from './audit.decorator';

// 权限装饰器
export * from './permission.decorator';

// 用户上下文装饰器
export * from './user-context.decorator';

// 验证装饰器
export * from './validation.decorators';

// 响应装饰器
export * from './response.decorator';

// 限流装饰器
export * from './rate-limit.decorator';

// 控制器装饰器
export * from './controller.decorator';
