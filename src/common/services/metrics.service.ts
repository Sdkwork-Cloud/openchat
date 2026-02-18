import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

export interface MetricConfig {
  name: string;
  type: MetricType;
  description?: string;
  tags?: Record<string, string>;
  buckets?: number[];
  unit?: string;
}

export interface MetricAggregation {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricQuery {
  name: string;
  tags?: Record<string, string>;
  startTime?: number;
  endTime?: number;
  aggregation?: 'none' | 'sum' | 'avg' | 'min' | 'max';
  interval?: number;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics = new Map<string, MetricConfig>();
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  private readonly timers = new Map<string, number[]>();
  private flushInterval?: NodeJS.Timeout;
  private readonly buffer: Metric[] = [];
  private readonly bufferSize: number;
  private readonly flushIntervalMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.bufferSize = this.configService.get<number>('METRICS_BUFFER_SIZE', 1000);
    this.flushIntervalMs = this.configService.get<number>('METRICS_FLUSH_INTERVAL', 10000);
  }

  onModuleInit() {
    this.registerDefaultMetrics();
    this.startFlushInterval();
    this.logger.log('MetricsService initialized');
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  register(config: MetricConfig): void {
    this.metrics.set(config.name, config);

    if (config.type === 'histogram' && config.buckets) {
      this.histograms.set(config.name, []);
    }

    this.logger.debug(`Metric registered: ${config.name}`);
  }

  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.buffer.push({
      name,
      type: 'counter',
      value: current + value,
      tags: tags || {},
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    this.gauges.set(key, value);

    this.buffer.push({
      name,
      type: 'gauge',
      value,
      tags: tags || {},
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  observe(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.buffer.push({
      name,
      type: 'histogram',
      value,
      tags: tags || {},
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  startTimer(name: string, tags?: Record<string, string>): () => number {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.timing(name, duration, tags);
      return duration;
    };
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = this.timers.get(key) || [];
    values.push(durationMs);
    this.timers.set(key, values);

    this.buffer.push({
      name,
      type: 'timer',
      value: durationMs,
      tags: tags || {},
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  async getMetric(name: string, tags?: Record<string, string>): Promise<number | undefined> {
    const config = this.metrics.get(name);
    if (!config) return undefined;

    const key = this.buildKey(name, tags);

    switch (config.type) {
      case 'counter':
        return this.counters.get(key);
      case 'gauge':
        return this.gauges.get(key);
      case 'histogram':
      case 'timer':
        const values = (config.type === 'histogram' ? this.histograms : this.timers).get(key);
        if (!values || values.length === 0) return undefined;
        return values[values.length - 1];
      default:
        return undefined;
    }
  }

  async getAggregation(name: string, tags?: Record<string, string>): Promise<MetricAggregation | undefined> {
    const config = this.metrics.get(name);
    if (!config || (config.type !== 'histogram' && config.type !== 'timer')) {
      return undefined;
    }

    const key = this.buildKey(name, tags);
    const values = (config.type === 'histogram' ? this.histograms : this.timers).get(key);

    if (!values || values.length === 0) {
      return undefined;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      sum,
      count: values.length,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  async query(query: MetricQuery): Promise<Metric[]> {
    const results: Metric[] = [];
    const pattern = buildCacheKey('metrics', query.name);

    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`${pattern}*`);

      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const metric = JSON.parse(data) as Metric;

          if (query.tags) {
            const tagsMatch = Object.entries(query.tags).every(
              ([k, v]) => metric.tags[k] === v,
            );
            if (!tagsMatch) continue;
          }

          if (query.startTime && metric.timestamp < query.startTime) continue;
          if (query.endTime && metric.timestamp > query.endTime) continue;

          results.push(metric);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to query metrics: ${error}`);
    }

    return results;
  }

  getAllMetrics(): Array<{ name: string; type: MetricType; config: MetricConfig }> {
    return Array.from(this.metrics.entries()).map(([name, config]) => ({
      name,
      type: config.type,
      config,
    }));
  }

  reset(name: string, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const config = this.metrics.get(name);

    if (!config) return;

    switch (config.type) {
      case 'counter':
        this.counters.set(key, 0);
        break;
      case 'gauge':
        this.gauges.delete(key);
        break;
      case 'histogram':
        this.histograms.set(key, []);
        break;
      case 'timer':
        this.timers.set(key, []);
        break;
    }
  }

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}:{${tagStr}}`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private checkFlush(): void {
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer.length = 0;

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      for (const metric of metrics) {
        const key = buildCacheKey(
          'metrics',
          metric.name,
          Date.now().toString(),
        );
        pipeline.setex(key, 86400, JSON.stringify(metric));
      }

      await pipeline.exec();
      this.logger.debug(`Flushed ${metrics.length} metrics`);
    } catch (error) {
      this.logger.error(`Failed to flush metrics: ${error}`);
      this.buffer.unshift(...metrics);
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        this.logger.error('Failed to flush metrics:', err);
      });
    }, this.flushIntervalMs);
  }

  private registerDefaultMetrics(): void {
    this.register({
      name: 'http_requests_total',
      type: 'counter',
      description: 'Total number of HTTP requests',
    });

    this.register({
      name: 'http_request_duration_ms',
      type: 'histogram',
      description: 'HTTP request duration in milliseconds',
      buckets: [10, 50, 100, 500, 1000, 5000],
    });

    this.register({
      name: 'db_query_duration_ms',
      type: 'histogram',
      description: 'Database query duration in milliseconds',
    });

    this.register({
      name: 'cache_hits_total',
      type: 'counter',
      description: 'Total number of cache hits',
    });

    this.register({
      name: 'cache_misses_total',
      type: 'counter',
      description: 'Total number of cache misses',
    });

    this.register({
      name: 'websocket_connections',
      type: 'gauge',
      description: 'Number of active WebSocket connections',
    });

    this.register({
      name: 'messages_sent_total',
      type: 'counter',
      description: 'Total number of messages sent',
    });

    this.register({
      name: 'message_delivery_duration_ms',
      type: 'timer',
      description: 'Message delivery duration in milliseconds',
    });
  }
}

export function Timed(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const metricsService = (this as any).metricsService as MetricsService;

      if (!metricsService) {
        return originalMethod.apply(this, args);
      }

      const stopTimer = metricsService.startTimer(name);
      try {
        return await originalMethod.apply(this, args);
      } finally {
        stopTimer();
      }
    };

    return descriptor;
  };
}

export function Counted(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}.calls`;

    descriptor.value = async function (...args: any[]) {
      const metricsService = (this as any).metricsService as MetricsService;

      if (metricsService) {
        metricsService.increment(name);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
