import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

/**
 * 自定义限流装饰器
 * 可以覆盖默认的限流配置
 */
export interface ThrottleOptions {
  limit: number;
  ttl: number;
  keyPrefix?: string;
}

/**
 * 限流装饰器
 * @param limit 请求限制次数
 * @param ttl 时间窗口（毫秒）
 */
export const Throttle = (limit: number, ttl: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttl });

/**
 * 跳过限流装饰器
 * 用于特定接口跳过限流检查
 */
export const SkipThrottle = () => SetMetadata(THROTTLE_KEY, { skip: true });
