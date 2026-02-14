import { Injectable, Logger } from '@nestjs/common';

type MetricLabels = Record<string, string>;

interface CounterInterface {
  inc(labels?: MetricLabels, value?: number): void;
}

interface GaugeInterface {
  set(labels: MetricLabels, value: number): void;
  set(value: number): void;
}

interface HistogramInterface {
  observe(labels: MetricLabels, value: number): void;
  observe(value: number): void;
}

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);
  private enabled = false;

  private counters: Map<string, CounterInterface> = new Map();
  private gauges: Map<string, GaugeInterface> = new Map();
  private histograms: Map<string, HistogramInterface> = new Map();

  constructor() {
    try {
      const promClient = require('prom-client');
      this.enabled = true;

      const Registry = promClient.Registry;
      const Counter = promClient.Counter;
      const Gauge = promClient.Gauge;
      const Histogram = promClient.Histogram;
      const collectDefaultMetrics = promClient.collectDefaultMetrics;

      this.registry = new Registry();
      collectDefaultMetrics({ register: this.registry });

      this.counters.set('http_requests_total', new Counter({
        name: 'http_requests_total',
        help: 'Total HTTP requests',
        labelNames: ['method', 'path', 'status'],
        registers: [this.registry],
      }));

      this.counters.set('messages_sent_total', new Counter({
        name: 'messages_sent_total',
        help: 'Total messages sent',
        labelNames: ['type', 'status'],
        registers: [this.registry],
      }));

      this.counters.set('cache_hits_total', new Counter({
        name: 'cache_hits_total',
        help: 'Total cache hits',
        labelNames: ['cache_type'],
        registers: [this.registry],
      }));

      this.counters.set('cache_misses_total', new Counter({
        name: 'cache_misses_total',
        help: 'Total cache misses',
        labelNames: ['cache_type'],
        registers: [this.registry],
      }));

      this.gauges.set('websocket_connections_current', new Gauge({
        name: 'websocket_connections_current',
        help: 'Current WebSocket connections',
        registers: [this.registry],
      }));

      this.gauges.set('users_online_current', new Gauge({
        name: 'users_online_current',
        help: 'Current online users count',
        registers: [this.registry],
      }));

      this.gauges.set('db_pool_size', new Gauge({
        name: 'db_pool_size',
        help: 'Database connection pool size',
        labelNames: ['state'],
        registers: [this.registry],
      }));

      this.histograms.set('http_request_duration_seconds', new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'path'],
        buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10],
        registers: [this.registry],
      }));

      this.histograms.set('messages_sent_duration_seconds', new Histogram({
        name: 'messages_sent_duration_seconds',
        help: 'Message sending duration in seconds',
        labelNames: ['type'],
        buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3],
        registers: [this.registry],
      }));

      this.histograms.set('db_query_duration_seconds', new Histogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['query_type', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 3],
        registers: [this.registry],
      }));

      this.histograms.set('redis_operation_duration_seconds', new Histogram({
        name: 'redis_operation_duration_seconds',
        help: 'Redis operation duration in seconds',
        labelNames: ['operation'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
        registers: [this.registry],
      }));

      this.logger.log('Prometheus metrics service initialized');
    } catch (error) {
      this.logger.warn('prom-client not installed, metrics collection disabled');
      this.enabled = false;
    }
  }

  private registry: any;

  async getMetrics(): Promise<string> {
    if (!this.enabled || !this.registry) {
      return '# prom-client not available\n';
    }
    return this.registry.metrics();
  }

  getContentType(): string {
    if (!this.enabled || !this.registry) {
      return 'text/plain';
    }
    return this.registry.contentType;
  }

  incrementHttpRequests(method: string, path: string, status: number): void {
    if (!this.enabled) return;
    const counter = this.counters.get('http_requests_total');
    counter?.inc({ method, path, status: status.toString() });
  }

  observeHttpRequestDuration(method: string, path: string, duration: number): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('http_request_duration_seconds');
    histogram?.observe({ method, path }, duration);
  }

  setWebsocketConnections(count: number): void {
    if (!this.enabled) return;
    const gauge = this.gauges.get('websocket_connections_current');
    gauge?.set(count);
  }

  setOnlineUsers(count: number): void {
    if (!this.enabled) return;
    const gauge = this.gauges.get('users_online_current');
    gauge?.set(count);
  }

  incrementMessagesSent(type: string, status: string): void {
    if (!this.enabled) return;
    const counter = this.counters.get('messages_sent_total');
    counter?.inc({ type, status });
  }

  observeMessageSentDuration(type: string, duration: number): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('messages_sent_duration_seconds');
    histogram?.observe({ type }, duration);
  }

  observeDbQuery(queryType: string, table: string, duration: number): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('db_query_duration_seconds');
    histogram?.observe({ query_type: queryType, table }, duration);
  }

  setDbPoolSize(used: number, idle: number, waiting: number): void {
    if (!this.enabled) return;
    const gauge = this.gauges.get('db_pool_size');
    gauge?.set({ state: 'used' }, used);
    gauge?.set({ state: 'idle' }, idle);
    gauge?.set({ state: 'waiting' }, waiting);
  }

  incrementCacheHits(cacheType: string): void {
    if (!this.enabled) return;
    const counter = this.counters.get('cache_hits_total');
    counter?.inc({ cache_type: cacheType });
  }

  incrementCacheMisses(cacheType: string): void {
    if (!this.enabled) return;
    const counter = this.counters.get('cache_misses_total');
    counter?.inc({ cache_type: cacheType });
  }

  observeRedisOperation(operation: string, duration: number): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('redis_operation_duration_seconds');
    histogram?.observe({ operation }, duration);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
