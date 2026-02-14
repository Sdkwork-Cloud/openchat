/**
 * 事件总线服务
 * 提供事件发布和订阅功能
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Observable, Subject, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * 事件优先级
 */
export enum EventPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * 事件类型
 */
export enum EventType {
  DEVICE_CONNECTED = 'device.connected',
  DEVICE_DISCONNECTED = 'device.disconnected',
  DEVICE_MESSAGE_RECEIVED = 'device.message.received',
  DEVICE_MESSAGE_SENT = 'device.message.sent',
  DEVICE_STATE_CHANGED = 'device.state.changed',
  DEVICE_CAPABILITIES_DISCOVERED = 'device.capabilities.discovered',
  DEVICE_FIRMWARE_UPDATED = 'device.firmware.updated',
  DEVICE_AUTHENTICATED = 'device.authenticated',
  DEVICE_HEARTBEAT_TIMEOUT = 'device.heartbeat.timeout',
  DEVICE_RECONNECT_ATTEMPT = 'device.reconnect.attempt',
  DEVICE_CONNECTION_ADDED = 'device.connection.added',
  DEVICE_CONNECTION_REMOVED = 'device.connection.removed',
  DEVICE_HEARTBEAT_RECEIVED = 'device.heartbeat.received',
  DEVICE_RESTARTING = 'device.restarting',
  DEVICE_FACTORY_RESET = 'device.factory.reset',
  CONFIG_CHANGED = 'config.changed',
  CONFIG_UPDATED = 'config.updated',
  CONFIG_DELETED = 'config.deleted',
  SERVICE_REGISTERED = 'service.registered',
  SERVICE_UNREGISTERED = 'service.unregistered',
  SERVICE_STATUS_UPDATED = 'service.status.updated',
  FIRMWARE_UPGRADE_STARTED = 'firmware.upgrade.started',
  FIRMWARE_UPGRADE_STATUS_UPDATED = 'firmware.upgrade.status.updated',
  
  AUDIO_DATA_RECEIVED = 'audio.data.received',
  AUDIO_DATA_SENT = 'audio.data.sent',
  AUDIO_STREAM_STARTED = 'audio.stream.started',
  AUDIO_STREAM_STOPPED = 'audio.stream.stopped',
  AUDIO_CACHE_FLUSH_REQUEST = 'audio.cache.flush.request',
  VOICE_ACTIVITY_STARTED = 'voice.activity.started',
  VOICE_ACTIVITY_ENDED = 'voice.activity.ended',
  
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
  SYSTEM_INFO = 'system.info',
  SYSTEM_HEALTH_CHECK = 'system.health.check',
  
  CONNECTION_STATE_CHANGED = 'connection.state.changed',
  CONNECTION_ERROR = 'connection.error',
  
  MCP_SESSION_INITIALIZED = 'mcp.session.initialized',
  MCP_TOOLS_DISCOVERED = 'mcp.tools.discovered',
  MCP_TOOL_CALLED = 'mcp.tool.called',

  AGENT_MESSAGE_RECEIVED = 'agent.message.received',
  AGENT_MESSAGE_SENT = 'agent.message.sent',
  AGENT_SESSION_STARTED = 'agent.session.started',
  AGENT_SESSION_ENDED = 'agent.session.ended',
  AGENT_TOOL_CALLED = 'agent.tool.called',
  AGENT_ERROR = 'agent.error',

  GROUP_MESSAGE_CREATED = 'group.message.created',
  MESSAGE_SENT = 'message.sent',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
}

/**
 * 事件数据接口
 */
export interface EventData {
  type: EventType;
  payload: any;
  timestamp: number;
  source?: string;
  priority?: EventPriority;
  correlationId?: string;
}

/**
 * 事件过滤器接口
 */
export interface EventFilter {
  (event: EventData): boolean;
}

/**
 * 事件订阅选项
 */
export interface SubscribeOptions {
  filter?: EventFilter;
  priority?: EventPriority;
  maxListeners?: number;
}

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly eventSubjects = new Map<string, Subject<EventData>>();
  private readonly subscriptions = new Map<string, Subscription>();
  private subscriber: Redis;
  private isInitialized = false;

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.subscriber = redis.duplicate();
  }

  async onModuleInit() {
    try {
      await this.subscriber.connect();
      this.subscriber.on('message', (channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });
      this.subscriber.on('error', (error) => {
        this.logger.error('Redis subscriber error:', error);
      });
      this.isInitialized = true;
      this.logger.log('Event bus initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize event bus:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.subscriber.disconnect();
      this.eventSubjects.forEach((subject) => subject.complete());
      this.subscriptions.forEach((subscription) => subscription.unsubscribe());
      this.eventSubjects.clear();
      this.subscriptions.clear();
      this.logger.log('Event bus destroyed successfully');
    } catch (error) {
      this.logger.error('Failed to destroy event bus:', error);
    }
  }

  /**
   * 发布事件
   */
  async publish(eventType: EventType, payload: any, options?: {
    source?: string;
    priority?: EventPriority;
    correlationId?: string;
  }): Promise<void> {
    try {
      const event: EventData = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: options?.source,
        priority: options?.priority || EventPriority.MEDIUM,
        correlationId: options?.correlationId,
      };

      const channel = `event:${eventType}`;
      await this.redis.publish(channel, JSON.stringify(event));
      this.logger.debug(`Event published: ${eventType}, priority: ${event.priority}`);
    } catch (error) {
      this.logger.error('Failed to publish event:', error);
    }
  }

  /**
   * 订阅事件
   */
  subscribe(eventType: EventType, options?: SubscribeOptions): Observable<EventData> {
    const channel = `event:${eventType}`;
    
    if (!this.eventSubjects.has(channel)) {
      this.eventSubjects.set(channel, new Subject<EventData>());
      if (this.isInitialized) {
        this.subscriber.subscribe(channel);
      }
    }

    let observable = this.eventSubjects.get(channel)!.asObservable();

    // 应用过滤器
    if (options?.filter) {
      observable = observable.pipe(filter(options.filter));
    }

    // 应用优先级过滤
    if (options?.priority !== undefined) {
      observable = observable.pipe(filter(event => (event.priority || EventPriority.MEDIUM) >= options.priority!));
    }

    return observable;
  }

  /**
   * 订阅多个事件
   */
  subscribeMultiple(eventTypes: EventType[], options?: SubscribeOptions): Observable<EventData> {
    const subjects: Observable<EventData>[] = [];
    
    for (const eventType of eventTypes) {
      subjects.push(this.subscribe(eventType, options));
    }

    // 创建一个新的Subject来合并所有事件
    const mergedSubject = new Subject<EventData>();
    
    // 订阅所有事件源
    for (const subject of subjects) {
      const subscription = subject.subscribe(event => mergedSubject.next(event));
      this.subscriptions.set(`${eventTypes.join(',')}`, subscription);
    }

    return mergedSubject.asObservable();
  }

  /**
   * 处理Redis消息
   */
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const event: EventData = JSON.parse(message);
      const subject = this.eventSubjects.get(channel);
      
      if (subject) {
        // 根据优先级处理事件
        this.processEventByPriority(event, subject);
      }
      
      this.logger.debug(`Event received: ${event.type}, priority: ${event.priority}`);
    } catch (error) {
      this.logger.error('Failed to handle redis message:', error);
    }
  }

  /**
   * 根据优先级处理事件
   */
  private processEventByPriority(event: EventData, subject: Subject<EventData>): void {
    // 这里可以实现基于优先级的事件处理逻辑
    // 例如，高优先级事件可以立即处理，低优先级事件可以批量处理
    
    // 目前直接发送所有事件
    subject.next(event);
  }

  /**
   * 取消订阅事件
   */
  unsubscribe(eventType: EventType): void {
    const channel = `event:${eventType}`;
    const subject = this.eventSubjects.get(channel);
    
    if (subject) {
      subject.complete();
      this.eventSubjects.delete(channel);
      if (this.isInitialized) {
        this.subscriber.unsubscribe(channel);
      }
      this.logger.debug(`Unsubscribed from event: ${eventType}`);
    }
  }

  /**
   * 取消订阅多个事件
   */
  unsubscribeMultiple(eventTypes: EventType[]): void {
    for (const eventType of eventTypes) {
      this.unsubscribe(eventType);
    }
  }

  /**
   * 获取事件统计信息
   */
  getEventStats(): {
    totalSubscriptions: number;
    eventTypes: string[];
  } {
    return {
      totalSubscriptions: this.eventSubjects.size,
      eventTypes: Array.from(this.eventSubjects.keys()).map(key => key.replace('event:', '')),
    };
  }

  /**
   * 清空所有事件订阅
   */
  clearAllSubscriptions(): void {
    this.eventSubjects.forEach((subject, channel) => {
      subject.complete();
      const eventType = channel.replace('event:', '');
      if (this.isInitialized) {
        this.subscriber.unsubscribe(channel);
      }
    });
    this.eventSubjects.clear();
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();
    this.logger.log('All event subscriptions cleared');
  }
}

