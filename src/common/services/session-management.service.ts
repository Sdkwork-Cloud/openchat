import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventBusService, EventTypeConstants } from '../events/event-bus.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export interface Session {
  id: string;
  userId: string;
  deviceId?: string;
  deviceType?: 'web' | 'mobile' | 'desktop' | 'other';
  deviceName?: string;
  ip: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface SessionConfig {
  maxSessionsPerUser: number;
  sessionTimeout: number;
  absoluteTimeout: number;
  renewOnActivity: boolean;
  singleSessionPerDevice: boolean;
}

export interface SessionQuery {
  userId?: string;
  deviceId?: string;
  active?: boolean;
  limit?: number;
}

@Injectable()
export class SessionManagementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionManagementService.name);
  private readonly sessions = new Map<string, Session>();
  private readonly userSessions = new Map<string, Set<string>>();
  private cleanupInterval?: NodeJS.Timeout;
  private readonly config: SessionConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventBus: EventBusService,
  ) {
    this.config = {
      maxSessionsPerUser: this.configService.get<number>('SESSION_MAX_PER_USER', 10),
      sessionTimeout: this.configService.get<number>('SESSION_TIMEOUT', 86400000),
      absoluteTimeout: this.configService.get<number>('SESSION_ABSOLUTE_TIMEOUT', 604800000),
      renewOnActivity: this.configService.get<boolean>('SESSION_RENEW_ON_ACTIVITY', true),
      singleSessionPerDevice: this.configService.get<boolean>('SESSION_SINGLE_PER_DEVICE', false),
    };
  }

  onModuleInit() {
    this.loadSessions();
    this.startCleanupInterval();
    this.logger.log('SessionManagementService initialized');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async create(
    userId: string,
    options: {
      deviceId?: string;
      deviceType?: Session['deviceType'];
      deviceName?: string;
      ip: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Session> {
    await this.enforceSessionLimit(userId);

    if (this.config.singleSessionPerDevice && options.deviceId) {
      await this.terminateByDevice(userId, options.deviceId);
    }

    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: Session = {
      id: sessionId,
      userId,
      deviceId: options.deviceId,
      deviceType: options.deviceType,
      deviceName: options.deviceName,
      ip: options.ip,
      userAgent: options.userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.config.sessionTimeout,
      metadata: options.metadata,
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    await this.persistSession(session);

    await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
      type: 'session.created',
      sessionId,
      userId,
      deviceId: options.deviceId,
    });

    this.logger.debug(`Session created: ${sessionId} for user ${userId}`);
    return session;
  }

  async get(sessionId: string): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    if (Date.now() > session.expiresAt) {
      await this.terminate(sessionId);
      return undefined;
    }

    return session;
  }

  async getActive(userId: string): Promise<Session[]> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    const activeSessions: Session[] = [];
    const now = Date.now();

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.expiresAt > now) {
        activeSessions.push(session);
      }
    }

    return activeSessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  async refresh(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);

    if (!session || Date.now() > session.expiresAt) {
      return null;
    }

    if (this.config.renewOnActivity) {
      session.lastActivityAt = Date.now();
      session.expiresAt = Date.now() + this.config.sessionTimeout;
    }

    await this.persistSession(session);
    return session;
  }

  async updateActivity(sessionId: string, metadata?: Record<string, any>): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) return false;

    session.lastActivityAt = Date.now();

    if (metadata) {
      session.metadata = { ...session.metadata, ...metadata };
    }

    await this.persistSession(session);
    return true;
  }

  async terminate(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);

    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
      if (userSessionIds.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    await this.redisService.del(buildCacheKey('session', sessionId));

    await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
      type: 'session.terminated',
      sessionId,
      userId: session.userId,
    });

    this.logger.debug(`Session terminated: ${sessionId}`);
    return true;
  }

  async terminateAll(userId: string, exceptSessionId?: string): Promise<number> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return 0;

    let count = 0;
    for (const sessionId of sessionIds) {
      if (sessionId !== exceptSessionId) {
        await this.terminate(sessionId);
        count++;
      }
    }

    return count;
  }

  async terminateByDevice(userId: string, deviceId: string): Promise<number> {
    const sessions = await this.getActive(userId);
    let count = 0;

    for (const session of sessions) {
      if (session.deviceId === deviceId) {
        await this.terminate(session.id);
        count++;
      }
    }

    return count;
  }

  async query(query: SessionQuery): Promise<Session[]> {
    let sessions = Array.from(this.sessions.values());
    const now = Date.now();

    if (query.userId) {
      sessions = sessions.filter((s) => s.userId === query.userId);
    }

    if (query.deviceId) {
      sessions = sessions.filter((s) => s.deviceId === query.deviceId);
    }

    if (query.active) {
      sessions = sessions.filter((s) => s.expiresAt > now);
    }

    sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

    return sessions.slice(0, query.limit || 100);
  }

  getStats(): {
    totalSessions: number;
    activeUsers: number;
    averageSessionsPerUser: number;
  } {
    const totalSessions = this.sessions.size;
    const activeUsers = this.userSessions.size;
    const averageSessionsPerUser = activeUsers > 0 ? totalSessions / activeUsers : 0;

    return {
      totalSessions,
      activeUsers,
      averageSessionsPerUser,
    };
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.getActive(userId);

    if (sessions.length >= this.config.maxSessionsPerUser) {
      const toRemove = sessions.length - this.config.maxSessionsPerUser + 1;
      const oldestSessions = sessions
        .sort((a, b) => a.lastActivityAt - b.lastActivityAt)
        .slice(0, toRemove);

      for (const session of oldestSessions) {
        await this.terminate(session.id);
      }
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys('session:*');

      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const session = JSON.parse(data) as Session;
          if (session.expiresAt > Date.now()) {
            this.sessions.set(session.id, session);

            if (!this.userSessions.has(session.userId)) {
              this.userSessions.set(session.userId, new Set());
            }
            this.userSessions.get(session.userId)!.add(session.id);
          }
        }
      }

      this.logger.debug(`Loaded ${this.sessions.size} sessions`);
    } catch (error) {
      this.logger.error('Failed to load sessions:', error);
    }
  }

  private async persistSession(session: Session): Promise<void> {
    const key = buildCacheKey('session', session.id);
    const ttl = Math.floor((session.expiresAt - Date.now()) / 1000);
    await this.redisService.set(key, JSON.stringify(session), ttl);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt <= now) {
        await this.terminate(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}
