import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AuditAction = 'create' | 'update' | 'delete' | 'read' | 'login' | 'logout' | 'export' | 'import' | 'approve' | 'reject' | 'custom';
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  severity: AuditSeverity;
  entityType: string;
  entityId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  oldValue?: any;
  newValue?: any;
  diff?: AuditDiff;
  metadata: Record<string, any>;
  reason?: string;
  tags: string[];
}

export interface AuditDiff {
  added: Record<string, any>;
  removed: Record<string, any>;
  changed: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface AuditQuery {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction | AuditAction[];
  severity?: AuditSeverity | AuditSeverity[];
  fromTimestamp?: number;
  toTimestamp?: number;
  tags?: string[];
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<AuditAction, number>;
  entriesBySeverity: Record<AuditSeverity, number>;
  entriesByEntityType: Record<string, number>;
  recentActivity: number;
  topUsers: Array<{ userId: string; count: number }>;
}

export interface AuditTrailOptions {
  retentionDays?: number;
  maxEntries?: number;
  enableDiff?: boolean;
  sensitiveFields?: string[];
  excludeFields?: string[];
  onAudit?: (entry: AuditEntry) => void;
}

@Injectable()
export class AuditTrailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditTrailService.name);
  private readonly trails = new Map<string, {
    entries: AuditEntry[];
    options: Required<AuditTrailOptions>;
    stats: {
      totalEntries: number;
      entriesByAction: Record<string, number>;
      entriesBySeverity: Record<string, number>;
      entriesByEntityType: Record<string, number>;
    };
    cleanupTimer?: NodeJS.Timeout;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('AuditTrailService initialized');
  }

  onModuleDestroy() {
    for (const [, trail] of this.trails) {
      if (trail.cleanupTimer) {
        clearInterval(trail.cleanupTimer);
      }
    }
  }

  createTrail(name: string, options?: AuditTrailOptions): void {
    if (this.trails.has(name)) {
      throw new Error(`Audit trail '${name}' already exists`);
    }

    const defaultOptions: Required<AuditTrailOptions> = {
      retentionDays: options?.retentionDays ?? 90,
      maxEntries: options?.maxEntries ?? 100000,
      enableDiff: options?.enableDiff ?? true,
      sensitiveFields: options?.sensitiveFields ?? ['password', 'token', 'secret', 'apiKey'],
      excludeFields: options?.excludeFields ?? [],
      onAudit: options?.onAudit ?? (() => {}),
    };

    const trail = {
      entries: [],
      options: defaultOptions,
      stats: {
        totalEntries: 0,
        entriesByAction: {},
        entriesBySeverity: {},
        entriesByEntityType: {},
      },
    };

    this.trails.set(name, trail);
    this.startCleanup(name);

    this.logger.log(`Audit trail '${name}' created`);
  }

  log(
    trailName: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    options?: {
      severity?: AuditSeverity;
      userId?: string;
      userName?: string;
      userRole?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      sessionId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
      reason?: string;
      tags?: string[];
    },
  ): AuditEntry {
    const trail = this.trails.get(trailName);
    if (!trail) {
      throw new Error(`Audit trail '${trailName}' not found`);
    }

    const entry: AuditEntry = {
      id: this.generateEntryId(),
      timestamp: Date.now(),
      action,
      severity: options?.severity || this.getDefaultSeverity(action),
      entityType,
      entityId,
      userId: options?.userId,
      userName: options?.userName,
      userRole: options?.userRole,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestId: options?.requestId,
      sessionId: options?.sessionId,
      oldValue: this.sanitizeValue(options?.oldValue, trail.options),
      newValue: this.sanitizeValue(options?.newValue, trail.options),
      metadata: options?.metadata || {},
      reason: options?.reason,
      tags: options?.tags || [],
    };

    if (trail.options.enableDiff && options?.oldValue && options?.newValue) {
      entry.diff = this.computeDiff(options.oldValue, options.newValue, trail.options);
    }

    trail.entries.push(entry);
    trail.stats.totalEntries++;
    trail.stats.entriesByAction[action] = (trail.stats.entriesByAction[action] || 0) + 1;
    trail.stats.entriesBySeverity[entry.severity] = (trail.stats.entriesBySeverity[entry.severity] || 0) + 1;
    trail.stats.entriesByEntityType[entityType] = (trail.stats.entriesByEntityType[entityType] || 0) + 1;

    if (trail.entries.length > trail.options.maxEntries) {
      trail.entries.shift();
    }

    trail.options.onAudit(entry);

    return entry;
  }

  logCreate(
    trailName: string,
    entityType: string,
    entityId: string,
    newValue: any,
    options?: Omit<Parameters<typeof this.log>[4], 'oldValue' | 'newValue'>,
  ): AuditEntry {
    return this.log(trailName, 'create', entityType, entityId, {
      ...options,
      newValue,
    });
  }

  logUpdate(
    trailName: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    newValue: any,
    options?: Omit<Parameters<typeof this.log>[4], 'oldValue' | 'newValue'>,
  ): AuditEntry {
    return this.log(trailName, 'update', entityType, entityId, {
      ...options,
      oldValue,
      newValue,
    });
  }

  logDelete(
    trailName: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    options?: Omit<Parameters<typeof this.log>[4], 'oldValue' | 'newValue'>,
  ): AuditEntry {
    return this.log(trailName, 'delete', entityType, entityId, {
      ...options,
      severity: 'high',
      oldValue,
    });
  }

  logRead(
    trailName: string,
    entityType: string,
    entityId: string,
    options?: Omit<Parameters<typeof this.log>[4], 'oldValue' | 'newValue'>,
  ): AuditEntry {
    return this.log(trailName, 'read', entityType, entityId, {
      ...options,
      severity: 'low',
    });
  }

  query(trailName: string, query: AuditQuery): AuditEntry[] {
    const trail = this.trails.get(trailName);
    if (!trail) {
      throw new Error(`Audit trail '${trailName}' not found`);
    }

    let entries = [...trail.entries];

    if (query.entityType) {
      entries = entries.filter(e => e.entityType === query.entityType);
    }

    if (query.entityId) {
      entries = entries.filter(e => e.entityId === query.entityId);
    }

    if (query.userId) {
      entries = entries.filter(e => e.userId === query.userId);
    }

    if (query.action) {
      const actions = Array.isArray(query.action) ? query.action : [query.action];
      entries = entries.filter(e => actions.includes(e.action));
    }

    if (query.severity) {
      const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
      entries = entries.filter(e => severities.includes(e.severity));
    }

    if (query.fromTimestamp !== undefined) {
      entries = entries.filter(e => e.timestamp >= query.fromTimestamp!);
    }

    if (query.toTimestamp !== undefined) {
      entries = entries.filter(e => e.timestamp <= query.toTimestamp!);
    }

    if (query.tags && query.tags.length > 0) {
      entries = entries.filter(e =>
        query.tags!.some(tag => e.tags.includes(tag))
      );
    }

    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      entries = entries.filter(e =>
        e.entityType.toLowerCase().includes(searchLower) ||
        e.entityId.toLowerCase().includes(searchLower) ||
        e.userName?.toLowerCase().includes(searchLower) ||
        e.reason?.toLowerCase().includes(searchLower) ||
        JSON.stringify(e.metadata).toLowerCase().includes(searchLower)
      );
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    if (query.offset !== undefined) {
      entries = entries.slice(query.offset);
    }

    if (query.limit !== undefined) {
      entries = entries.slice(0, query.limit);
    }

    return entries;
  }

  getEntityHistory(trailName: string, entityType: string, entityId: string): AuditEntry[] {
    return this.query(trailName, { entityType, entityId });
  }

  getUserActivity(trailName: string, userId: string, limit?: number): AuditEntry[] {
    return this.query(trailName, { userId, limit });
  }

  getEntry(trailName: string, entryId: string): AuditEntry | undefined {
    const trail = this.trails.get(trailName);
    if (!trail) return undefined;

    return trail.entries.find(e => e.id === entryId);
  }

  getStats(trailName: string): AuditStats {
    const trail = this.trails.get(trailName);
    if (!trail) {
      throw new Error(`Audit trail '${trailName}' not found`);
    }

    const oneHourAgo = Date.now() - 3600000;
    const recentActivity = trail.entries.filter(e => e.timestamp > oneHourAgo).length;

    const userCounts: Record<string, number> = {};
    for (const entry of trail.entries) {
      if (entry.userId) {
        userCounts[entry.userId] = (userCounts[entry.userId] || 0) + 1;
      }
    }

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: trail.stats.totalEntries,
      entriesByAction: trail.stats.entriesByAction as Record<AuditAction, number>,
      entriesBySeverity: trail.stats.entriesBySeverity as Record<AuditSeverity, number>,
      entriesByEntityType: trail.stats.entriesByEntityType,
      recentActivity,
      topUsers,
    };
  }

  export(trailName: string, format: 'json' | 'csv' = 'json', query?: AuditQuery): string {
    const entries = this.query(trailName, query || {});

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    const headers = ['id', 'timestamp', 'action', 'severity', 'entityType', 'entityId', 'userId', 'userName', 'ipAddress', 'reason'];
    const rows = entries.map(e =>
      headers.map(h => {
        const value = (e as any)[h];
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  clear(trailName: string): number {
    const trail = this.trails.get(trailName);
    if (!trail) return 0;

    const count = trail.entries.length;
    trail.entries = [];
    trail.stats = {
      totalEntries: 0,
      entriesByAction: {},
      entriesBySeverity: {},
      entriesByEntityType: {},
    };

    return count;
  }

  destroyTrail(trailName: string): boolean {
    const trail = this.trails.get(trailName);
    if (!trail) return false;

    if (trail.cleanupTimer) {
      clearInterval(trail.cleanupTimer);
    }

    return this.trails.delete(trailName);
  }

  private computeDiff(oldValue: any, newValue: any, options: Required<AuditTrailOptions>): AuditDiff {
    const diff: AuditDiff = {
      added: {},
      removed: {},
      changed: [],
    };

    const oldKeys = new Set(Object.keys(oldValue || {}));
    const newKeys = new Set(Object.keys(newValue || {}));

    for (const key of newKeys) {
      if (options.excludeFields.includes(key)) continue;
      if (options.sensitiveFields.includes(key)) continue;

      if (!oldKeys.has(key)) {
        diff.added[key] = newValue[key];
      } else if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        diff.changed.push({
          field: key,
          oldValue: oldValue[key],
          newValue: newValue[key],
        });
      }
    }

    for (const key of oldKeys) {
      if (options.excludeFields.includes(key)) continue;
      if (options.sensitiveFields.includes(key)) continue;

      if (!newKeys.has(key)) {
        diff.removed[key] = oldValue[key];
      }
    }

    return diff;
  }

  private sanitizeValue(value: any, options: Required<AuditTrailOptions>): any {
    if (!value || typeof value !== 'object') return value;

    const sanitized = { ...value };

    for (const field of options.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    for (const field of options.excludeFields) {
      delete sanitized[field];
    }

    return sanitized;
  }

  private getDefaultSeverity(action: AuditAction): AuditSeverity {
    switch (action) {
      case 'create':
      case 'read':
        return 'low';
      case 'update':
      case 'export':
      case 'import':
        return 'medium';
      case 'delete':
      case 'login':
      case 'logout':
        return 'high';
      case 'approve':
      case 'reject':
      case 'custom':
        return 'medium';
      default:
        return 'low';
    }
  }

  private startCleanup(trailName: string): void {
    const trail = this.trails.get(trailName);
    if (!trail) return;

    trail.cleanupTimer = setInterval(() => {
      this.cleanup(trailName);
    }, 24 * 60 * 60 * 1000);
  }

  private cleanup(trailName: string): void {
    const trail = this.trails.get(trailName);
    if (!trail) return;

    const threshold = Date.now() - trail.options.retentionDays * 24 * 60 * 60 * 1000;
    const initialLength = trail.entries.length;

    trail.entries = trail.entries.filter(e => e.timestamp >= threshold);

    const removed = initialLength - trail.entries.length;
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} old entries from audit trail '${trailName}'`);
    }
  }

  private generateEntryId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
