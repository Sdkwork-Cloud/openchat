/**
 * 增强型事件总线服务
 * 
 * 提供发布订阅模式的事件总线，支持事件溯源、事件回放、事件过滤等高级功能
 * 支持本地事件和分布式事件（通过 Redis）
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * 事件接口
 */
export interface IEvent<T = any> {
  /** 事件名称 */
  eventName: string;
  /** 事件数据 */
  data: T;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件 ID */
  eventId: string;
  /** 事件来源 */
  source?: string;
  /** 事件版本 */
  version?: number;
  /** 事件元数据 */
  metadata?: Record<string, any>;
  /** 聚合根 ID（用于事件溯源） */
  aggregateId?: string;
  /** 聚合根类型（用于事件溯源） */
  aggregateType?: string;
}

/**
 * 事件处理器接口
 */
export interface IEventHandler<T extends IEvent = IEvent> {
  /** 处理事件 */
  handle(event: T): Promise<void> | void;
  /** 事件名称 */
  eventName: string;
}

/**
 * 事件订阅选项
 */
export interface EventSubscribeOptions {
  /** 是否异步处理 */
  async?: boolean;
  /** 是否持久化 */
  persistent?: boolean;
  /** 事件过期时间（秒） */
  expire?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 优先级 */
  priority?: number;
  /** 是否只接收本地事件 */
  localOnly?: boolean;
  /** 事件过滤器 */
  filter?: (event: IEvent) => boolean;
}

/**
 * 事件发布选项
 */
export interface EventPublishOptions {
  /** 是否异步发布 */
  async?: boolean;
  /** 是否持久化 */
  persistent?: boolean;
  /** 事件 TTL（秒） */
  ttl?: number;
  /** 事件来源 */
  source?: string;
  /** 事件版本 */
  version?: number;
  /** 事件元数据 */
  metadata?: Record<string, any>;
  /** 是否广播到其他节点 */
  broadcast?: boolean;
  /** 延迟发布（毫秒） */
  delay?: number;
  /** 优先级 */
  priority?: EventPriority | number;
  /** 是否只接收本地事件 */
  localOnly?: boolean;
  /** 关联 ID（用于事件追踪） */
  correlationId?: string;
}

/**
 * 事件存储接口
 */
export interface EventStore {
  /** 保存事件 */
  save(event: IEvent): Promise<void>;
  /** 查询事件 */
  query(options: EventQueryOptions): Promise<IEvent[]>;
  /** 删除事件 */
  delete(eventId: string): Promise<void>;
  /** 清空事件 */
  clear(aggregateId?: string): Promise<void>;
}

/**
 * 事件查询选项
 */
export interface EventQueryOptions {
  /** 聚合根 ID */
  aggregateId?: string;
  /** 聚合根类型 */
  aggregateType?: string;
  /** 事件名称 */
  eventName?: string;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 事件统计信息
 */
export interface EventBusStats {
  /** 发布事件总数 */
  totalPublished: number;
  /** 处理事件总数 */
  totalProcessed: number;
  /** 失败事件总数 */
  totalFailed: number;
  /** 当前订阅数 */
  subscriptionCount: number;
  /** 事件存储数量 */
  storedEventCount: number;
  /** 平均处理时间（毫秒） */
  averageProcessingTime: number;
}

/**
 * 内存事件存储实现
 */
@Injectable()
export class InMemoryEventStore implements EventStore {
  private readonly events: Map<string, IEvent> = new Map();
  private readonly aggregateEvents: Map<string, string[]> = new Map();
  private readonly maxEvents: number;
  private readonly eventQueue: string[] = []; // 用于LRU清理

  constructor(maxEvents: number = 10000) {
    this.maxEvents = maxEvents;
  }

  async save(event: IEvent): Promise<void> {
    // 检查是否需要清理旧事件
    if (this.events.size >= this.maxEvents) {
      this.cleanupOldEvents();
    }

    this.events.set(event.eventId, event);
    this.eventQueue.push(event.eventId);

    if (event.aggregateId) {
      const key = `${event.aggregateType || 'default'}:${event.aggregateId}`;
      const existing = this.aggregateEvents.get(key) || [];
      existing.push(event.eventId);
      this.aggregateEvents.set(key, existing);
    }
  }

  private cleanupOldEvents(): void {
    // 移除最旧的事件（LRU策略）
    const eventsToRemove = Math.floor(this.maxEvents * 0.2); // 移除20%的旧事件
    for (let i = 0; i < eventsToRemove && this.eventQueue.length > 0; i++) {
      const eventId = this.eventQueue.shift();
      if (eventId) {
        this.delete(eventId);
      }
    }
  }

  async query(options: EventQueryOptions): Promise<IEvent[]> {
    let result = Array.from(this.events.values());

    if (options.aggregateId) {
      const key = `${options.aggregateType || 'default'}:${options.aggregateId}`;
      const eventIds = this.aggregateEvents.get(key) || [];
      result = result.filter(e => eventIds.includes(e.eventId));
    }

    if (options.eventName) {
      result = result.filter(e => e.eventName === options.eventName);
    }

    if (options.startTime) {
      result = result.filter(e => e.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      result = result.filter(e => e.timestamp <= options.endTime!);
    }

    const sortOrder = options.sortOrder || 'asc';
    result.sort((a, b) => 
      sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    );

    const offset = options.offset || 0;
    const limit = options.limit || result.length;

    return result.slice(offset, offset + limit);
  }

  async delete(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      this.events.delete(eventId);
      
      if (event.aggregateId) {
        const key = `${event.aggregateType || 'default'}:${event.aggregateId}`;
        const eventIds = this.aggregateEvents.get(key) || [];
        const index = eventIds.indexOf(eventId);
        if (index > -1) {
          eventIds.splice(index, 1);
          this.aggregateEvents.set(key, eventIds);
        }
      }
    }
  }

  async clear(aggregateId?: string): Promise<void> {
    if (!aggregateId) {
      this.events.clear();
      this.aggregateEvents.clear();
    } else {
      const eventIds: string[] = [];
      for (const [key, ids] of this.aggregateEvents.entries()) {
        if (key.endsWith(`:${aggregateId}`)) {
          eventIds.push(...ids);
          this.aggregateEvents.delete(key);
        }
      }
      for (const eventId of eventIds) {
        this.events.delete(eventId);
      }
    }
  }
}

/**
 * 增强型事件总线服务
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(EventBusService.name);
  
  private readonly eventEmitter: EventEmitter2;
  private readonly eventStore: EventStore;
  private readonly eventSubjects: Map<string, Subject<IEvent>> = new Map();
  private readonly subscriptions: Map<string, symbol> = new Map();
  private readonly stats: EventBusStats = {
    totalPublished: 0,
    totalProcessed: 0,
    totalFailed: 0,
    subscriptionCount: 0,
    storedEventCount: 0,
    averageProcessingTime: 0,
  };
  private readonly processingTimes: number[] = [];
  private readonly prefix: string;
  private readonly enablePersistence: boolean;
  private readonly enableBroadcast: boolean;
  private readonly maxStoredEvents: number;

  constructor(
    @Optional() private readonly redisService?: RedisService,
    private readonly configService?: ConfigService,
  ) {
    this.eventEmitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
    });

    this.eventStore = new InMemoryEventStore(this.maxStoredEvents);
    
    this.prefix = this.configService?.get<string>('EVENTBUS_PREFIX', 'event') || 'event';
    this.enablePersistence = this.configService?.get<boolean>('EVENTBUS_ENABLE_PERSISTENCE', false) || false;
    this.enableBroadcast = this.configService?.get<boolean>('EVENTBUS_ENABLE_BROADCAST', false) || false;
    this.maxStoredEvents = this.configService?.get<number>('EVENTBUS_MAX_STORED_EVENTS', 10000) || 10000;
  }

  onModuleInit() {
    this.logger.log('EventBusService initialized');
    
    if (this.enableBroadcast && this.redisService) {
      this.setupDistributedEvents();
    }
  }

  onModuleDestroy() {
    this.eventEmitter.removeAllListeners();
    for (const subject of this.eventSubjects.values()) {
      subject.complete();
    }
    this.eventSubjects.clear();
    this.subscriptions.clear();
  }

  /**
   * 发布事件
   */
  async publish<T>(eventName: string, data: T, options?: EventPublishOptions): Promise<void> {
    const event = this.createEvent(eventName, data, options);
    const startTime = Date.now();

    try {
      // 持久化事件
      if (this.enablePersistence || options?.persistent) {
        await this.persistEvent(event);
      }

      // 本地发布
      await this.publishLocal(event, options);

      // 广播到其他节点
      if (options?.broadcast || (this.enableBroadcast && !options?.localOnly)) {
        await this.broadcastEvent(event, options);
      }

      // 统计
      this.stats.totalPublished++;
      this.updateStats();
    } catch (error) {
      this.stats.totalFailed++;
      this.logger.error(`Failed to publish event ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * 发布事件并等待结果
   */
  async publishAndWait<T, R = any>(
    eventName: string,
    data: T,
    timeout?: number,
    options?: EventPublishOptions,
  ): Promise<R | null> {
    return new Promise(async (resolve, reject) => {
      const event = this.createEvent(eventName, data, options);
      
      const timeoutId = timeout 
        ? setTimeout(() => {
            reject(new Error(`Event ${eventName} timeout after ${timeout}ms`));
          }, timeout)
        : null;

      try {
        await this.publishLocal(event, options);
        
        // 这里可以添加事件处理结果的监听逻辑
        // 目前简化处理，直接返回 null
        if (timeoutId) clearTimeout(timeoutId);
        resolve(null);
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * 订阅事件
   */
  subscribe<T extends IEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
    options?: EventSubscribeOptions,
  ): () => void {
    const subscriptionId = Symbol(`subscription_${eventName}`);

    const wrappedHandler = async (event: T) => {
      // 应用过滤器
      if (options?.filter && !options.filter(event)) {
        return;
      }

      const startTime = Date.now();
      const processingTime = Date.now() - startTime;

      try {
        if (options?.async) {
          setImmediate(() => handler(event));
        } else {
          await handler(event);
        }

        this.stats.totalProcessed++;

        // 记录处理时间
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > 100) {
          this.processingTimes.shift();
        }
      } catch (error) {
        this.stats.totalFailed++;
        this.logger.error(`Event handler error for ${eventName}:`, error);

        // 重试逻辑
        if (options?.maxRetries && options.maxRetries > 0) {
          await this.retryHandler(eventName, handler, event, options);
        }
      }
    };

    this.eventEmitter.on(eventName, wrappedHandler);
    this.subscriptions.set(eventName, subscriptionId);
    this.stats.subscriptionCount = this.subscriptions.size;

    // 返回取消订阅的函数
    return () => {
      this.eventEmitter.off(eventName, wrappedHandler);
      this.subscriptions.delete(eventName);
      this.stats.subscriptionCount = this.subscriptions.size;
    };
  }

  /**
   * 订阅事件（别名方法，用于兼容）
   */
  on<T extends IEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
    options?: EventSubscribeOptions,
  ): () => void {
    return this.subscribe(eventName, handler, options);
  }

  /**
   * 订阅事件（Observable 方式）
   */
  subscribeAsObservable<T extends IEvent>(
    eventName: string,
    options?: { filter?: (event: IEvent) => boolean },
  ): Observable<T> {
    if (!this.eventSubjects.has(eventName)) {
      const subject = new Subject<IEvent>();
      this.eventSubjects.set(eventName, subject);

      // 连接事件发射器到 subject
      this.eventEmitter.on(eventName, (event: IEvent) => {
        if (!options?.filter || options.filter(event)) {
          subject.next(event);
        }
      });
    }

    return this.eventSubjects.get(eventName)!.asObservable().pipe(
      filter(event => !options?.filter || options.filter(event)),
      map(event => event as T),
    );
  }

  /**
   * 发布事件到 Observable
   */
  next<T>(eventName: string, data: T, options?: EventPublishOptions): void {
    const event = this.createEvent(eventName, data, options);
    const subject = this.eventSubjects.get(eventName);
    if (subject) {
      subject.next(event);
    }
  }

  /**
   * 查询历史事件
   */
  async queryEvents(options: EventQueryOptions): Promise<IEvent[]> {
    return this.eventStore.query(options);
  }

  /**
   * 回放事件（用于事件溯源）
   */
  async replayEvents(
    aggregateId: string,
    handler: (event: IEvent) => void | Promise<void>,
    options?: {
      aggregateType?: string;
      startTime?: number;
      endTime?: number;
    },
  ): Promise<number> {
    const events = await this.eventStore.query({
      aggregateId,
      aggregateType: options?.aggregateType,
      startTime: options?.startTime,
      endTime: options?.endTime,
      sortOrder: 'asc',
    });

    for (const event of events) {
      await handler(event);
    }

    return events.length;
  }

  /**
   * 获取事件流（用于事件溯源）
   */
  async getEventStream(
    aggregateId: string,
    aggregateType?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<IEvent[]> {
    return this.eventStore.query({
      aggregateId,
      aggregateType,
      limit: options?.limit,
      offset: options?.offset,
      sortOrder: 'asc',
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): EventBusStats {
    this.stats.storedEventCount = this.processingTimes.length;
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    Object.assign(this.stats, {
      totalPublished: 0,
      totalProcessed: 0,
      totalFailed: 0,
      subscriptionCount: 0,
      storedEventCount: 0,
      averageProcessingTime: 0,
    });
    this.processingTimes.length = 0;
  }

  /**
   * 清除事件
   */
  async clearEvents(aggregateId?: string): Promise<void> {
    await this.eventStore.clear(aggregateId);
  }

  /**
   * 创建事件
   */
  protected createEvent<T>(
    eventName: string,
    data: T,
    options?: EventPublishOptions,
  ): IEvent<T> {
    return {
      eventName,
      data,
      timestamp: Date.now(),
      eventId: this.generateEventId(),
      source: options?.source,
      version: options?.version,
      metadata: options?.metadata,
    };
  }

  /**
   * 发布本地事件
   */
  protected async publishLocal(event: IEvent, options?: EventPublishOptions): Promise<void> {
    if (options?.delay) {
      setTimeout(() => {
        this.eventEmitter.emit(event.eventName, event);
      }, options.delay);
    } else {
      this.eventEmitter.emit(event.eventName, event);
    }
  }

  /**
   * 广播事件到其他节点
   */
  protected async broadcastEvent(event: IEvent, options?: EventPublishOptions): Promise<void> {
    if (!this.redisService) return;

    const channel = `${this.prefix}:broadcast:${event.eventName}`;
    const message = JSON.stringify(event);

    if (options?.ttl) {
      const client = this.redisService.getClient();
      await client.publish(channel, message);
    } else {
      await this.redisService.publish(channel, message);
    }
  }

  /**
   * 持久化事件
   */
  protected async persistEvent(event: IEvent): Promise<void> {
    await this.eventStore.save(event);

    // 限制存储数量
    const stats = this.getStats();
    if (stats.storedEventCount > this.maxStoredEvents) {
      // 删除最早的事件
      const oldEvents = await this.eventStore.query({
        limit: stats.storedEventCount - this.maxStoredEvents,
        sortOrder: 'asc',
      });
      for (const oldEvent of oldEvents) {
        await this.eventStore.delete(oldEvent.eventId);
      }
    }
  }

  /**
   * 设置分布式事件订阅
   */
  protected setupDistributedEvents(): void {
    if (!this.redisService) return;

    const channel = `${this.prefix}:broadcast:*`;
    
    this.redisService.subscribe(channel, async (message, pattern) => {
      try {
        const event = JSON.parse(message) as IEvent;
        // 避免重复处理本地事件
        if (event.source !== this.generateSourceId()) {
          this.eventEmitter.emit(event.eventName, event);
        }
      } catch (error) {
        this.logger.error(`Failed to process distributed event:`, error);
      }
    });
  }

  /**
   * 重试处理器
   */
  protected async retryHandler<T extends IEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
    event: T,
    options: EventSubscribeOptions,
  ): Promise<void> {
    const maxRetries = options.maxRetries || 3;
    const retryInterval = options.retryInterval || 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.sleep(retryInterval * Math.pow(2, i));
        await handler(event);
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          this.logger.error(`Event handler failed after ${maxRetries} retries:`, error);
        }
      }
    }
  }

  /**
   * 生成事件 ID
   */
  protected generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成来源 ID
   */
  protected generateSourceId(): string {
    return `src_${process.pid || 'unknown'}_${Date.now()}`;
  }

  /**
   * 更新统计
   */
  protected updateStats(): void {
    if (this.processingTimes.length > 0) {
      const total = this.processingTimes.reduce((a, b) => a + b, 0);
      this.stats.averageProcessingTime = total / this.processingTimes.length;
    }
  }

  /**
   * 休眠
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 事件装饰器
 */
export function OnEvent(eventName: string, options?: EventSubscribeOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalHandler = descriptor.value;

    // 存储元数据以便在模块初始化时注册
    const metadata = Reflect.getMetadata('events', target.constructor) || [];
    metadata.push({ eventName, handler: originalHandler, options });
    Reflect.defineMetadata('events', metadata, target.constructor);
  };
}

/**
 * 事件类型枚举（用于兼容）
 */
export type EventType = string;

/**
 * 事件类型常量（用于兼容）
 */
export const EventTypeConstants = {
  CUSTOM_EVENT: 'custom.event',
  ENTITY_CREATED: 'entity.created',
  ENTITY_UPDATED: 'entity.updated',
  ENTITY_DELETED: 'entity.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_RECEIVED: 'message.received',
  // IoT 事件
  AUDIO_DATA_RECEIVED: 'audio.data.received',
  AUDIO_PLAYBACK_COMPLETE: 'audio.playback.complete',
  AUDIO_TRANSCRIPTION_COMPLETE: 'audio.transcription.complete',
  VOICE_COMMAND_DETECTED: 'voice.command.detected',
  DEVICE_CONNECTED: 'device.connected',
  DEVICE_DISCONNECTED: 'device.disconnected',
  DEVICE_STATUS_CHANGED: 'device.status.changed',
} as const;

/**
 * 事件优先级枚举
 */
export enum EventPriority {
  LOW = 10,
  MEDIUM = 5,
  NORMAL = 5,
  HIGH = 1,
  CRITICAL = 0,
}
