/**
 * 性能优化工具
 * 提供性能监控、优化建议、慢查询检测等功能
 *
 * @framework
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 平均响应时间（毫秒） */
  avgResponseTime: number;
  /** 最大响应时间（毫秒） */
  maxResponseTime: number;
  /** 最小响应时间（毫秒） */
  minResponseTime: number;
  /** P95 响应时间（毫秒） */
  p95ResponseTime: number;
  /** P99 响应时间（毫秒） */
  p99ResponseTime: number;
  /** 请求总数 */
  totalRequests: number;
  /** 慢请求数量 */
  slowRequests: number;
  /** 错误请求数量 */
  errorRequests: number;
  /** 成功率 */
  successRate: number;
  /** QPS（每秒请求数） */
  qps: number;
}

/**
 * 性能记录
 */
export interface PerformanceRecord {
  /** 路径 */
  path: string;
  /** 方法 */
  method: string;
  /** 响应时间（毫秒） */
  duration: number;
  /** 状态码 */
  statusCode: number;
  /** 时间戳 */
  timestamp: number;
  /** 用户 ID */
  userId?: string;
  /** IP 地址 */
  ip?: string;
}

/**
 * 慢查询记录
 */
export interface SlowQueryRecord {
  /** 查询 SQL */
  query: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** 参数 */
  parameters?: any[];
  /** 时间戳 */
  timestamp: number;
  /** 调用栈 */
  stack?: string;
}

/**
 * 性能警告
 */
export interface PerformanceWarning {
  /** 警告级别 */
  level: 'info' | 'warning' | 'error';
  /** 警告类型 */
  type: string;
  /** 警告消息 */
  message: string;
  /** 建议 */
  suggestion: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 性能优化器配置
 */
export interface PerformanceOptimizerOptions {
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold?: number;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold?: number;
  /** 最大记录数 */
  maxRecords?: number;
  /** 是否启用警告 */
  enableWarnings?: boolean;
  /** 警告阈值（毫秒） */
  warningThreshold?: number;
}

/**
 * 性能优化器
 */
@Injectable()
export class PerformanceOptimizer {
  private readonly logger = new Logger(PerformanceOptimizer.name);
  private readonly records: PerformanceRecord[] = [];
  private readonly slowQueries: SlowQueryRecord[] = [];
  private readonly warnings: PerformanceWarning[] = [];
  private readonly options: Required<PerformanceOptimizerOptions>;

  constructor(options: PerformanceOptimizerOptions = {}) {
    this.options = {
      slowRequestThreshold: options.slowRequestThreshold ?? 1000,
      slowQueryThreshold: options.slowQueryThreshold ?? 1000,
      maxRecords: options.maxRecords ?? 10000,
      enableWarnings: options.enableWarnings ?? true,
      warningThreshold: options.warningThreshold ?? 5000,
    };
  }

  /**
   * 记录请求性能
   */
  recordRequest(record: Omit<PerformanceRecord, 'timestamp'>): void {
    const fullRecord: PerformanceRecord = {
      ...record,
      timestamp: Date.now(),
    };

    this.records.push(fullRecord);

    // 限制记录数量
    if (this.records.length > this.options.maxRecords) {
      this.records.shift();
    }

    // 检查慢请求
    if (record.duration > this.options.slowRequestThreshold) {
      this.logSlowRequest(record as PerformanceRecord);
    }

    // 检查警告
    if (this.options.enableWarnings && record.duration > this.options.warningThreshold) {
      this.addWarning({
        level: record.duration > this.options.warningThreshold * 2 ? 'error' : 'warning',
        type: 'SLOW_REQUEST',
        message: `Slow request detected: ${record.method} ${record.path} took ${record.duration}ms`,
        suggestion: this.getSuggestion('SLOW_REQUEST', record as PerformanceRecord),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(record: Omit<SlowQueryRecord, 'timestamp'>): void {
    const fullRecord: SlowQueryRecord = {
      ...record,
      timestamp: Date.now() as number,
    };

    this.slowQueries.push(fullRecord);

    // 限制记录数量
    if (this.slowQueries.length > 1000) {
      this.slowQueries.shift();
    }

    this.logger.warn(
      `Slow query detected: ${record.duration}ms - ${record.query.substring(0, 200)}`,
    );

    // 添加警告
    if (this.options.enableWarnings) {
      this.addWarning({
        level: record.duration > this.options.slowQueryThreshold * 5 ? 'error' : 'warning',
        type: 'SLOW_QUERY',
        message: `Slow query: ${record.duration}ms`,
        suggestion: 'Consider adding indexes or optimizing the query',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(timeRange?: { start?: number; end?: number }): PerformanceMetrics {
    let filteredRecords = this.records;

    if (timeRange) {
      const start = timeRange.start ?? Date.now() - 3600000; // 默认 1 小时
      const end = timeRange.end ?? Date.now();
      filteredRecords = this.records.filter(
        r => r.timestamp >= start && r.timestamp <= end,
      );
    }

    if (filteredRecords.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalRequests: 0,
        slowRequests: 0,
        errorRequests: 0,
        successRate: 0,
        qps: 0,
      };
    }

    const durations = filteredRecords.map(r => r.duration).sort((a, b) => a - b);
    const total = filteredRecords.length;
    const slowRequests = filteredRecords.filter(
      r => r.duration > this.options.slowRequestThreshold,
    ).length;
    const errorRequests = filteredRecords.filter(r => r.statusCode >= 400).length;

    return {
      avgResponseTime: this.calculateAverage(durations),
      maxResponseTime: Math.max(...durations),
      minResponseTime: Math.min(...durations),
      p95ResponseTime: this.calculatePercentile(durations, 95),
      p99ResponseTime: this.calculatePercentile(durations, 99),
      totalRequests: total,
      slowRequests,
      errorRequests,
      successRate: ((total - errorRequests) / total) * 100,
      qps: this.calculateQPS(filteredRecords),
    };
  }

  /**
   * 获取慢请求 Top N
   */
  getSlowRequestsTopN(n: number = 10): PerformanceRecord[] {
    return [...this.records]
      .filter(r => r.duration > this.options.slowRequestThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, n);
  }

  /**
   * 获取慢查询 Top N
   */
  getSlowQueriesTopN(n: number = 10): SlowQueryRecord[] {
    return [...this.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, n);
  }

  /**
   * 获取性能警告
   */
  getWarnings(limit: number = 50): PerformanceWarning[] {
    return [...this.warnings]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 获取路径性能统计
   */
  getPathStats(path: string): PerformanceMetrics {
    const pathRecords = this.records.filter(r => r.path === path);
    return this.calculateMetricsFromRecords(pathRecords);
  }

  /**
   * 获取所有路径性能统计
   */
  getAllPathStats(): Map<string, PerformanceMetrics> {
    const stats = new Map<string, PerformanceMetrics>();
    const pathGroups = new Map<string, PerformanceRecord[]>();

    for (const record of this.records) {
      const records = pathGroups.get(record.path) || [];
      records.push(record);
      pathGroups.set(record.path, records);
    }

    for (const [path, records] of pathGroups.entries()) {
      stats.set(path, this.calculateMetricsFromRecords(records));
    }

    return stats;
  }

  /**
   * 清除记录
   */
  clear(): void {
    this.records.length = 0;
    this.slowQueries.length = 0;
    this.warnings.length = 0;
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low' }> {
    const suggestions: Array<{ type: string; message: string; priority: 'high' | 'medium' | 'low' }> = [];
    const metrics = this.getMetrics();

    // 检查平均响应时间
    if (metrics.avgResponseTime > 500) {
      suggestions.push({
        type: 'HIGH_AVG_RESPONSE_TIME',
        message: `Average response time is ${metrics.avgResponseTime.toFixed(0)}ms`,
        priority: metrics.avgResponseTime > 1000 ? 'high' : 'medium',
      });
    }

    // 检查慢请求比例
    const slowRate = (metrics.slowRequests / metrics.totalRequests) * 100;
    if (slowRate > 10) {
      suggestions.push({
        type: 'HIGH_SLOW_REQUEST_RATE',
        message: `${slowRate.toFixed(1)}% of requests are slow`,
        priority: slowRate > 20 ? 'high' : 'medium',
      });
    }

    // 检查错误率
    const errorRate = ((metrics.errorRequests / metrics.totalRequests) * 100);
    if (errorRate > 1) {
      suggestions.push({
        type: 'HIGH_ERROR_RATE',
        message: `Error rate is ${errorRate.toFixed(2)}%`,
        priority: errorRate > 5 ? 'high' : 'medium',
      });
    }

    // 检查慢查询
    if (this.slowQueries.length > 100) {
      suggestions.push({
        type: 'MANY_SLOW_QUERIES',
        message: `${this.slowQueries.length} slow queries detected`,
        priority: 'high',
      });
    }

    return suggestions;
  }

  /**
   * 记录慢请求
   */
  private logSlowRequest(record: PerformanceRecord): void {
    this.logger.warn(
      `Slow request: ${record.method} ${record.path} - ${record.duration}ms`,
    );
  }

  /**
   * 添加警告
   */
  private addWarning(warning: PerformanceWarning): void {
    this.warnings.push(warning);

    // 限制警告数量
    if (this.warnings.length > 1000) {
      this.warnings.shift();
    }
  }

  /**
   * 获取建议
   */
  private getSuggestion(type: string, record: PerformanceRecord): string {
    const suggestions: Record<string, string> = {
      SLOW_REQUEST: 'Consider adding caching, optimizing database queries, or scaling resources',
      SLOW_QUERY: 'Consider adding indexes, optimizing joins, or caching results',
      HIGH_MEMORY: 'Consider optimizing memory usage or increasing resources',
      HIGH_CPU: 'Consider optimizing algorithms or scaling horizontally',
    };

    return suggestions[type] || 'Review and optimize the operation';
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index] || 0;
  }

  /**
   * 计算 QPS
   */
  private calculateQPS(records: PerformanceRecord[]): number {
    if (records.length === 0) return 0;

    const timeRange = records[records.length - 1].timestamp - records[0].timestamp;
    if (timeRange === 0) return records.length;

    return (records.length / timeRange) * 1000;
  }

  /**
   * 从记录计算指标
   */
  private calculateMetricsFromRecords(records: PerformanceRecord[]): PerformanceMetrics {
    if (records.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalRequests: 0,
        slowRequests: 0,
        errorRequests: 0,
        successRate: 0,
        qps: 0,
      };
    }

    const durations = records.map(r => r.duration).sort((a, b) => a - b);
    const total = records.length;
    const slowRequests = records.filter(r => r.duration > this.options.slowRequestThreshold).length;
    const errorRequests = records.filter(r => r.statusCode >= 400).length;

    return {
      avgResponseTime: this.calculateAverage(durations),
      maxResponseTime: Math.max(...durations),
      minResponseTime: Math.min(...durations),
      p95ResponseTime: this.calculatePercentile(durations, 95),
      p99ResponseTime: this.calculatePercentile(durations, 99),
      totalRequests: total,
      slowRequests,
      errorRequests,
      successRate: ((total - errorRequests) / total) * 100,
      qps: this.calculateQPS(records),
    };
  }
}

/**
 * 性能监控装饰器工厂
 */
export function createPerformanceMonitor(
  optimizer: PerformanceOptimizer,
  options: { pathExtractor?: (args: any[]) => string } = {},
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const path = options.pathExtractor?.(args) || `${target.constructor.name}.${propertyKey}`;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        optimizer.recordRequest({
          path,
          method: 'CALL',
          duration,
          statusCode: 200,
        });

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;

        optimizer.recordRequest({
          path,
          method: 'CALL',
          duration,
          statusCode: error.status || 500,
        });

        throw error;
      }
    };

    return descriptor;
  };
}
