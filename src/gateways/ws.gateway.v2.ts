import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, UseGuards, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { WsJwtGuard } from './ws-jwt.guard';
import { WsThrottlerGuard } from '../common/throttler/ws-throttler.guard';
import { RedisService } from '../common/redis/redis.service';
import { IMProviderService } from '../modules/im-provider/im-provider.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * 客户端信息接口
 */
interface ClientInfo {
  userId: string;
  socketId: string;
  serverId: string;
  connectedAt: number;
}

/**
 * 消息载荷接口
 */
interface MessagePayload {
  fromUserId: string;
  toUserId: string;
  messageId: string;
  content: string;
  type: string;
  timestamp?: number;
  requireAck?: boolean;
}

/**
 * 消息确认接口
 */
interface MessageAckPayload {
  messageId: string;
  fromUserId: string;
  toUserId: string;
  status: 'delivered' | 'read';
  timestamp: number;
}

/**
 * RTC 信令接口
 */
interface RTCSignalPayload {
  fromUserId: string;
  toUserId: string;
  roomId: string;
  signal: any;
  type: 'offer' | 'answer' | 'ice-candidate';
}

/**
 * 改进的 WebSocket Gateway
 * 支持 Redis Adapter 实现水平扩展
 * 支持分布式状态管理
 * 支持消息确认机制 (ACK)
 */
@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: (origin, callback) => {
      // 允许特定域名，生产环境需要配置
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5172',
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  // 连接限制：单个IP最大连接数
  maxHttpBufferSize: 1e6, // 1MB
})
export class WSGatewayV2 implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WSGatewayV2.name);
  private readonly serverId: string;
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  // 本地缓存（仅用于当前服务器实例）
  private localClients = new Map<string, ClientInfo>(); // socketId -> ClientInfo
  private localUserSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  // 消息确认相关
  private pendingAcks = new Map<string, {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    timestamp: number;
    retryCount: number;
  }>(); // messageId -> ack info

  private readonly ACK_TIMEOUT = 30000; // 30秒超时
  private readonly MAX_RETRY_COUNT = 3; // 最大重试次数
  private ackCheckInterval: NodeJS.Timeout;

  constructor(
    @Inject('REDIS_PUB_CLIENT') private readonly pubClient: Redis,
    @Inject('REDIS_SUB_CLIENT') private readonly subClient: Redis,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly wsThrottlerGuard: WsThrottlerGuard,
    private readonly imProviderService: IMProviderService,
  ) {
    // 生成唯一的服务器实例ID
    this.serverId = `${process.env.POD_NAME || 'server'}-${process.pid}-${uuidv4().slice(0, 8)}`;
    this.logger.log(`Gateway initialized with serverId: ${this.serverId}`);
  }

  /**
   * Gateway 初始化
   * 启动定时任务
   * Redis Adapter 已在 AppModule 中配置
   */
  async afterInit(server: Server) {
    try {
      this.logger.log('WebSocket gateway initialized successfully');
      
      // Redis Adapter 已在 AppModule 中通过 WsAdapter 配置

      // 注册当前服务器节点
      try {
        await this.redisService.registerServer(this.serverId);
      } catch (redisError) {
        this.logger.warn('Failed to register server with Redis, running in single-instance mode:', redisError.message);
      }

      // 启动服务器心跳
      this.startServerHeartbeat();

      // 启动离线用户清理任务
      this.startCleanupTask();

      // 启动消息确认检查任务
      this.startAckCheckTask();

      // 订阅跨服务器消息
      try {
        this.subscribeCrossServerMessages();
      } catch (redisError) {
        this.logger.warn('Failed to subscribe to cross-server messages, running in single-instance mode:', redisError.message);
      }
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket gateway', error);
      // 不要抛出错误，让应用程序继续运行
    }
  }

  /**
   * 客户端连接处理
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} from ${client.handshake.address}`);

    // 检查连接限制
    const ip = client.handshake.address;
    const connectionsFromIp = await this.getConnectionsFromIp(ip);
    if (connectionsFromIp >= 10) {
      this.logger.warn(`Connection limit exceeded for IP: ${ip}`);
      client.disconnect(true);
      return;
    }

    // 存储IP连接计数
    await this.redisService.set(`conn:ip:${ip}`, (connectionsFromIp + 1).toString(), 300);
  }

  /**
   * 客户端断开连接处理
   */
  async handleDisconnect(client: Socket) {
    const clientInfo = this.localClients.get(client.id);

    if (clientInfo) {
      // 从本地缓存移除
      this.localClients.delete(client.id);

      // 更新本地用户socket集合
      const userSockets = this.localUserSockets.get(clientInfo.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.localUserSockets.delete(clientInfo.userId);
        }
      }

      // 从 Redis 移除用户socket
      await this.redisService.removeUserSocket(clientInfo.userId, client.id);

      this.logger.log(`User ${clientInfo.userId} disconnected from socket ${client.id}`);
    }

    // 减少IP连接计数
    const ip = client.handshake.address;
    const connectionsFromIp = await this.getConnectionsFromIp(ip);
    if (connectionsFromIp > 0) {
      await this.redisService.set(`conn:ip:${ip}`, (connectionsFromIp - 1).toString(), 300);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 用户注册 - 绑定用户ID到socket
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    if (!userId) {
      return { success: false, error: 'UserId is required' };
    }

    // 存储客户端信息到本地缓存
    const clientInfo: ClientInfo = {
      userId,
      socketId: client.id,
      serverId: this.serverId,
      connectedAt: Date.now(),
    };
    this.localClients.set(client.id, clientInfo);

    // 更新本地用户socket集合
    if (!this.localUserSockets.has(userId)) {
      this.localUserSockets.set(userId, new Set());
    }
    this.localUserSockets.get(userId)!.add(client.id);

    // 存储到 Redis（分布式状态）
    await this.redisService.addUserSocket(userId, client.id, this.serverId);
    await this.redisService.updateUserHeartbeat(userId);

    // 加入用户专属房间（用于跨服务器消息推送）
    await client.join(`user:${userId}`);

    this.logger.log(`User ${userId} registered with socket ${client.id}`);

    // 广播用户上线状态给好友
    this.broadcastUserStatus(userId, 'online');

    return {
      success: true,
      message: 'Registered successfully',
      serverId: this.serverId,
    };
  }

  /**
   * 心跳检测
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const clientInfo = this.localClients.get(client.id);
    if (clientInfo) {
      await this.redisService.updateUserHeartbeat(clientInfo.userId);
      return { success: true, timestamp: Date.now() };
    }
    return { success: false, error: 'Not registered' };
  }

  /**
   * 发送私聊消息（支持ACK）
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: MessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { toUserId, messageId, content, type, fromUserId, requireAck = true } = data;

    if (!toUserId || !messageId) {
      return { success: false, error: 'Missing required fields' };
    }

    const message: MessagePayload = {
      ...data,
      timestamp: Date.now(),
    };

    try {
      // 1. 通过悟空IM Provider发送消息（主要消息传递通道）
      const imMessage = {
        type,
        content: { text: content }, // 适配悟空IM的消息格式
        from: fromUserId,
        to: toUserId,
      };

      await this.imProviderService.sendMessage(imMessage);
      this.logger.debug(`Message ${messageId} sent via WukongIM from ${fromUserId} to ${toUserId}`);

      // 2. 使用 Socket.io 发送实时通知（作为补充，确保实时性）
      this.server.to(`user:${toUserId}`).emit('newMessage', message);

      // 3. 如果需要确认，添加到待确认列表
      if (requireAck) {
        this.pendingAcks.set(messageId, {
          messageId,
          fromUserId,
          toUserId,
          timestamp: Date.now(),
          retryCount: 0,
        });
      }

      // 4. 同时发送给自己（多端同步）
      const clientInfo = this.localClients.get(client.id);
      if (clientInfo && clientInfo.userId === fromUserId) {
        client.emit('messageSent', { messageId, status: 'sent', timestamp: Date.now() });
      }

      this.logger.debug(`Message ${messageId} sent from ${fromUserId} to ${toUserId}`);

      return { success: true, messageId, status: 'sent', timestamp: Date.now() };
    } catch (error: any) {
      this.logger.error(`Failed to send message ${messageId}:`, error);
      
      // 通知发送方消息发送失败
      const clientInfo = this.localClients.get(client.id);
      if (clientInfo && clientInfo.userId === fromUserId) {
        client.emit('messageFailed', {
          messageId,
          error: `Failed to send message: ${error.message || 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
      
      return { success: false, error: `Failed to send message: ${error.message || 'Unknown error'}`, messageId };
    }
  }

  /**
   * 消息确认（ACK）
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('messageAck')
  async handleMessageAck(
    @MessageBody() data: MessageAckPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { messageId, fromUserId, status } = data;

    // 从待确认列表中移除
    if (this.pendingAcks.has(messageId)) {
      this.pendingAcks.delete(messageId);
      this.logger.debug(`Message ${messageId} acknowledged with status: ${status}`);
    }

    // 通知发送方消息已确认
    this.server.to(`user:${fromUserId}`).emit('messageAcknowledged', {
      messageId,
      status,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  /**
   * 发送群聊消息
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendGroupMessage')
  async handleSendGroupMessage(
    @MessageBody() data: { groupId: string; fromUserId: string; messageId: string; content: string; type: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, messageId, fromUserId, content, type } = data;

    if (!groupId || !messageId) {
      return { success: false, error: 'Missing required fields' };
    }

    const message = {
      ...data,
      timestamp: Date.now(),
    };

    try {
      // 1. 通过悟空IM Provider发送群消息（主要消息传递通道）
      const imMessage = {
        type,
        content: { text: content }, // 适配悟空IM的消息格式
        from: fromUserId,
        to: groupId,
        roomId: groupId,
      };

      await this.imProviderService.sendGroupMessage(imMessage);
      this.logger.debug(`Group message ${messageId} sent via WukongIM to group ${groupId}`);

      // 2. 使用房间广播（作为补充，确保实时性）
      this.server.to(`group:${groupId}`).emit('newGroupMessage', message);

      client.emit('messageSent', { messageId, status: 'sent', timestamp: Date.now() });

      this.logger.debug(`Group message ${messageId} sent to group ${groupId}`);

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send group message ${messageId}:`, error);
      
      // 通知发送方消息发送失败
      client.emit('messageFailed', {
        messageId,
        error: `Failed to send group message: ${error.message || 'Unknown error'}`,
        timestamp: Date.now(),
      });
      
      return { success: false, error: `Failed to send group message: ${error.message || 'Unknown error'}`, messageId };
    }
  }

  /**
   * 加入群组房间
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, userId } = data;

    await client.join(`group:${groupId}`);
    await this.redisService.joinRoom(groupId, userId);

    this.logger.log(`User ${userId} joined group ${groupId}`);

    return { success: true };
  }

  /**
   * 离开群组房间
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupId, userId } = data;

    await client.leave(`group:${groupId}`);
    await this.redisService.leaveRoom(groupId, userId);

    this.logger.log(`User ${userId} left group ${groupId}`);

    return { success: true };
  }

  /**
   * RTC 信令转发
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('rtcSignal')
  async handleRTCSignal(
    @MessageBody() data: RTCSignalPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { toUserId, roomId, signal, type } = data;

    // 转发给目标用户（支持跨服务器）
    this.server.to(`user:${toUserId}`).emit('rtcSignal', {
      ...data,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  /**
   * 加入 RTC 房间
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;

    await client.join(`rtc:${roomId}`);

    // 通知房间内其他用户
    client.to(`rtc:${roomId}`).emit('userJoined', {
      userId,
      roomId,
      timestamp: Date.now(),
    });

    this.logger.log(`User ${userId} joined RTC room ${roomId}`);

    return { success: true };
  }

  /**
   * 离开 RTC 房间
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;

    await client.leave(`rtc:${roomId}`);

    // 通知房间内其他用户
    client.to(`rtc:${roomId}`).emit('userLeft', {
      userId,
      roomId,
      timestamp: Date.now(),
    });

    this.logger.log(`User ${userId} left RTC room ${roomId}`);

    return { success: true };
  }

  /**
   * 启动消息确认检查任务
   */
  private startAckCheckTask() {
    this.ackCheckInterval = setInterval(() => {
      this.checkPendingAcks();
    }, 5000); // 每5秒检查一次
  }

  /**
   * 检查待确认的消息
   */
  private checkPendingAcks() {
    const now = Date.now();

    for (const [messageId, ackInfo] of this.pendingAcks.entries()) {
      const elapsed = now - ackInfo.timestamp;

      if (elapsed > this.ACK_TIMEOUT) {
        if (ackInfo.retryCount < this.MAX_RETRY_COUNT) {
          // 重试发送
          this.retryMessage(ackInfo);
          ackInfo.retryCount++;
          ackInfo.timestamp = now;
        } else {
          // 超过最大重试次数，标记为失败
          this.logger.warn(`Message ${messageId} failed after ${this.MAX_RETRY_COUNT} retries`);
          this.server.to(`user:${ackInfo.fromUserId}`).emit('messageFailed', {
            messageId,
            error: 'Message delivery failed',
            timestamp: now,
          });
          this.pendingAcks.delete(messageId);
        }
      }
    }
  }

  /**
   * 重试发送消息
   */
  private retryMessage(ackInfo: {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    timestamp: number;
    retryCount: number;
  }) {
    this.logger.debug(`Retrying message ${ackInfo.messageId}, attempt ${ackInfo.retryCount + 1}`);

    // 通知发送方正在重试
    this.server.to(`user:${ackInfo.fromUserId}`).emit('messageRetrying', {
      messageId: ackInfo.messageId,
      attempt: ackInfo.retryCount + 1,
      timestamp: Date.now(),
    });

    // 重新发送消息
    this.server.to(`user:${ackInfo.toUserId}`).emit('newMessage', {
      messageId: ackInfo.messageId,
      fromUserId: ackInfo.fromUserId,
      toUserId: ackInfo.toUserId,
      isRetry: true,
      timestamp: Date.now(),
    });
  }

  /**
   * 跨服务器消息订阅
   */
  private subscribeCrossServerMessages() {
    // 订阅系统级消息（如用户被踢下线、系统广播等）
    this.subClient.subscribe('openchat:system');
    this.subClient.on('message', (channel, message) => {
      if (channel === 'openchat:system') {
        const data = JSON.parse(message);
        this.handleSystemMessage(data);
      }
    });
  }

  /**
   * 处理系统消息
   */
  private handleSystemMessage(data: any) {
    switch (data.type) {
      case 'kickUser':
        // 踢用户下线
        this.localClients.forEach((info, socketId) => {
          if (info.userId === data.userId) {
            this.server.sockets.sockets.get(socketId)?.disconnect(true);
          }
        });
        break;
      case 'broadcast':
        // 系统广播
        this.server.emit('systemBroadcast', data.payload);
        break;
    }
  }

  /**
   * 广播用户状态变化
   */
  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    // 这里可以实现向好友列表广播状态
    // 例如：this.server.to(`friends:${userId}`).emit('userStatus', { userId, status });
  }

  /**
   * 获取 IP 连接数
   */
  private async getConnectionsFromIp(ip: string): Promise<number> {
    const count = await this.redisService.get(`conn:ip:${ip}`);
    return parseInt(count || '0', 10);
  }

  /**
   * 启动服务器心跳
   */
  private startServerHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      await this.redisService.updateServerHeartbeat(this.serverId);
    }, 10000); // 每10秒
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask() {
    this.cleanupInterval = setInterval(async () => {
      try {
        const offlineUsers = await this.redisService.cleanupOfflineUsers();
        if (offlineUsers.length > 0) {
          this.logger.log(`Cleaned up ${offlineUsers.length} offline users`);
        }
      } catch (error) {
        this.logger.error('Error in cleanup task', error);
      }
    }, 60000); // 每分钟
  }

  /**
   * ========================
   * 公共服务方法（供其他 Service 调用）
   * ========================
   */

  /**
   * 向指定用户发送消息（支持跨服务器）
   */
  async notifyUser(userId: string, event: string, data: any): Promise<void> {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * 向多个用户发送消息
   */
  async notifyUsers(userIds: string[], event: string, data: any): Promise<void> {
    const rooms = userIds.map((id) => `user:${id}`);
    this.server.to(rooms).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * 向房间广播消息
   */
  async notifyRoom(roomId: string, event: string, data: any): Promise<void> {
    this.server.to(`group:${roomId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * 全服广播
   */
  async broadcast(event: string, data: any): Promise<void> {
    this.server.emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取在线用户统计
   */
  async getOnlineStats() {
    const totalOnline = await this.redisService.getOnlineUserCount();
    const localClients = this.localClients.size;

    return {
      totalOnline,
      localClients,
      serverId: this.serverId,
    };
  }
}
