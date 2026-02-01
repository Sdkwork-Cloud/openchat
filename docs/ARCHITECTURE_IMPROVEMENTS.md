# OpenChat 即时通讯架构改进方案

## 当前架构分析

### 服务端架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                    (REST + WebSocket)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   User      │  │   Message   │  │   Group     │             │
│  │   Module    │  │   Module    │  │   Module    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              IM Provider Layer                 │              │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │              │
│  │  │ 悟空IM   │ │ 环信IM   │ │ 自定义   │      │              │
│  │  └──────────┘ └──────────┘ └──────────┘      │              │
│  └───────────────────────────────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis  │  RabbitMQ  │  MinIO                    │
└─────────────────────────────────────────────────────────────────┘
```

### 前端 SDK 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenChat SDK (TypeScript)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Auth     │  │   Message   │  │    RTC      │             │
│  │   Service   │  │   Service   │  │   Service   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              Transport Layer                   │              │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │              │
│  │  │  HTTP    │ │WebSocket │ │  WebRTC  │      │              │
│  │  └──────────┘ └──────────┘ └──────────┘      │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 发现的问题

### 1. 服务端问题

#### 1.1 消息服务缺少索引优化
**问题**: `message.service.ts` 中的查询没有充分利用数据库索引
**影响**: 大数据量时查询性能下降

#### 1.2 缺少消息序列化保证
**问题**: 消息顺序依赖数据库自增ID，分布式环境下可能不准确
**影响**: 消息乱序

#### 1.3 WebSocket 缺少心跳检测
**问题**: 客户端断网时服务端无法及时感知
**影响**: 用户状态不准确

### 2. 前端 SDK 问题

#### 2.1 消息服务使用 Mock 数据
**问题**: `message.service.ts` 仍在使用本地 Mock 数据
**影响**: 无法对接真实后端

#### 2.2 缺少消息重试机制
**问题**: 网络抖动时消息可能丢失
**影响**: 消息可靠性降低

#### 2.3 缺少离线消息同步
**问题**: 断线重连后无法自动同步离线期间的消息
**影响**: 用户体验差

### 3. 架构设计问题

#### 3.1 缺少消息路由层
**问题**: 消息直接发送到 IM Provider，缺少路由控制
**影响**: 无法实现复杂的路由策略

#### 3.2 缺少消息持久化确认
**问题**: 消息保存到数据库后没有确认机制
**影响**: 可能丢失消息

## 改进方案

### 1. 服务端改进

#### 1.1 添加数据库索引

```typescript
// message.entity.ts 添加索引
@Entity('chat_messages')
@Index(['fromUserId', 'createdAt'])  // 发送者消息查询
@Index(['toUserId', 'createdAt'])    // 接收者消息查询
@Index(['groupId', 'createdAt'])     // 群组消息查询
@Index(['status', 'createdAt'])      // 状态查询
@Index(['clientSeq', 'fromUserId'], { unique: true })  // 去重索引
export class Message extends BaseEntity {
  // ...
}
```

#### 1.2 实现消息序列号服务

```typescript
// message-sequence.service.ts
@Injectable()
export class MessageSequenceService {
  constructor(
    @InjectRedis() private redis: Redis,
  ) {}

  /**
   * 获取下一个消息序列号
   * 使用 Redis 原子操作保证顺序
   */
  async getNextSequence(conversationId: string): Promise<number> {
    const key = `seq:${conversationId}`;
    const sequence = await this.redis.incr(key);
    return sequence;
  }

  /**
   * 批量获取序列号
   */
  async getNextSequences(conversationId: string, count: number): Promise<number[]> {
    const key = `seq:${conversationId}`;
    const pipeline = this.redis.pipeline();
    
    for (let i = 0; i < count; i++) {
      pipeline.incr(key);
    }
    
    const results = await pipeline.exec();
    return results?.map(([err, val]) => val as number) || [];
  }
}
```

#### 1.3 完善 WebSocket 心跳检测

```typescript
// ws-heartbeat.service.ts
@Injectable()
export class WSHeartbeatService {
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒
  private readonly HEARTBEAT_TIMEOUT = 60000;  // 60秒超时

  constructor(
    @InjectRedis() private redis: Redis,
  ) {}

  /**
   * 记录客户端心跳
   */
  async recordHeartbeat(userId: string, socketId: string): Promise<void> {
    const key = `hb:${userId}:${socketId}`;
    await this.redis.setex(key, this.HEARTBEAT_TIMEOUT / 1000, Date.now().toString());
  }

  /**
   * 检查客户端是否存活
   */
  async isClientAlive(userId: string, socketId: string): Promise<boolean> {
    const key = `hb:${userId}:${socketId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * 获取所有过期连接
   */
  async getExpiredConnections(): Promise<Array<{ userId: string; socketId: string }>> {
    // 扫描所有心跳键
    const keys = await this.redis.keys('hb:*');
    const expired: Array<{ userId: string; socketId: string }> = [];

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl < 0) {
        // TTL 为负数表示键不存在或已过期
        const parts = key.split(':');
        if (parts.length === 3) {
          expired.push({ userId: parts[1], socketId: parts[2] });
        }
      }
    }

    return expired;
  }
}
```

### 2. 前端 SDK 改进

#### 2.1 实现真实消息服务

```typescript
// message.service.ts - 改进版
import { apiClient } from '@/services/api.client';
import { WebSocketClient } from '@/services/websocket.client';

export class MessageService {
  private wsClient: WebSocketClient;
  private messageQueue: Map<string, PendingMessage> = new Map();

  constructor(wsClient: WebSocketClient) {
    this.wsClient = wsClient;
    this.setupWebSocketHandlers();
  }

  /**
   * 发送消息（带重试和确认）
   */
  async sendMessage(params: SendMessageParams): Promise<Message> {
    const messageId = generateUUID();
    const clientSeq = generateTimestampId();

    const message: PendingMessage = {
      id: messageId,
      clientSeq,
      conversationId: params.conversationId,
      content: params.content,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    // 加入队列
    this.messageQueue.set(messageId, message);

    try {
      // 1. 先保存到本地（乐观更新）
      this.saveToLocal(message);

      // 2. 通过 WebSocket 发送
      await this.sendViaWebSocket(message);

      // 3. 等待确认（30秒超时）
      const confirmed = await this.waitForAck(messageId, 30000);

      if (confirmed) {
        message.status = 'sent';
        this.updateLocalStatus(messageId, 'sent');
        return this.getMessage(messageId);
      } else {
        throw new Error('Message acknowledgment timeout');
      }
    } catch (error) {
      // 重试逻辑
      if (message.retryCount < message.maxRetries) {
        message.retryCount++;
        await this.delay(1000 * message.retryCount); // 指数退避
        return this.sendMessage(params);
      }

      message.status = 'failed';
      this.updateLocalStatus(messageId, 'failed');
      throw error;
    } finally {
      this.messageQueue.delete(messageId);
    }
  }

  /**
   * 同步离线消息
   */
  async syncOfflineMessages(conversationId: string, lastSequence?: number): Promise<Message[]> {
    const response = await apiClient.get<Message[]>(`/messages/sync`, {
      params: {
        conversationId,
        afterSeq: lastSequence || 0,
      },
    });

    // 合并到本地存储
    for (const message of response) {
      this.saveToLocal(message);
    }

    return response;
  }

  private setupWebSocketHandlers(): void {
    // 监听消息确认
    this.wsClient.on('message:ack', (ack: MessageAck) => {
      const message = this.messageQueue.get(ack.messageId);
      if (message) {
        message.ackReceived = true;
      }
    });

    // 监听新消息
    this.wsClient.on('message:received', (message: Message) => {
      this.saveToLocal(message);
      this.emit('newMessage', message);
    });
  }

  private waitForAck(messageId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const message = this.messageQueue.get(messageId);
        if (message?.ackReceived) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 2.2 实现 WebSocket 客户端

```typescript
// websocket.client.ts
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private messageQueue: string[] = [];

  constructor(private url: string, private token: string) {
    super();
  }

  connect(): void {
    this.ws = new WebSocket(`${this.url}?token=${this.token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit(data.event, data.payload);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.emit('disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  send(event: string, payload: any): void {
    const message = JSON.stringify({ event, payload });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.send('ping', { timestamp: Date.now() });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.emit('reconnecting', this.reconnectAttempts);
      this.connect();
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws?.send(message);
      }
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.ws?.close();
  }
}
```

### 3. 架构层改进

#### 3.1 实现消息路由层

```typescript
// message-router.service.ts
@Injectable()
export class MessageRouterService {
  constructor(
    private configService: ConfigService,
    private imProviderService: IMProviderService,
    private webhookService: WebhookService,
  ) {}

  /**
   * 路由消息
   */
  async routeMessage(message: Message): Promise<void> {
    const routes = this.determineRoutes(message);

    await Promise.all(
      routes.map(route => this.executeRoute(route, message))
    );
  }

  private determineRoutes(message: Message): MessageRoute[] {
    const routes: MessageRoute[] = [];

    // 1. 路由到 IM Provider
    routes.push({
      type: 'im_provider',
      priority: 1,
      handler: () => this.imProviderService.sendMessage(message),
    });

    // 2. 路由到 Bot Webhook
    if (message.toUserId) {
      routes.push({
        type: 'bot_webhook',
        priority: 2,
        handler: () => this.webhookService.sendEvent(message.toUserId, 'message.received', message),
      });
    }

    // 3. 路由到推送服务
    if (this.needsPushNotification(message)) {
      routes.push({
        type: 'push_notification',
        priority: 3,
        handler: () => this.sendPushNotification(message),
      });
    }

    return routes.sort((a, b) => a.priority - b.priority);
  }

  private async executeRoute(route: MessageRoute, message: Message): Promise<void> {
    try {
      await route.handler();
    } catch (error) {
      // 路由失败不影响其他路由
      console.error(`Route ${route.type} failed:`, error);
    }
  }
}
```

#### 3.2 实现消息持久化确认

```typescript
// message-persistence.service.ts
@Injectable()
export class MessagePersistenceService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 持久化消息并确认
   */
  async persistWithConfirmation(message: Message): Promise<PersistenceResult> {
    const confirmationId = uuidv4();

    try {
      // 1. 保存消息
      const saved = await this.messageRepository.save(message);

      // 2. 发布持久化事件
      this.eventEmitter.emit('message.persisted', {
        messageId: saved.id,
        confirmationId,
        timestamp: Date.now(),
      });

      return {
        success: true,
        messageId: saved.id,
        confirmationId,
      };
    } catch (error) {
      // 3. 发布持久化失败事件
      this.eventEmitter.emit('message.persist_failed', {
        message,
        confirmationId,
        error: error.message,
        timestamp: Date.now(),
      });

      return {
        success: false,
        error: error.message,
        confirmationId,
      };
    }
  }
}
```

## 实施计划

### Phase 1: 服务端优化（1-2周）
- [ ] 添加数据库索引
- [ ] 实现消息序列号服务
- [ ] 完善 WebSocket 心跳检测
- [ ] 实现消息路由层

### Phase 2: 前端 SDK 重构（2-3周）
- [ ] 替换 Mock 数据为真实 API
- [ ] 实现消息重试机制
- [ ] 实现离线消息同步
- [ ] 完善 WebSocket 客户端

### Phase 3: 架构完善（2-3周）
- [ ] 实现消息持久化确认
- [ ] 完善 Bot 平台集成
- [ ] 添加监控和日志
- [ ] 性能优化

### Phase 4: 测试和文档（1-2周）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 更新文档

## 性能目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 消息发送延迟 | < 500ms | < 100ms |
| 消息投递成功率 | 99% | 99.99% |
| 并发连接数 | 1000 | 10000 |
| 消息查询速度 | < 100ms | < 50ms |
| 离线消息同步 | 手动 | 自动 |

## 监控指标

```typescript
// 关键监控指标
interface IMAnalytics {
  // 消息指标
  messagesSent: Counter;
  messagesDelivered: Counter;
  messagesFailed: Counter;
  messageLatency: Histogram;

  // 连接指标
  activeConnections: Gauge;
  connectionErrors: Counter;
  reconnectionAttempts: Counter;

  // 性能指标
  databaseQueryTime: Histogram;
  redisOperationTime: Histogram;
  websocketLatency: Histogram;
}
```

---

*文档版本: 1.0*  
*最后更新: 2026-02-01*
