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

      this.counters.set('rtc_provider_operations_total', new Counter({
        name: 'rtc_provider_operations_total',
        help: 'Total RTC provider operations',
        labelNames: ['provider', 'operation', 'status', 'retryable'],
        registers: [this.registry],
      }));

      this.counters.set('rtc_control_plane_signals_total', new Counter({
        name: 'rtc_control_plane_signals_total',
        help: 'RTC control-plane reliability signal counters',
        labelNames: ['provider', 'operation', 'signal'],
        registers: [this.registry],
      }));

      this.counters.set('ws_validation_failures_total', new Counter({
        name: 'ws_validation_failures_total',
        help: 'WebSocket payload validation failures',
        labelNames: ['layer', 'domain', 'error_code'],
        registers: [this.registry],
      }));

      this.counters.set('ws_presence_acl_cache_access_total', new Counter({
        name: 'ws_presence_acl_cache_access_total',
        help: 'WebSocket presence ACL cache access results',
        labelNames: ['result'],
        registers: [this.registry],
      }));

      this.counters.set('ws_presence_acl_cache_invalidations_total', new Counter({
        name: 'ws_presence_acl_cache_invalidations_total',
        help: 'WebSocket presence ACL cache invalidation events',
        labelNames: ['trigger'],
        registers: [this.registry],
      }));

      this.counters.set('message_seq_gap_scan_total', new Counter({
        name: 'message_seq_gap_scan_total',
        help: 'Message sequence gap scan attempts',
        labelNames: ['conversation_type', 'status'],
        registers: [this.registry],
      }));

      this.counters.set('message_seq_gap_truncated_total', new Counter({
        name: 'message_seq_gap_truncated_total',
        help: 'Message sequence gap scans truncated by window limit',
        labelNames: ['conversation_type'],
        registers: [this.registry],
      }));

      this.counters.set('message_seq_ack_total', new Counter({
        name: 'message_seq_ack_total',
        help: 'Conversation sequence ACK outcomes',
        labelNames: ['conversation_type', 'sync_scope', 'status', 'caught_up'],
        registers: [this.registry],
      }));

      this.counters.set('message_seq_ack_batch_total', new Counter({
        name: 'message_seq_ack_batch_total',
        help: 'Conversation sequence ACK batch outcomes',
        labelNames: ['sync_scope', 'status'],
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

      this.gauges.set('ws_presence_acl_cache_entries_current', new Gauge({
        name: 'ws_presence_acl_cache_entries_current',
        help: 'Current WebSocket presence ACL cache entry count',
        registers: [this.registry],
      }));

      this.gauges.set('db_pool_size', new Gauge({
        name: 'db_pool_size',
        help: 'Database connection pool size',
        labelNames: ['state'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_health_status', new Gauge({
        name: 'rtc_provider_health_status',
        help: 'RTC provider health status one-hot gauge',
        labelNames: ['provider', 'status'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_failure_rate', new Gauge({
        name: 'rtc_provider_failure_rate',
        help: 'RTC provider failure rate in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_avg_duration_ms', new Gauge({
        name: 'rtc_provider_avg_duration_ms',
        help: 'RTC provider average duration in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_total_samples', new Gauge({
        name: 'rtc_provider_total_samples',
        help: 'RTC provider sample count in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_control_plane_retry_rate', new Gauge({
        name: 'rtc_provider_control_plane_retry_rate',
        help: 'RTC provider control-plane retry ratio in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_control_plane_circuit_open_rate', new Gauge({
        name: 'rtc_provider_control_plane_circuit_open_rate',
        help: 'RTC provider control-plane circuit-open ratio in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_control_plane_invocations', new Gauge({
        name: 'rtc_provider_control_plane_invocations',
        help: 'RTC provider control-plane invocation count in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_control_plane_retries', new Gauge({
        name: 'rtc_provider_control_plane_retries',
        help: 'RTC provider control-plane retry count in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_control_plane_circuit_open_short_circuits', new Gauge({
        name: 'rtc_provider_control_plane_circuit_open_short_circuits',
        help: 'RTC provider control-plane circuit-open short-circuit count in latest health report window',
        labelNames: ['provider'],
        registers: [this.registry],
      }));

      this.gauges.set('rtc_provider_control_plane_unsafe_idempotency_calls', new Gauge({
        name: 'rtc_provider_control_plane_unsafe_idempotency_calls',
        help: 'RTC provider control-plane unsafe idempotency-protected calls in latest health report window',
        labelNames: ['provider'],
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

      this.histograms.set('rtc_provider_operation_duration_seconds', new Histogram({
        name: 'rtc_provider_operation_duration_seconds',
        help: 'RTC provider operation duration in seconds',
        labelNames: ['provider', 'operation', 'status'],
        buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
        registers: [this.registry],
      }));

      this.histograms.set('message_seq_gap_scan_duration_seconds', new Histogram({
        name: 'message_seq_gap_scan_duration_seconds',
        help: 'Message sequence gap scan duration in seconds',
        labelNames: ['conversation_type', 'status'],
        buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
        registers: [this.registry],
      }));

      this.histograms.set('message_seq_ack_pending_seq', new Histogram({
        name: 'message_seq_ack_pending_seq',
        help: 'Pending sequence count observed after conversation ACK',
        labelNames: ['conversation_type', 'sync_scope'],
        buckets: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
        registers: [this.registry],
      }));

      this.histograms.set('message_seq_ack_duration_seconds', new Histogram({
        name: 'message_seq_ack_duration_seconds',
        help: 'Conversation sequence ACK duration in seconds',
        labelNames: ['conversation_type', 'sync_scope', 'status'],
        buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
        registers: [this.registry],
      }));

      this.histograms.set('message_seq_ack_batch_duration_seconds', new Histogram({
        name: 'message_seq_ack_batch_duration_seconds',
        help: 'Conversation sequence ACK batch duration in seconds',
        labelNames: ['sync_scope', 'status'],
        buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
        registers: [this.registry],
      }));

      this.histograms.set('message_seq_ack_batch_failed_items', new Histogram({
        name: 'message_seq_ack_batch_failed_items',
        help: 'Failed item count observed in ACK batch',
        labelNames: ['sync_scope'],
        buckets: [1, 2, 5, 10, 20, 50, 100, 200],
        registers: [this.registry],
      }));

      this.logger.log('Prometheus metrics service initialized');
    } catch {
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

  incrementWsValidationFailure(layer: string, domain: string, errorCode: string): void {
    if (!this.enabled) return;
    const counter = this.counters.get('ws_validation_failures_total');
    counter?.inc({
      layer: this.normalizeMetricLabel(layer),
      domain: this.normalizeMetricLabel(domain),
      error_code: this.normalizeMetricLabel(errorCode),
    });
  }

  incrementWsPresenceAclCacheAccess(result: 'hit' | 'miss', value: number = 1): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }
    const counter = this.counters.get('ws_presence_acl_cache_access_total');
    counter?.inc({ result: this.normalizeMetricLabel(result) }, safeValue);
  }

  incrementWsPresenceAclCacheInvalidation(trigger: string, value: number = 1): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }
    const counter = this.counters.get('ws_presence_acl_cache_invalidations_total');
    counter?.inc({ trigger: this.normalizeMetricLabel(trigger) }, safeValue);
  }

  setWsPresenceAclCacheEntries(count: number): void {
    if (!this.enabled) return;
    const gauge = this.gauges.get('ws_presence_acl_cache_entries_current');
    gauge?.set(Math.max(0, count));
  }

  observeRedisOperation(operation: string, duration: number): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('redis_operation_duration_seconds');
    histogram?.observe({ operation }, duration);
  }

  incrementRtcProviderOperation(
    provider: string,
    operation: string,
    status: 'success' | 'failure',
    retryable: boolean,
  ): void {
    if (!this.enabled) return;
    const counter = this.counters.get('rtc_provider_operations_total');
    counter?.inc({
      provider,
      operation,
      status,
      retryable: retryable ? 'true' : 'false',
    });
  }

  observeRtcProviderOperationDuration(
    provider: string,
    operation: string,
    status: 'success' | 'failure',
    durationMs: number,
  ): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('rtc_provider_operation_duration_seconds');
    histogram?.observe(
      { provider, operation, status },
      Math.max(0, durationMs) / 1000,
    );
  }

  incrementRtcControlPlaneSignal(
    provider: string,
    operation: string,
    signal: 'invocation' | 'retry' | 'circuit_open_short_circuit' | 'unsafe_idempotency',
    value: number = 1,
  ): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }
    const counter = this.counters.get('rtc_control_plane_signals_total');
    counter?.inc({
      provider,
      operation,
      signal,
    }, safeValue);
  }

  incrementMessageSeqGapScan(
    conversationType: 'single' | 'group',
    status: 'success' | 'failure',
    value: number = 1,
  ): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }

    const counter = this.counters.get('message_seq_gap_scan_total');
    counter?.inc({
      conversation_type: this.normalizeMetricLabel(conversationType),
      status: this.normalizeMetricLabel(status),
    }, safeValue);
  }

  incrementMessageSeqGapTruncated(
    conversationType: 'single' | 'group',
    value: number = 1,
  ): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }

    const counter = this.counters.get('message_seq_gap_truncated_total');
    counter?.inc({
      conversation_type: this.normalizeMetricLabel(conversationType),
    }, safeValue);
  }

  observeMessageSeqGapScanDuration(
    conversationType: 'single' | 'group',
    status: 'success' | 'failure',
    durationMs: number,
  ): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('message_seq_gap_scan_duration_seconds');
    histogram?.observe(
      {
        conversation_type: this.normalizeMetricLabel(conversationType),
        status: this.normalizeMetricLabel(status),
      },
      Math.max(0, durationMs) / 1000,
    );
  }

  incrementMessageSeqAck(
    conversationType: 'single' | 'group',
    syncScope: 'user' | 'device',
    status: 'success' | 'failure',
    caughtUp: 'true' | 'false' | 'unknown',
    value: number = 1,
  ): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }

    const counter = this.counters.get('message_seq_ack_total');
    counter?.inc({
      conversation_type: this.normalizeMetricLabel(conversationType),
      sync_scope: this.normalizeMetricLabel(syncScope),
      status: this.normalizeMetricLabel(status),
      caught_up: this.normalizeMetricLabel(caughtUp),
    }, safeValue);
  }

  observeMessageSeqAckPendingSeq(
    conversationType: 'single' | 'group',
    syncScope: 'user' | 'device',
    pendingSeq: number,
  ): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('message_seq_ack_pending_seq');
    histogram?.observe(
      {
        conversation_type: this.normalizeMetricLabel(conversationType),
        sync_scope: this.normalizeMetricLabel(syncScope),
      },
      Math.max(0, pendingSeq),
    );
  }

  observeMessageSeqAckDuration(
    conversationType: 'single' | 'group',
    syncScope: 'user' | 'device',
    status: 'success' | 'failure',
    durationMs: number,
  ): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('message_seq_ack_duration_seconds');
    histogram?.observe(
      {
        conversation_type: this.normalizeMetricLabel(conversationType),
        sync_scope: this.normalizeMetricLabel(syncScope),
        status: this.normalizeMetricLabel(status),
      },
      Math.max(0, durationMs) / 1000,
    );
  }

  incrementMessageSeqAckBatch(
    syncScope: 'user' | 'device',
    status: 'success' | 'partial' | 'failure',
    value: number = 1,
  ): void {
    if (!this.enabled) return;
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }

    const counter = this.counters.get('message_seq_ack_batch_total');
    counter?.inc({
      sync_scope: this.normalizeMetricLabel(syncScope),
      status: this.normalizeMetricLabel(status),
    }, safeValue);
  }

  observeMessageSeqAckBatchDuration(
    syncScope: 'user' | 'device',
    status: 'success' | 'partial' | 'failure',
    durationMs: number,
  ): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('message_seq_ack_batch_duration_seconds');
    histogram?.observe(
      {
        sync_scope: this.normalizeMetricLabel(syncScope),
        status: this.normalizeMetricLabel(status),
      },
      Math.max(0, durationMs) / 1000,
    );
  }

  observeMessageSeqAckBatchFailedItems(
    syncScope: 'user' | 'device',
    failedItems: number,
  ): void {
    if (!this.enabled) return;
    const histogram = this.histograms.get('message_seq_ack_batch_failed_items');
    histogram?.observe(
      {
        sync_scope: this.normalizeMetricLabel(syncScope),
      },
      Math.max(0, failedItems),
    );
  }

  setRtcProviderHealth(
    provider: string,
    status: 'healthy' | 'degraded' | 'unknown' | 'unhealthy',
    failureRate: number,
    avgDurationMs: number,
    total: number,
    controlPlane?: {
      retryRate: number;
      circuitOpenRate: number;
      invocations: number;
      retries: number;
      circuitOpenShortCircuits: number;
      unsafeIdempotencyCalls: number;
    },
  ): void {
    if (!this.enabled) return;
    const healthGauge = this.gauges.get('rtc_provider_health_status');
    for (const item of ['healthy', 'degraded', 'unknown', 'unhealthy']) {
      healthGauge?.set(
        { provider, status: item },
        item === status ? 1 : 0,
      );
    }

    this.gauges.get('rtc_provider_failure_rate')?.set({ provider }, Math.max(0, failureRate));
    this.gauges.get('rtc_provider_avg_duration_ms')?.set({ provider }, Math.max(0, avgDurationMs));
    this.gauges.get('rtc_provider_total_samples')?.set({ provider }, Math.max(0, total));
    if (controlPlane) {
      this.gauges.get('rtc_provider_control_plane_retry_rate')?.set(
        { provider },
        Math.max(0, controlPlane.retryRate),
      );
      this.gauges.get('rtc_provider_control_plane_circuit_open_rate')?.set(
        { provider },
        Math.max(0, controlPlane.circuitOpenRate),
      );
      this.gauges.get('rtc_provider_control_plane_invocations')?.set(
        { provider },
        Math.max(0, controlPlane.invocations),
      );
      this.gauges.get('rtc_provider_control_plane_retries')?.set(
        { provider },
        Math.max(0, controlPlane.retries),
      );
      this.gauges.get('rtc_provider_control_plane_circuit_open_short_circuits')?.set(
        { provider },
        Math.max(0, controlPlane.circuitOpenShortCircuits),
      );
      this.gauges.get('rtc_provider_control_plane_unsafe_idempotency_calls')?.set(
        { provider },
        Math.max(0, controlPlane.unsafeIdempotencyCalls),
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private normalizeMetricLabel(value: string): string {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) {
      return 'unknown';
    }
    return normalized.replace(/[^a-z0-9_:.-]/g, '_').slice(0, 64);
  }
}
