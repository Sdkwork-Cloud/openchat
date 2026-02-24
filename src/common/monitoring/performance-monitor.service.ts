/**
 * 增强型性能监控服务
 * 
 * 提供应用性能指标收集、慢查询检测、内存监控、CPU 监控等功能
 * 支持 Prometheus 指标导出和自定义指标
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { totalmem, freemem, cpus, uptime as systemUptime, loadavg } from 'os';
import { memoryUsage as processMemoryUsage } from 'process';

/**
 * 指标类型
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * 指标定义
 */
export interface MetricDefinition {
  /** 指标名称 */
  name: string;
  /** 指标类型 */
  type: MetricType;
  /** 指标描述 */
  description: string;
  /** 标签 */
  labels?: string[];
  /** 单位 */
  unit?: string;
}

/**
 * 指标值
 */
export interface MetricValue {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 时间戳 */
  timestamp: number;
  /** 标签 */
  labels?: Record<string, string>;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** CPU 使用率 */
  cpu: {
    usage: number;
    cores: number;
    load: number[];
    model: string;
    speed: number;
  };
  /** 内存使用 */
  memory: {
    total: number;
    free: number;
    used: number;
    percent: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  /** 系统信息 */
  system: {
    uptime: number;
    platform: string;
    arch: string;
    nodeVersion: string;
    pid: number;
  };
  /** 请求指标 */
  requests: {
    total: number;
    active: number;
    avgResponseTime: number;
    requestsPerSecond: number;
  };
  /** 数据库指标 */
  database: {
    connections: number;
    activeQueries: number;
    slowQueries: number;
    avgQueryTime: number;
  };
  /** 缓存指标 */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
}

/**
 * 请求跟踪信息
 */
export interface RequestTrace {
  /** 请求 ID */
  requestId: string;
  /** 请求方法 */
  method: string;
  /** 请求路径 */
  path: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 响应时间（毫秒） */
  duration?: number;
  /** 响应状态码 */
  statusCode?: number;
  /** 用户 ID */
  userId?: string;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/**
 * 慢查询信息
 */
export interface SlowQuery {
  /** 查询 SQL */
  sql: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** 时间戳 */
  timestamp: number;
  /** 参数 */
  parameters?: any[];
  /** 影响行数 */
  rowsAffected?: number;
}

/**
 * 性能告警选项
 */
export interface PerformanceAlertOptions {
  /** CPU 使用率阈值（百分比） */
  cpuThreshold?: number;
  /** 内存使用率阈值（百分比） */
  memoryThreshold?: number;
  /** 响应时间阈值（毫秒） */
  responseTimeThreshold?: number;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold?: number;
  /** 告警间隔（秒） */
  alertInterval?: number;
}

/**
 * 性能监控服务
 */
@Injectable()
export class PerformanceMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  
  private readonly metrics: Map<string, MetricValue> = new Map();
  private readonly requestTraces: RequestTrace[] = [];
  private readonly slowQueries: SlowQuery[] = [];
  private readonly customMetrics: Map<string, MetricDefinition> = new Map();
  
  private requestCount = 0;
  private totalResponseTime = 0;
  private activeRequests = 0;
  private queryCount = 0;
  private totalQueryTime = 0;
  
  private monitoringInterval?: NodeJS.Timeout;
  private alertInterval?: NodeJS.Timeout;
  
  private readonly options: Required<PerformanceAlertOptions>;
  private lastAlertTime = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.options = {
      cpuThreshold: this.configService.get<number>('PERFORMANCE_CPU_THRESHOLD', 80),
      memoryThreshold: this.configService.get<number>('PERFORMANCE_MEMORY_THRESHOLD', 85),
      responseTimeThreshold: this.configService.get<number>('PERFORMANCE_RESPONSE_TIME_THRESHOLD', 1000),
      slowQueryThreshold: this.configService.get<number>('PERFORMANCE_SLOW_QUERY_THRESHOLD', 1000),
      alertInterval: this.configService.get<number>('PERFORMANCE_ALERT_INTERVAL', 300),
    };
  }

  onModuleInit() {
    this.startMonitoring();
    this.setupEventListeners();
    this.logger.log('PerformanceMonitorService initialized');
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  /**
   * 开始请求跟踪
   */
  startRequestTrace(request: Partial<RequestTrace>): string {
    const requestId = request.requestId || this.generateRequestId();
    const trace: RequestTrace = {
      requestId,
      method: request.method || 'GET',
      path: request.path || '/',
      startTime: Date.now(),
      userId: request.userId,
      metadata: request.metadata,
    };
    
    this.requestTraces.push(trace);
    this.activeRequests++;
    this.requestCount++;
    
    return requestId;
  }

  /**
   * 结束请求跟踪
   */
  endRequestTrace(requestId: string, statusCode?: number, metadata?: Record<string, any>): RequestTrace | null {
    const trace = this.requestTraces.find(t => t.requestId === requestId);
    
    if (!trace) {
      return null;
    }
    
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.statusCode = statusCode;
    trace.metadata = { ...trace.metadata, ...metadata };
    
    this.activeRequests--;
    this.totalResponseTime += trace.duration;
    
    // 检查慢请求
    if (trace.duration > this.options.responseTimeThreshold) {
      this.emitAlert('slow_request', {
        requestId,
        path: trace.path,
        method: trace.method,
        duration: trace.duration,
        statusCode,
      });
    }
    
    // 清理旧的跟踪记录（保留最近 1000 条）
    if (this.requestTraces.length > 1000) {
      this.requestTraces.splice(0, this.requestTraces.length - 1000);
    }
    
    return trace;
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(query: SlowQuery): void {
    this.slowQueries.push(query);
    this.queryCount++;
    this.totalQueryTime += query.duration;
    
    // 清理旧的慢查询记录（保留最近 100 条）
    if (this.slowQueries.length > 100) {
      this.slowQueries.splice(0, this.slowQueries.length - 100);
    }
    
    this.emitAlert('slow_query', query);
  }

  /**
   * 记录查询
   */
  recordQuery(duration: number): void {
    this.queryCount++;
    this.totalQueryTime += duration;
    
    if (duration > this.options.slowQueryThreshold) {
      this.recordSlowQuery({
        sql: '',
        duration,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 注册自定义指标
   */
  registerMetric(definition: MetricDefinition): void {
    this.customMetrics.set(definition.name, definition);
    this.logger.debug(`Registered custom metric: ${definition.name}`);
  }

  /**
   * 设置指标值
   */
  setMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.set(name, {
      name,
      value,
      timestamp: Date.now(),
      labels,
    });
  }

  /**
   * 增加计数器
   */
  incrementMetric(name: string, delta: number = 1, labels?: Record<string, string>): void {
    const existing = this.metrics.get(name);
    const newValue = (existing?.value || 0) + delta;
    this.setMetric(name, newValue, labels);
  }

  /**
   * 获取指标值
   */
  getMetric(name: string): number | null {
    return this.metrics.get(name)?.value || null;
  }

  /**
   * 获取所有性能指标
   */
  getMetrics(): PerformanceMetrics {
    const memUsage = processMemoryUsage();
    const cpuInfo = cpus();
    const load = loadavg();

    return {
      cpu: {
        usage: this.calculateCpuUsage(cpuInfo),
        cores: cpuInfo.length,
        load: load,
        model: cpuInfo[0].model,
        speed: cpuInfo[0].speed,
      },
      memory: {
        total: totalmem(),
        free: freemem(),
        used: totalmem() - freemem(),
        percent: ((totalmem() - freemem()) / totalmem()) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      system: {
        uptime: systemUptime(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
      },
      requests: {
        total: this.requestCount,
        active: this.activeRequests,
        avgResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
        requestsPerSecond: this.requestCount / Math.max(1, systemUptime()),
      },
      database: {
        connections: 0,
        activeQueries: 0,
        slowQueries: this.slowQueries.length,
        avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
      },
    };
  }

  /**
   * 获取最近的请求跟踪
   */
  getRecentTraces(limit: number = 100): RequestTrace[] {
    return this.requestTraces
      .filter(t => t.endTime !== undefined)
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, limit);
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit: number = 50): SlowQuery[] {
    return this.slowQueries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 导出 Prometheus 格式指标
   */
  exportPrometheus(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];
    const timestamp = Date.now();
    
    // CPU 指标
    lines.push('# HELP node_cpu_usage_percent CPU usage percentage');
    lines.push('# TYPE node_cpu_usage_percent gauge');
    lines.push(`node_cpu_usage_percent ${metrics.cpu.usage.toFixed(2)}`);
    
    lines.push('# HELP node_cpu_load_avg_1m CPU load average (1m)');
    lines.push('# TYPE node_cpu_load_avg_1m gauge');
    lines.push(`node_cpu_load_avg_1m ${metrics.cpu.load[0].toFixed(2)}`);
    
    // 内存指标
    lines.push('# HELP node_memory_usage_bytes Memory usage in bytes');
    lines.push('# TYPE node_memory_usage_bytes gauge');
    lines.push(`node_memory_usage_bytes ${metrics.memory.used}`);
    
    lines.push('# HELP node_memory_usage_percent Memory usage percentage');
    lines.push('# TYPE node_memory_usage_percent gauge');
    lines.push(`node_memory_usage_percent ${metrics.memory.percent.toFixed(2)}`);
    
    lines.push('# HELP node_heap_used_bytes Heap used in bytes');
    lines.push('# TYPE node_heap_used_bytes gauge');
    lines.push(`node_heap_used_bytes ${metrics.memory.heapUsed}`);
    
    // 请求指标
    lines.push('# HELP app_requests_total Total number of requests');
    lines.push('# TYPE app_requests_total counter');
    lines.push(`app_requests_total ${metrics.requests.total}`);
    
    lines.push('# HELP app_requests_active Active requests');
    lines.push('# TYPE app_requests_active gauge');
    lines.push(`app_requests_active ${metrics.requests.active}`);
    
    lines.push('# HELP app_response_time_avg_ms Average response time in ms');
    lines.push('# TYPE app_response_time_avg_ms gauge');
    lines.push(`app_response_time_avg_ms ${metrics.requests.avgResponseTime.toFixed(2)}`);
    
    // 数据库指标
    lines.push('# HELP app_slow_queries_total Total number of slow queries');
    lines.push('# TYPE app_slow_queries_total counter');
    lines.push(`app_slow_queries_total ${metrics.database.slowQueries}`);
    
    lines.push('# HELP app_query_time_avg_ms Average query time in ms');
    lines.push('# TYPE app_query_time_avg_ms gauge');
    lines.push(`app_query_time_avg_ms ${metrics.database.avgQueryTime.toFixed(2)}`);
    
    // 自定义指标
    for (const [name, value] of this.metrics.entries()) {
      const definition = this.customMetrics.get(name);
      if (definition) {
        lines.push(`# HELP ${name} ${definition.description}`);
        lines.push(`# TYPE ${name} ${definition.type}`);
        
        const labelStr = value.labels 
          ? `{${Object.entries(value.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
          : '';
        lines.push(`${name}${labelStr} ${value.value}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.requestCount = 0;
    this.totalResponseTime = 0;
    this.queryCount = 0;
    this.totalQueryTime = 0;
    this.slowQueries.length = 0;
    this.requestTraces.length = 0;
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    const interval = this.configService.get<number>('PERFORMANCE_MONITOR_INTERVAL', 60000);
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, interval);
  }

  /**
   * 停止监控
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    this.eventEmitter.on('request.completed', (trace: RequestTrace) => {
      if (trace.duration) {
        this.endRequestTrace(trace.requestId, trace.statusCode);
      }
    });
  }

  /**
   * 收集指标
   */
  private collectMetrics(): void {
    const metrics = this.getMetrics();
    
    this.logger.debug(
      `Performance metrics - CPU: ${metrics.cpu.usage.toFixed(1)}%, ` +
      `Memory: ${metrics.memory.percent.toFixed(1)}%, ` +
      `Requests: ${metrics.requests.total}, ` +
      `Avg Response: ${metrics.requests.avgResponseTime.toFixed(0)}ms`,
    );
  }

  /**
   * 检查阈值
   */
  private checkThresholds(): void {
    const metrics = this.getMetrics();
    const now = Date.now();
    
    // 防止告警过于频繁
    if (now - this.lastAlertTime < this.options.alertInterval * 1000) {
      return;
    }
    
    // 检查 CPU
    if (metrics.cpu.usage > this.options.cpuThreshold) {
      this.emitAlert('high_cpu', {
        usage: metrics.cpu.usage,
        threshold: this.options.cpuThreshold,
      });
      this.lastAlertTime = now;
    }
    
    // 检查内存
    if (metrics.memory.percent > this.options.memoryThreshold) {
      this.emitAlert('high_memory', {
        usage: metrics.memory.percent,
        threshold: this.options.memoryThreshold,
      });
      this.lastAlertTime = now;
    }
  }

  /**
   * 发射告警事件
   */
  private emitAlert(type: string, data: Record<string, any>): void {
    this.eventEmitter.emit('performance.alert', {
      type,
      data,
      timestamp: Date.now(),
    });
    
    this.logger.warn(`Performance alert: ${type}`, JSON.stringify(data));
  }

  /**
   * 计算 CPU 使用率
   */
  private calculateCpuUsage(cpuInfo: any[]): number {
    let idle = 0;
    let total = 0;

    for (const cpu of cpuInfo) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }

    return ((total - idle) / total) * 100;
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 性能监控装饰器
 */
export function MonitorPerformance(options?: { name?: string; logSlow?: boolean }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const methodName = options?.name || propertyKey;
    
    descriptor.value = async function (...args: any[]) {
      const monitorService = (this as any).performanceMonitor as PerformanceMonitorService;
      
      if (!monitorService) {
        return originalMethod.apply(this, args);
      }
      
      const requestId = monitorService.startRequestTrace({
        method: 'EXECUTE',
        path: methodName,
      });
      
      try {
        const result = await originalMethod.apply(this, args);
        monitorService.endRequestTrace(requestId, 200);
        return result;
      } catch (error) {
        monitorService.endRequestTrace(requestId, 500);
        throw error;
      }
    };
    
    return descriptor;
  };
}
