import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  timestamp: number;
  type: string;
  value: number;
  labels?: Record<string, string>;
}

/**
 * 性能监控服务
 * 收集和存储系统性能指标
 */
@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);

  // 内存中的指标缓存
  private metricsCache: PerformanceMetric[] = [];
  private readonly MAX_CACHE_SIZE = 1000;

  // 指标键前缀
  private readonly REDIS_KEY_PREFIX = 'metrics:';

  // 计时器存储
  private timers = new Map<string, number>();

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit() {
    this.logger.log('Metrics service initialized');
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy() {
    // 清理资源
    this.logger.log('Metrics service destroyed');
  }

  /**
   * 开始计时
   * @param key 计时器键
   */
  startTimer(key: string): void {
    this.timers.set(key, Date.now());
  }

  /**
   * 结束计时并记录指标
   * @param key 计时器键
   * @param type 指标类型
   * @param labels 标签
   * @returns 执行时间（毫秒）
   */
  endTimer(key: string, type: string, labels?: Record<string, string>): number {
    const startTime = this.timers.get(key);
    if (!startTime) {
      return 0;
    }

    this.timers.delete(key);
    const duration = Date.now() - startTime;

    this.recordMetric(type, duration, labels);
    return duration;
  }

  /**
   * 记录指标
   * @param type 指标类型
   * @param value 指标值
   * @param labels 标签
   */
  recordMetric(type: string, value: number, labels?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      type,
      value,
      labels,
    };

    // 添加到缓存
    this.metricsCache.push(metric);

    // 限制缓存大小
    if (this.metricsCache.length > this.MAX_CACHE_SIZE) {
      this.metricsCache.shift();
    }

    // 异步存储到Redis
    this.storeMetricToRedis(metric).catch(error => {
      this.logger.error('Failed to store metric to Redis:', error);
    });
  }

  /**
   * 存储指标到Redis
   * @param metric 指标
   */
  private async storeMetricToRedis(metric: PerformanceMetric): Promise<void> {
    try {
      const key = `${this.REDIS_KEY_PREFIX}${metric.type}:${Math.floor(metric.timestamp / 60000)}`; // 按分钟分组
      await this.redis.lpush(key, JSON.stringify(metric));
      // 设置过期时间为1小时
      await this.redis.expire(key, 3600);
    } catch (error) {
      this.logger.error('Failed to store metric to Redis:', error);
    }
  }

  /**
   * 获取指标
   * @param type 指标类型
   * @param minutes 时间范围（分钟）
   */
  async getMetrics(type: string, minutes: number = 5): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const now = Date.now();

    // 从内存缓存获取
    const recentMetrics = this.metricsCache.filter(
      metric => metric.type === type && metric.timestamp > now - minutes * 60000
    );
    metrics.push(...recentMetrics);

    // 从Redis获取
    try {
      const keys = [];
      for (let i = 0; i < minutes; i++) {
        const timestamp = Math.floor((now - i * 60000) / 60000);
        keys.push(`${this.REDIS_KEY_PREFIX}${type}:${timestamp}`);
      }

      for (const key of keys) {
        const values = await this.redis.lrange(key, 0, -1);
        for (const value of values) {
          try {
            const metric = JSON.parse(value) as PerformanceMetric;
            if (metric.timestamp > now - minutes * 60000) {
              metrics.push(metric);
            }
          } catch (error) {
            this.logger.error('Failed to parse metric from Redis:', error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to get metrics from Redis:', error);
    }

    // 按时间排序
    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取指标统计信息
   * @param type 指标类型
   * @param minutes 时间范围（分钟）
   */
  async getMetricStats(type: string, minutes: number = 5): Promise<{
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  }> {
    const metrics = await this.getMetrics(type, minutes);
    const values = metrics.map(m => m.value);

    if (values.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
      };
    }

    values.sort((a, b) => a - b);

    return {
      count: values.length,
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  /**
   * 清理过期指标
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupMetrics() {
    try {
      // 清理内存缓存
      const now = Date.now();
      this.metricsCache = this.metricsCache.filter(
        metric => metric.timestamp > now - 60 * 60000 // 保留1小时的指标
      );

      this.logger.debug(`Cleaned up metrics cache, remaining: ${this.metricsCache.length}`);
    } catch (error) {
      this.logger.error('Failed to cleanup metrics:', error);
    }
  }

  /**
   * 获取系统概览指标
   */
  async getSystemOverview(): Promise<Record<string, any>> {
    const now = Date.now();

    // 收集各种指标的统计信息
    const [
      apiResponseTime,
      dbQueryTime,
      redisOperationTime,
      websocketMessageTime,
    ] = await Promise.all([
      this.getMetricStats('api.response.time', 5),
      this.getMetricStats('db.query.time', 5),
      this.getMetricStats('redis.operation.time', 5),
      this.getMetricStats('websocket.message.time', 5),
    ]);

    return {
      timestamp: now,
      apiResponseTime,
      dbQueryTime,
      redisOperationTime,
      websocketMessageTime,
      metricsCacheSize: this.metricsCache.length,
    };
  }
}
