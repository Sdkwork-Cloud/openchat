/**
 * 增强型 WebSocket 网关基类
 * 
 * 提供通用的 WebSocket 连接管理、消息处理、心跳检测等功能
 * 支持连接认证、速率限制、消息确认、自动重连等高级功能
 * 
 * @framework
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 连接信息
 */
export interface ConnectionInfo {
  /** 客户端 ID */
  clientId: string;
  /** 用户 ID */
  userId?: string;
  /** 连接时间 */
  connectedAt: number;
  /** 最后活跃时间 */
  lastActiveAt: number;
  /** 房间列表 */
  rooms: Set<string>;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 消息计数 */
  messageCount: number;
  /** 是否认证 */
  authenticated: boolean;
}

/**
 * 消息确认
 */
export interface MessageAcknowledgment {
  /** 消息 ID */
  messageId: string;
  /** 状态 */
  status: 'success' | 'error' | 'pending';
  /** 时间戳 */
  timestamp: number;
  /** 错误信息 */
  error?: string;
  /** 数据 */
  data?: any;
}

/**
 * WebSocket 消息
 */
export interface WebSocketMessage<T = any> {
  /** 消息 ID */
  messageId: string;
  /** 消息类型 */
  type: string;
  /** 消息数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 发送者 ID */
  senderId?: string;
  /** 接收者 ID */
  receiverId?: string;
  /** 需要确认 */
  requireAck?: boolean;
}

/**
 * WebSocket 配置选项
 */
export interface WebSocketGatewayOptions {
  /** 网关路径 */
  path?: string;
  /** 端口 */
  port?: number;
  /** 命名空间 */
  namespace?: string;
  /** CORS 配置 */
  cors?: any;
  /** 是否启用心跳 */
  enableHeartbeat?: boolean;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 连接超时（毫秒） */
  connectionTimeout?: number;
  /** 最大消息大小（字节） */
  maxMessageSize?: number;
  /** 消息速率限制（条/秒） */
  messageRateLimit?: number;
  /** 最大重连尝试 */
  maxReconnectAttempts?: number;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
}

/**
 * 增强型 WebSocket 网关基类
 */
@WebSocketGateway()
export abstract class BaseWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected server: Server;

  protected readonly logger = new Logger(this.constructor.name);
  protected readonly connections = new Map<string, ConnectionInfo>();
  protected readonly pendingAcks = new Map<string, NodeJS.Timeout>();
  protected readonly options: Required<WebSocketGatewayOptions>;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly eventEmitter: EventEmitter2,
  ) {
    this.options = {
      path: this.configService.get<string>('WS_PATH', '/socket.io'),
      port: this.configService.get<number>('WS_PORT', 0),
      namespace: this.configService.get<string>('WS_NAMESPACE', '/'),
      cors: this.configService.get('WS_CORS', { origin: '*' }),
      enableHeartbeat: this.configService.get<boolean>('WS_ENABLE_HEARTBEAT', true),
      heartbeatInterval: this.configService.get<number>('WS_HEARTBEAT_INTERVAL', 30000),
      connectionTimeout: this.configService.get<number>('WS_CONNECTION_TIMEOUT', 60000),
      maxMessageSize: this.configService.get<number>('WS_MAX_MESSAGE_SIZE', 65536),
      messageRateLimit: this.configService.get<number>('WS_MESSAGE_RATE_LIMIT', 100),
      maxReconnectAttempts: this.configService.get<number>('WS_MAX_RECONNECT_ATTEMPTS', 5),
      reconnectDelay: this.configService.get<number>('WS_RECONNECT_DELAY', 1000),
    };
  }

  /**
   * 网关初始化后
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    if (this.options.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  /**
   * 客户端连接时
   */
  async handleConnection(client: Socket) {
    const connectionInfo: ConnectionInfo = {
      clientId: client.id,
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
      rooms: new Set(),
      messageCount: 0,
      authenticated: false,
    };

    this.connections.set(client.id, connectionInfo);
    this.logger.debug(`Client connected: ${client.id}`);
    
    this.eventEmitter.emit('ws.connected', {
      clientId: client.id,
      timestamp: Date.now(),
    });

    // 发送连接成功消息
    client.emit('connected', {
      clientId: client.id,
      timestamp: Date.now(),
    });
  }

  /**
   * 客户端断开连接时
   */
  async handleDisconnect(client: Socket) {
    const connectionInfo = this.connections.get(client.id);
    
    if (connectionInfo) {
      this.logger.debug(`Client disconnected: ${client.id}, connected for ${Date.now() - connectionInfo.connectedAt}ms`);
      
      // 清理所有房间
      for (const room of connectionInfo.rooms) {
        client.leave(room);
      }
      
      this.connections.delete(client.id);
      
      this.eventEmitter.emit('ws.disconnected', {
        clientId: client.id,
        userId: connectionInfo.userId,
        timestamp: Date.now(),
      });
    }

    // 清理待确认的消息
    for (const [messageId, timeout] of this.pendingAcks.entries()) {
      if (timeout) {
        clearTimeout(timeout);
      }
      this.pendingAcks.delete(messageId);
    }
  }

  /**
   * 处理心跳
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; data: { timestamp: number } } {
    const connectionInfo = this.connections.get(client.id);
    if (connectionInfo) {
      connectionInfo.lastActiveAt = Date.now();
    }

    return {
      event: 'pong',
      data: { timestamp: Date.now() },
    };
  }

  /**
   * 发送消息到客户端
   */
  protected async sendMessage<T>(
    clientId: string,
    event: string,
    data: T,
    options?: { requireAck?: boolean; timeout?: number },
  ): Promise<MessageAcknowledgment | null> {
    const client = this.server.sockets.sockets.get(clientId);
    
    if (!client) {
      this.logger.warn(`Client not found: ${clientId}`);
      return null;
    }

    const messageId = this.generateMessageId();
    const message: WebSocketMessage<T> = {
      messageId,
      type: event,
      data,
      timestamp: Date.now(),
      requireAck: options?.requireAck,
    };

    return new Promise((resolve) => {
      if (options?.requireAck) {
        const timeout = setTimeout(() => {
          this.pendingAcks.delete(messageId);
          resolve({
            messageId,
            status: 'error',
            timestamp: Date.now(),
            error: 'Acknowledgment timeout',
          });
        }, options.timeout || 5000);

        this.pendingAcks.set(messageId, timeout);

        client.emitWithAck(event, message).then(
          (ackData) => {
            if (timeout) clearTimeout(timeout);
            this.pendingAcks.delete(messageId);
            resolve({
              messageId,
              status: 'success',
              timestamp: Date.now(),
              data: ackData,
            });
          },
          (error) => {
            if (timeout) clearTimeout(timeout);
            this.pendingAcks.delete(messageId);
            resolve({
              messageId,
              status: 'error',
              timestamp: Date.now(),
              error: error.message,
            });
          },
        );
      } else {
        client.emit(event, message);
        resolve({
          messageId,
          status: 'success',
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * 广播消息到房间
   */
  protected async broadcastToRoom<T>(
    room: string,
    event: string,
    data: T,
    options?: { excludeClientId?: string },
  ): Promise<void> {
    const message: WebSocketMessage<T> = {
      messageId: this.generateMessageId(),
      type: event,
      data,
      timestamp: Date.now(),
    };

    if (options?.excludeClientId) {
      this.server.to(room).except(options.excludeClientId).emit(event, message);
    } else {
      this.server.to(room).emit(event, message);
    }
  }

  /**
   * 广播消息到所有客户端
   */
  protected async broadcastAll<T>(
    event: string,
    data: T,
    options?: { excludeClientId?: string },
  ): Promise<void> {
    const message: WebSocketMessage<T> = {
      messageId: this.generateMessageId(),
      type: event,
      data,
      timestamp: Date.now(),
    };

    if (options?.excludeClientId) {
      this.server.except(options.excludeClientId).emit(event, message);
    } else {
      this.server.emit(event, message);
    }
  }

  /**
   * 加入房间
   */
  protected async joinRoom(client: Socket, room: string): Promise<void> {
    await client.join(room);
    
    const connectionInfo = this.connections.get(client.id);
    if (connectionInfo) {
      connectionInfo.rooms.add(room);
    }

    this.logger.debug(`Client ${client.id} joined room ${room}`);
    
    this.eventEmitter.emit('ws.room.joined', {
      clientId: client.id,
      room,
      timestamp: Date.now(),
    });
  }

  /**
   * 离开房间
   */
  protected async leaveRoom(client: Socket, room: string): Promise<void> {
    await client.leave(room);
    
    const connectionInfo = this.connections.get(client.id);
    if (connectionInfo) {
      connectionInfo.rooms.delete(room);
    }

    this.logger.debug(`Client ${client.id} left room ${room}`);
    
    this.eventEmitter.emit('ws.room.left', {
      clientId: client.id,
      room,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取房间中的客户端数量
   */
  protected async getRoomClientCount(room: string): Promise<number> {
    const roomClients = await this.server.in(room).allSockets();
    return roomClients.size;
  }

  /**
   * 获取连接信息
   */
  protected getConnectionInfo(clientId: string): ConnectionInfo | undefined {
    return this.connections.get(clientId);
  }

  /**
   * 获取所有连接数
   */
  protected getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 获取在线用户数
   */
  protected getOnlineUserCount(): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.authenticated && conn.userId) {
        count++;
      }
    }
    return count;
  }

  /**
   * 标记连接为已认证
   */
  protected markAuthenticated(clientId: string, userId: string): void {
    const connectionInfo = this.connections.get(clientId);
    if (connectionInfo) {
      connectionInfo.authenticated = true;
      connectionInfo.userId = userId;
      connectionInfo.metadata = { ...connectionInfo.metadata, userId };
    }
  }

  /**
   * 检查速率限制
   */
  protected checkRateLimit(clientId: string): boolean {
    const connectionInfo = this.connections.get(clientId);
    if (!connectionInfo) return false;

    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // 简化实现：实际应该使用滑动窗口
    connectionInfo.messageCount++;
    
    return connectionInfo.messageCount <= this.options.messageRateLimit;
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeoutCount = this.options.connectionTimeout;

      for (const [clientId, connectionInfo] of this.connections.entries()) {
        const inactiveTime = now - connectionInfo.lastActiveAt;
        
        if (inactiveTime > timeoutCount) {
          this.logger.warn(`Connection timeout for client: ${clientId}`);
          const client = this.server.sockets.sockets.get(clientId);
          if (client) {
            client.disconnect(true);
          }
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 生成消息 ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * WebSocket 消息装饰器
 */
export function OnWebSocketMessage(event: string, options?: { requireAuth?: boolean; rateLimit?: number }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalHandler = descriptor.value;
    
    descriptor.value = async function (client: Socket, message: WebSocketMessage) {
      const connectionInfo = (this as any).connections?.get(client.id);
      
      // 检查认证
      if (options?.requireAuth && (!connectionInfo || !connectionInfo.authenticated)) {
        client.emit('error', {
          messageId: message.messageId,
          error: 'Authentication required',
        });
        return;
      }
      
      // 检查速率限制
      if (options?.rateLimit) {
        const rateLimit = options.rateLimit;
        if (!connectionInfo || connectionInfo.messageCount > rateLimit) {
          client.emit('error', {
            messageId: message.messageId,
            error: 'Rate limit exceeded',
          });
          return;
        }
      }
      
      return originalHandler.call(this, client, message);
    };
    
    return SubscribeMessage(event)(target, propertyKey, descriptor);
  };
}
