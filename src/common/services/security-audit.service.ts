import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventBusService, EventType } from '../events/event-bus.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset'
  | 'token_refresh'
  | 'token_revoked'
  | 'permission_denied'
  | 'suspicious_activity'
  | 'account_locked'
  | 'account_unlocked'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'session_hijacking_attempt'
  | 'brute_force_attempt'
  | 'api_key_created'
  | 'api_key_revoked';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  metadata?: Record<string, any>;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface SecurityPolicy {
  maxFailedAttempts: number;
  lockoutDuration: number;
  suspiciousThreshold: number;
  ipWhitelist: string[];
  ipBlacklist: string[];
  geoBlockingEnabled: boolean;
  allowedCountries?: string[];
}

export interface SecurityContext {
  userId?: string;
  ip: string;
  userAgent: string;
  deviceId?: string;
  fingerprint?: string;
}

export interface ThreatAssessment {
  score: number;
  level: SecuritySeverity;
  indicators: string[];
  recommendations: string[];
}

@Injectable()
export class SecurityAuditService implements OnModuleInit {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly events = new Map<string, SecurityEvent>();
  private readonly failedAttempts = new Map<string, number[]>();
  private policy: SecurityPolicy;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventBus: EventBusService,
  ) {
    this.policy = {
      maxFailedAttempts: this.configService.get<number>('SECURITY_MAX_FAILED_ATTEMPTS', 5),
      lockoutDuration: this.configService.get<number>('SECURITY_LOCKOUT_DURATION', 900000),
      suspiciousThreshold: this.configService.get<number>('SECURITY_SUSPICIOUS_THRESHOLD', 50),
      ipWhitelist: this.configService.get<string>('SECURITY_IP_WHITELIST', '').split(',').filter(Boolean),
      ipBlacklist: this.configService.get<string>('SECURITY_IP_BLACKLIST', '').split(',').filter(Boolean),
      geoBlockingEnabled: this.configService.get<boolean>('SECURITY_GEO_BLOCKING_ENABLED', false),
      allowedCountries: this.configService.get<string>('SECURITY_ALLOWED_COUNTRIES', '')?.split(',').filter(Boolean),
    };
  }

  onModuleInit() {
    this.logger.log('SecurityAuditService initialized');
  }

  async logEvent(
    type: SecurityEventType,
    context: SecurityContext,
    metadata?: Record<string, any>,
  ): Promise<SecurityEvent> {
    const severity = this.determineSeverity(type, context);
    const eventId = this.generateEventId();

    const event: SecurityEvent = {
      id: eventId,
      type,
      severity,
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      deviceId: context.deviceId,
      metadata,
      timestamp: Date.now(),
      resolved: false,
    };

    this.events.set(eventId, event);
    await this.persistEvent(event);

    await this.eventBus.publish(EventType.CUSTOM_EVENT, {
      type: 'security.event',
      eventType: type,
      severity,
      userId: context.userId,
      ip: context.ip,
    });

    if (type === 'login_failed') {
      await this.recordFailedAttempt(context);
    }

    if (severity === 'high' || severity === 'critical') {
      this.logger.warn(`Security event [${severity}]: ${type} - User: ${context.userId}, IP: ${context.ip}`);
    }

    return event;
  }

  async assessThreat(context: SecurityContext): Promise<ThreatAssessment> {
    let score = 0;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    if (this.policy.ipBlacklist.includes(context.ip)) {
      score += 100;
      indicators.push('IP is blacklisted');
      recommendations.push('Block request immediately');
    }

    if (this.policy.ipWhitelist.length > 0 && !this.policy.ipWhitelist.includes(context.ip)) {
      score += 30;
      indicators.push('IP not in whitelist');
      recommendations.push('Consider adding IP to whitelist or verify user identity');
    }

    const failedAttempts = await this.getRecentFailedAttempts(context);
    if (failedAttempts >= this.policy.maxFailedAttempts) {
      score += 50;
      indicators.push(`Multiple failed attempts: ${failedAttempts}`);
      recommendations.push('Consider account lockout or additional verification');
    }

    const recentEvents = await this.getRecentEvents(context.userId, 3600000);
    const suspiciousEvents = recentEvents.filter(
      (e) => e.type === 'suspicious_activity' || e.type === 'brute_force_attempt',
    );
    if (suspiciousEvents.length > 0) {
      score += 25 * suspiciousEvents.length;
      indicators.push(`${suspiciousEvents.length} suspicious events in last hour`);
      recommendations.push('Review account activity and consider temporary restrictions');
    }

    const deviceEvents = recentEvents.filter((e) => e.deviceId && e.deviceId !== context.deviceId);
    if (deviceEvents.length > 3) {
      score += 20;
      indicators.push('Multiple devices used recently');
      recommendations.push('Consider device verification');
    }

    const level: SecuritySeverity =
      score >= 100 ? 'critical' :
      score >= 50 ? 'high' :
      score >= 25 ? 'medium' : 'low';

    return { score, level, indicators, recommendations };
  }

  async isLocked(userId: string): Promise<boolean> {
    const key = buildCacheKey('security', 'lockout', userId);
    const locked = await this.redisService.get(key);
    return locked !== null;
  }

  async lockAccount(userId: string, duration?: number): Promise<void> {
    const lockDuration = duration || this.policy.lockoutDuration;
    const key = buildCacheKey('security', 'lockout', userId);
    await this.redisService.set(key, 'locked', Math.floor(lockDuration / 1000));

    await this.logEvent('account_locked', { userId, ip: '', userAgent: '' }, { duration: lockDuration });

    this.logger.warn(`Account locked: ${userId} for ${lockDuration}ms`);
  }

  async unlockAccount(userId: string): Promise<void> {
    const key = buildCacheKey('security', 'lockout', userId);
    await this.redisService.del(key);

    await this.logEvent('account_unlocked', { userId, ip: '', userAgent: '' });

    this.logger.log(`Account unlocked: ${userId}`);
  }

  async getRecentEvents(userId?: string, withinMs?: number): Promise<SecurityEvent[]> {
    let events = Array.from(this.events.values());

    if (userId) {
      events = events.filter((e) => e.userId === userId);
    }

    if (withinMs) {
      const cutoff = Date.now() - withinMs;
      events = events.filter((e) => e.timestamp >= cutoff);
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  async resolveEvent(eventId: string, resolvedBy: string): Promise<boolean> {
    const event = this.events.get(eventId);
    if (!event) return false;

    event.resolved = true;
    event.resolvedAt = Date.now();
    event.resolvedBy = resolvedBy;

    await this.persistEvent(event);
    return true;
  }

  updatePolicy(policy: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.logger.debug('Security policy updated');
  }

  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }

  private async recordFailedAttempt(context: SecurityContext): Promise<void> {
    const key = context.userId || context.ip;
    const cacheKey = buildCacheKey('security', 'failed_attempts', key);

    const current = await this.redisService.get(cacheKey);
    const attempts: number[] = current ? JSON.parse(current) : [];

    attempts.push(Date.now());
    const recentAttempts = attempts.filter((t) => Date.now() - t < 3600000);

    await this.redisService.set(cacheKey, JSON.stringify(recentAttempts), 3600);

    if (recentAttempts.length >= this.policy.maxFailedAttempts) {
      if (context.userId) {
        await this.lockAccount(context.userId);
      }
      await this.logEvent('brute_force_attempt', context, { attempts: recentAttempts.length });
    }
  }

  private async getRecentFailedAttempts(context: SecurityContext): Promise<number> {
    const key = context.userId || context.ip;
    const cacheKey = buildCacheKey('security', 'failed_attempts', key);

    const current = await this.redisService.get(cacheKey);
    if (!current) return 0;

    const attempts: number[] = JSON.parse(current);
    return attempts.filter((t) => Date.now() - t < 3600000).length;
  }

  private determineSeverity(type: SecurityEventType, context: SecurityContext): SecuritySeverity {
    switch (type) {
      case 'brute_force_attempt':
      case 'session_hijacking_attempt':
        return 'critical';
      case 'suspicious_activity':
      case 'account_locked':
        return 'high';
      case 'login_failed':
      case 'permission_denied':
        return 'medium';
      default:
        return 'low';
    }
  }

  private async persistEvent(event: SecurityEvent): Promise<void> {
    const key = buildCacheKey('security', 'event', event.id);
    await this.redisService.set(key, JSON.stringify(event), 86400 * 30);
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function AuditSecurity(
  type: SecurityEventType,
  contextExtractor?: (...args: any[]) => SecurityContext,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const securityAuditService = (this as any).securityAuditService as SecurityAuditService;

      try {
        const result = await originalMethod.apply(this, args);

        if (securityAuditService) {
          const context = contextExtractor
            ? contextExtractor(...args)
            : { ip: '', userAgent: '' };
          await securityAuditService.logEvent(type, context);
        }

        return result;
      } catch (error: any) {
        if (securityAuditService && type === 'login') {
          const context = contextExtractor
            ? contextExtractor(...args)
            : { ip: '', userAgent: '' };
          await securityAuditService.logEvent('login_failed', context, {
            error: error.message,
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}
