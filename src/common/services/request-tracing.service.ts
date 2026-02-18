import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    fields?: Record<string, any>;
  }>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage: Record<string, string>;
}

export interface TraceConfig {
  samplingRate: number;
  maxSpansPerTrace: number;
  retentionPeriod: number;
  enabledOperations: string[];
  excludedOperations: string[];
}

export interface TraceQuery {
  traceId?: string;
  operationName?: string;
  status?: 'ok' | 'error';
  startTime?: number;
  endTime?: number;
  minDuration?: number;
  maxDuration?: number;
  tags?: Record<string, string>;
  limit?: number;
}

@Injectable()
export class RequestTracingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestTracingService.name);
  private readonly activeSpans = new Map<string, TraceSpan>();
  private readonly traces = new Map<string, TraceSpan[]>();
  private flushInterval?: NodeJS.Timeout;
  private readonly config: TraceConfig;
  private readonly buffer: TraceSpan[] = [];
  private readonly bufferSize: number = 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.config = {
      samplingRate: this.configService.get<number>('TRACING_SAMPLING_RATE', 0.1),
      maxSpansPerTrace: this.configService.get<number>('TRACING_MAX_SPANS', 1000),
      retentionPeriod: this.configService.get<number>('TRACING_RETENTION', 86400),
      enabledOperations: this.configService.get<string>('TRACING_ENABLED_OPERATIONS', '')?.split(',').filter(Boolean) || [],
      excludedOperations: this.configService.get<string>('TRACING_EXCLUDED_OPERATIONS', 'health,metrics,prometheus')?.split(',').filter(Boolean) || [],
    };
  }

  onModuleInit() {
    this.startFlushInterval();
    this.logger.log('RequestTracingService initialized');
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  startSpan(
    operationName: string,
    parentContext?: TraceContext,
    tags?: Record<string, string | number | boolean>,
  ): TraceContext {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const sampled = parentContext?.sampled ?? this.shouldSample();

    if (this.config.excludedOperations.some((op) => operationName.includes(op))) {
      return {
        traceId,
        spanId,
        parentSpanId: parentContext?.spanId,
        sampled: false,
        baggage: parentContext?.baggage || {},
      };
    }

    if (this.config.enabledOperations.length > 0 &&
        !this.config.enabledOperations.some((op) => operationName.includes(op))) {
      return {
        traceId,
        spanId,
        parentSpanId: parentContext?.spanId,
        sampled: false,
        baggage: parentContext?.baggage || {},
      };
    }

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      tags: tags || {},
      logs: [],
    };

    this.activeSpans.set(spanId, span);

    return {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      sampled,
      baggage: parentContext?.baggage || {},
    };
  }

  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(spanId);

    let traceSpans = this.traces.get(span.traceId);
    if (!traceSpans) {
      traceSpans = [];
      this.traces.set(span.traceId, traceSpans);
    }

    if (traceSpans.length < this.config.maxSpansPerTrace) {
      traceSpans.push(span);
    }

    this.buffer.push(span);
    this.checkFlush();
  }

  log(spanId: string, level: 'info' | 'warn' | 'error', message: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields,
    });
  }

  setTag(spanId: string, key: string, value: string | number | boolean): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.tags[key] = value;
  }

  addBaggage(context: TraceContext, key: string, value: string): TraceContext {
    return {
      ...context,
      baggage: { ...context.baggage, [key]: value },
    };
  }

  getTrace(traceId: string): TraceSpan[] | undefined {
    return this.traces.get(traceId);
  }

  async query(query: TraceQuery): Promise<TraceSpan[]> {
    const results: TraceSpan[] = [];

    for (const spans of this.traces.values()) {
      for (const span of spans) {
        if (query.traceId && span.traceId !== query.traceId) continue;
        if (query.operationName && !span.operationName.includes(query.operationName)) continue;
        if (query.status && span.status !== query.status) continue;
        if (query.startTime && span.startTime < query.startTime) continue;
        if (query.endTime && (span.endTime || 0) > query.endTime) continue;
        if (query.minDuration && (span.duration || 0) < query.minDuration) continue;
        if (query.maxDuration && (span.duration || 0) > query.maxDuration) continue;

        if (query.tags) {
          const tagsMatch = Object.entries(query.tags).every(
            ([k, v]) => span.tags[k] === v,
          );
          if (!tagsMatch) continue;
        }

        results.push(span);
      }
    }

    results.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

    return results.slice(0, query.limit || 100);
  }

  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  getTraceCount(): number {
    return this.traces.size;
  }

  getStats(): {
    activeSpans: number;
    totalTraces: number;
    bufferedSpans: number;
  } {
    return {
      activeSpans: this.activeSpans.size,
      totalTraces: this.traces.size,
      bufferedSpans: this.buffer.length,
    };
  }

  injectContext(context: TraceContext, headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId,
      'x-parent-span-id': context.parentSpanId || '',
      'x-sampled': context.sampled ? '1' : '0',
    };
  }

  extractContext(headers: Record<string, string>): TraceContext | null {
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];

    if (!traceId || !spanId) {
      return null;
    }

    return {
      traceId,
      spanId,
      parentSpanId: headers['x-parent-span-id'] || undefined,
      sampled: headers['x-sampled'] === '1',
      baggage: {},
    };
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private checkFlush(): void {
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const spans = [...this.buffer];
    this.buffer.length = 0;

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      for (const span of spans) {
        const key = buildCacheKey('trace', span.traceId, span.spanId);
        pipeline.setex(key, this.config.retentionPeriod, JSON.stringify(span));
      }

      await pipeline.exec();
      this.logger.debug(`Flushed ${spans.length} trace spans`);
    } catch (error) {
      this.logger.error('Failed to flush trace spans:', error);
      this.buffer.unshift(...spans);
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        this.logger.error('Failed to flush trace spans:', err);
      });
    }, 10000);
  }

  private generateTraceId(): string {
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
  }

  private generateSpanId(): string {
    return Math.random().toString(16).slice(2, 18);
  }
}

export function Traced(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracingService = (this as any).tracingService as RequestTracingService;

      if (!tracingService) {
        return originalMethod.apply(this, args);
      }

      const context = tracingService.startSpan(name);

      try {
        const result = await originalMethod.apply(this, args);
        tracingService.endSpan(context.spanId, 'ok');
        return result;
      } catch (error: any) {
        tracingService.setTag(context.spanId, 'error', true);
        tracingService.log(context.spanId, 'error', error.message, {
          stack: error.stack,
        });
        tracingService.endSpan(context.spanId, 'error');
        throw error;
      }
    };

    return descriptor;
  };
}
