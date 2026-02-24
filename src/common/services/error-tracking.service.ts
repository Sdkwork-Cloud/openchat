import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventBusService, EventTypeConstants } from '../events/event-bus.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorRecord {
  id: string;
  fingerprint: string;
  type: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  count: number;
  firstSeen: number;
  lastSeen: number;
  context?: {
    userId?: string;
    requestId?: string;
    traceId?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    body?: any;
    query?: any;
    params?: any;
  };
  tags: Record<string, string>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface ErrorGroup {
  fingerprint: string;
  type: string;
  message: string;
  count: number;
  severity: ErrorSeverity;
  firstSeen: number;
  lastSeen: number;
  resolved: boolean;
}

export interface ErrorQuery {
  type?: string;
  severity?: ErrorSeverity;
  resolved?: boolean;
  startTime?: number;
  endTime?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byType: Record<string, number>;
  unresolved: number;
  last24Hours: number;
}

@Injectable()
export class ErrorTrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private readonly errors = new Map<string, ErrorRecord>();
  private readonly groups = new Map<string, ErrorGroup>();
  private flushInterval?: NodeJS.Timeout;
  private readonly buffer: ErrorRecord[] = [];
  private readonly retentionDays: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventBus: EventBusService,
  ) {
    this.retentionDays = this.configService.get<number>('ERROR_RETENTION_DAYS', 30);
  }

  onModuleInit() {
    this.loadErrors();
    this.startFlushInterval();
    this.logger.log('ErrorTrackingService initialized');
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  async capture(
    error: Error,
    context?: ErrorRecord['context'],
    tags?: Record<string, string>,
  ): Promise<ErrorRecord> {
    const fingerprint = this.generateFingerprint(error);
    const severity = this.determineSeverity(error);
    const existing = this.findExisting(fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
      existing.context = context;
      this.buffer.push(existing);
      return existing;
    }

    const record: ErrorRecord = {
      id: this.generateErrorId(),
      fingerprint,
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      severity,
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      context,
      tags: tags || {},
      resolved: false,
    };

    this.errors.set(record.id, record);
    this.updateGroup(record);
    this.buffer.push(record);

    await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
      type: 'error.captured',
      errorId: record.id,
      fingerprint,
      severity,
      message: error.message,
    });

    if (severity === 'high' || severity === 'critical') {
      this.logger.error(`Error captured [${severity}]: ${error.message}`, error.stack);
    }

    this.checkFlush();
    return record;
  }

  async captureMessage(
    message: string,
    severity: ErrorSeverity = 'medium',
    context?: ErrorRecord['context'],
    tags?: Record<string, string>,
  ): Promise<ErrorRecord> {
    const fingerprint = this.generateMessageFingerprint(message);
    const existing = this.findExisting(fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
      this.buffer.push(existing);
      return existing;
    }

    const record: ErrorRecord = {
      id: this.generateErrorId(),
      fingerprint,
      type: 'Message',
      message,
      severity,
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      context,
      tags: tags || {},
      resolved: false,
    };

    this.errors.set(record.id, record);
    this.updateGroup(record);
    this.buffer.push(record);

    this.checkFlush();
    return record;
  }

  async resolve(errorId: string, resolvedBy?: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = Date.now();
    error.resolvedBy = resolvedBy;

    const group = this.groups.get(error.fingerprint);
    if (group) {
      group.resolved = true;
    }

    await this.persistError(error);
    return true;
  }

  async resolveByFingerprint(fingerprint: string, resolvedBy?: string): Promise<number> {
    let count = 0;

    for (const error of this.errors.values()) {
      if (error.fingerprint === fingerprint && !error.resolved) {
        error.resolved = true;
        error.resolvedAt = Date.now();
        error.resolvedBy = resolvedBy;
        count++;
      }
    }

    const group = this.groups.get(fingerprint);
    if (group) {
      group.resolved = true;
    }

    return count;
  }

  async getError(errorId: string): Promise<ErrorRecord | undefined> {
    return this.errors.get(errorId);
  }

  async query(query: ErrorQuery): Promise<{ errors: ErrorRecord[]; total: number }> {
    let results = Array.from(this.errors.values());

    if (query.type) {
      results = results.filter((e) => e.type === query.type);
    }

    if (query.severity) {
      results = results.filter((e) => e.severity === query.severity);
    }

    if (query.resolved !== undefined) {
      results = results.filter((e) => e.resolved === query.resolved);
    }

    if (query.startTime) {
      results = results.filter((e) => e.firstSeen >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter((e) => e.firstSeen <= query.endTime!);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.message.toLowerCase().includes(search) ||
          e.type.toLowerCase().includes(search),
      );
    }

    results.sort((a, b) => b.lastSeen - a.lastSeen);

    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    return {
      errors: results.slice(offset, offset + limit),
      total,
    };
  }

  async getGroups(): Promise<ErrorGroup[]> {
    return Array.from(this.groups.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }

  async getStats(): Promise<ErrorStats> {
    const errors = Array.from(this.errors.values());
    const now = Date.now();
    const last24Hours = now - 86400000;

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: Record<string, number> = {};

    for (const error of errors) {
      bySeverity[error.severity]++;
      byType[error.type] = (byType[error.type] || 0) + 1;
    }

    return {
      total: errors.length,
      bySeverity,
      byType,
      unresolved: errors.filter((e) => !e.resolved).length,
      last24Hours: errors.filter((e) => e.firstSeen >= last24Hours).length,
    };
  }

  private generateFingerprint(error: Error): string {
    const stackLines = error.stack?.split('\n').slice(0, 5).join('\n') || '';
    return this.hash(`${error.constructor.name}:${error.message}:${stackLines}`);
  }

  private generateMessageFingerprint(message: string): string {
    return this.hash(`Message:${message}`);
  }

  private hash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private findExisting(fingerprint: string): ErrorRecord | undefined {
    for (const error of this.errors.values()) {
      if (error.fingerprint === fingerprint) {
        return error;
      }
    }
    return undefined;
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (
      message.includes('out of memory') ||
      message.includes('database connection') ||
      message.includes('critical')
    ) {
      return 'critical';
    }

    if (
      message.includes('timeout') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'high';
    }

    if (
      message.includes('validation') ||
      message.includes('not found') ||
      message.includes('bad request')
    ) {
      return 'low';
    }

    return 'medium';
  }

  private updateGroup(error: ErrorRecord): void {
    let group = this.groups.get(error.fingerprint);

    if (!group) {
      group = {
        fingerprint: error.fingerprint,
        type: error.type,
        message: error.message,
        count: 0,
        severity: error.severity,
        firstSeen: error.firstSeen,
        lastSeen: error.lastSeen,
        resolved: false,
      };
    }

    group.count++;
    group.lastSeen = error.lastSeen;
    this.groups.set(error.fingerprint, group);
  }

  private checkFlush(): void {
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const errors = [...this.buffer];
    this.buffer.length = 0;

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      for (const error of errors) {
        const key = buildCacheKey('error', error.id);
        pipeline.setex(key, this.retentionDays * 86400, JSON.stringify(error));
      }

      await pipeline.exec();
    } catch (err) {
      this.logger.error('Failed to flush errors:', err);
      this.buffer.unshift(...errors);
    }
  }

  private async loadErrors(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys('error:*');

      for (const key of keys.slice(0, 1000)) {
        const data = await this.redisService.get(key);
        if (data) {
          const error = JSON.parse(data) as ErrorRecord;
          this.errors.set(error.id, error);
          this.updateGroup(error);
        }
      }

      this.logger.debug(`Loaded ${this.errors.size} errors`);
    } catch (err) {
      this.logger.error('Failed to load errors:', err);
    }
  }

  private async persistError(error: ErrorRecord): Promise<void> {
    const key = buildCacheKey('error', error.id);
    await this.redisService.set(key, JSON.stringify(error), this.retentionDays * 86400);
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        this.logger.error('Failed to flush errors:', err);
      });
    }, 10000);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function TrackErrors() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const errorTrackingService = (this as any).errorTrackingService as ErrorTrackingService;

      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (errorTrackingService) {
          await errorTrackingService.capture(error, {
            path: propertyKey,
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}
