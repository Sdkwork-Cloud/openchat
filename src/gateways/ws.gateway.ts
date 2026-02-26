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
import { Logger, Inject, UseGuards, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { WsJwtGuard } from './ws-jwt.guard';
import { WsThrottlerGuard } from '../common/throttler/ws-throttler.guard';
import { RedisService } from '../common/redis/redis.service';
import { IMProviderService } from '../modules/im-provider/im-provider.service';
import { GroupMember } from '../modules/group/group-member.entity';
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
 * WebSocket Gateway
 * 支持 Redis Adapter 实现水平扩展
 * 支持分布式状态管理
 * 支持消息确认机制 (ACK)
 */
@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: (origin, callback) => {
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
  maxHttpBufferSize: 1e6,
})
export class WSGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WSGateway.name);
  private readonly serverId: string;
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  private localClients = new Map<string, ClientInfo>();
  private localUserSockets = new Map<string, Set<string>>();
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();

  private pendingAcks = new Map<string, {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    timestamp: number;
    retryCount: number;
  }>();

  private readonly ACK_TIMEOUT: number;
  private readonly MAX_RETRY_COUNT: number;
  private ackCheckInterval: NodeJS.Timeout;

  // 标记是否已订阅跨服务器消息
  private isSubscribed = false;

  constructor(
    @Inject('REDIS_PUB_CLIENT') private readonly pubClient: Redis,
    @Inject('REDIS_SUB_CLIENT') private readonly subClient: Redis,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly wsThrottlerGuard: WsThrottlerGuard,
    private readonly imProviderService: IMProviderService,
    @InjectRepository(GroupMember) private readonly groupMemberRepository: Repository<GroupMember>,
  ) {
    this.serverId = `${process.env.POD_NAME || 'server'}-${process.pid}-${uuidv4().slice(0, 8)}`;
    
    // 从配置读取超时和重试设置
    this.ACK_TIMEOUT = this.configService.get<number>('WS_ACK_TIMEOUT', 30000);
    this.MAX_RETRY_COUNT = this.configService.get<number>('WS_MAX_RETRY_COUNT', 3);
    
    this.logger.log(`Gateway initialized with serverId: ${this.serverId}, ackTimeout: ${this.ACK_TIMEOUT}ms, maxRetry: ${this.MAX_RETRY_COUNT}`);
  }

  async afterInit(server: Server) {
    try {
      this.logger.log('WebSocket gateway initialized successfully');

      try {
        await this.redisService.registerServer(this.serverId);
      } catch (redisError: any) {
        this.logger.warn('Failed to register server with Redis, running in single-instance mode:', redisError.message);
      }

      this.startServerHeartbeat();
      this.startCleanupTask();
      this.startAckCheckTask();

      try {
        this.subscribeCrossServerMessages();
      } catch (redisError: any) {
        this.logger.warn('Failed to subscribe to cross-server messages, running in single-instance mode:', redisError.message);
      }
    } catch (error: any) {
      this.logger.error('Failed to initialize WebSocket gateway', error);
    }
  }

  async handleConnection(client: Socket) {
    const ip = client.handshake?.address || 'unknown';
    this.logger.log(`Client connected: ${client.id} from ${ip}`);

    if (ip === 'unknown') {
      this.logger.warn(`Client ${client.id} has no IP address`);
      client.disconnect(true);
      return;
    }

    const connectionCount = await this.redisService.increment(`conn:ip:${ip}`, 300);

    if (connectionCount > 10) {
      this.logger.warn(`Connection limit exceeded for IP: ${ip}`);
      await this.redisService.decrement(`conn:ip:${ip}`);
      client.disconnect(true);
      return;
    }

    const timeout = setTimeout(() => {
      if (!this.localClients.has(client.id)) {
        this.logger.warn(`Connection timeout for unregistered client: ${client.id}`);
        this.connectionTimeouts.delete(client.id);
        client.disconnect(true);
      }
    }, 30000);
    this.connectionTimeouts.set(client.id, timeout);
  }

  async handleDisconnect(client: Socket) {
    const timeout = this.connectionTimeouts.get(client.id);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(client.id);
    }

    const clientInfo = this.localClients.get(client.id);

    if (clientInfo) {
      this.localClients.delete(client.id);

      const userSockets = this.localUserSockets.get(clientInfo.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.localUserSockets.delete(clientInfo.userId);
        }
      }

      await this.redisService.removeUserSocket(clientInfo.userId, client.id);
      this.logger.log(`User ${clientInfo.userId} disconnected from socket ${client.id}`);
    }

    const ip = client.handshake?.address;
    if (ip) {
      await this.redisService.decrement(`conn:ip:${ip}`);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

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

    const clientInfo: ClientInfo = {
      userId,
      socketId: client.id,
      serverId: this.serverId,
      connectedAt: Date.now(),
    };
    this.localClients.set(client.id, clientInfo);

    if (!this.localUserSockets.has(userId)) {
      this.localUserSockets.set(userId, new Set());
    }
    this.localUserSockets.get(userId)!.add(client.id);

    await this.redisService.addUserSocket(userId, client.id, this.serverId);
    await this.redisService.updateUserHeartbeat(userId);

    await client.join(`user:${userId}`);

    this.logger.log(`User ${userId} registered with socket ${client.id}`);
    this.broadcastUserStatus(userId, 'online');

    return {
      success: true,
      message: 'Registered successfully',
      serverId: this.serverId,
    };
  }

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

    // 从已认证的客户端信息中获取真实用户ID，防止伪造
    const clientInfo = this.localClients.get(client.id);
    if (!clientInfo) {
      return { success: false, error: 'Client not authenticated' };
    }

    const authenticatedUserId = clientInfo.userId;

    // 验证 fromUserId 是否与认证用户一致
    if (fromUserId && fromUserId !== authenticatedUserId) {
      this.logger.warn(`User ${authenticatedUserId} attempted to spoof sender as ${fromUserId}`);
      return { success: false, error: 'Invalid sender' };
    }

    const message: MessagePayload = {
      ...data,
      fromUserId: authenticatedUserId, // 使用认证的用户ID
      timestamp: Date.now(),
    };

    try {
      const imMessage = {
        type,
        content: { text: content },
        from: authenticatedUserId, // 使用认证的用户ID
        to: toUserId,
      };

      await this.imProviderService.sendMessage(imMessage);
      this.logger.debug(`Message ${messageId} sent via WukongIM from ${authenticatedUserId} to ${toUserId}`);

      this.server.to(`user:${toUserId}`).emit('newMessage', message);

      if (requireAck) {
        this.pendingAcks.set(messageId, {
          messageId,
          fromUserId: authenticatedUserId,
          toUserId,
          timestamp: Date.now(),
          retryCount: 0,
        });
      }

      // 通知发送者消息已发送
      client.emit('messageSent', { messageId, status: 'sent', timestamp: Date.now() });

      this.logger.debug(`Message ${messageId} sent from ${authenticatedUserId} to ${toUserId}`);

      return { success: true, messageId, status: 'sent', timestamp: Date.now() };
    } catch (error: any) {
      this.logger.error(`Failed to send message ${messageId}:`, error);

      // 通知发送者消息发送失败
      client.emit('messageFailed', {
        messageId,
        error: `Failed to send message: ${error.message || 'Unknown error'}`,
        timestamp: Date.now(),
      });

      return { success: false, error: `Failed to send message: ${error.message || 'Unknown error'}`, messageId };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('messageAck')
  async handleMessageAck(
    @MessageBody() data: MessageAckPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { messageId, fromUserId, status } = data;

    if (this.pendingAcks.has(messageId)) {
      this.pendingAcks.delete(messageId);
      this.logger.debug(`Message ${messageId} acknowledged with status: ${status}`);
    }

    this.server.to(`user:${fromUserId}`).emit('messageAcknowledged', {
      messageId,
      status,
      timestamp: Date.now(),
    });

    return { success: true };
  }

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

    // 从已认证的客户端信息中获取真实用户ID，防止伪造
    const clientInfo = this.localClients.get(client.id);
    if (!clientInfo) {
      return { success: false, error: 'Client not authenticated' };
    }

    const authenticatedUserId = clientInfo.userId;

    // 验证 fromUserId 是否与认证用户一致
    if (fromUserId && fromUserId !== authenticatedUserId) {
      this.logger.warn(`User ${authenticatedUserId} attempted to spoof sender as ${fromUserId} in group ${groupId}`);
      return { success: false, error: 'Invalid sender' };
    }

    // 检查用户是否是群组成员
    const isMember = await this.isGroupMember(authenticatedUserId, groupId);
    if (!isMember) {
      this.logger.warn(`User ${authenticatedUserId} attempted to send message to group ${groupId} without membership`);
      return { success: false, error: 'You are not a member of this group' };
    }

    const message = {
      ...data,
      fromUserId: authenticatedUserId,
      timestamp: Date.now(),
    };

    try {
      const imMessage = {
        type,
        content: { text: content },
        from: authenticatedUserId,
        to: groupId,
        roomId: groupId,
      };

      await this.imProviderService.sendGroupMessage(imMessage);
      this.logger.debug(`Group message ${messageId} sent via WukongIM to group ${groupId}`);

      this.server.to(`group:${groupId}`).emit('newGroupMessage', message);

      client.emit('messageSent', { messageId, status: 'sent', timestamp: Date.now() });

      this.logger.debug(`Group message ${messageId} sent to group ${groupId}`);

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send group message ${messageId}:`, error);

      client.emit('messageFailed', {
        messageId,
        error: `Failed to send group message: ${error.message || 'Unknown error'}`,
        timestamp: Date.now(),
      });

      return { success: false, error: `Failed to send group message: ${error.message || 'Unknown error'}`, messageId };
    }
  }

  /**
   * 检查用户是否是群组成员
   * 
   * @param userId - 用户ID
   * @param groupId - 群组ID
   * @returns 是否是成员
   */
  private async isGroupMember(userId: string, groupId: string): Promise<boolean> {
    // 从Redis缓存检查
    const cacheKey = `group:member:${groupId}:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached === 'true') {
      return true;
    }

    // 查询数据库验证成员身份
    try {
      const member = await this.groupMemberRepository.findOne({
        where: { groupId, userId }
      });
      
      if (member) {
        // 缓存结果，设置5分钟过期
        await this.redisService.set(cacheKey, 'true', 300);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to check group membership for user ${userId} in group ${groupId}:`, error);
      // 数据库查询失败时，保守起见返回false
      return false;
    }
  }

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

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('rtcSignal')
  async handleRTCSignal(
    @MessageBody() data: RTCSignalPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { toUserId } = data;

    this.server.to(`user:${toUserId}`).emit('rtcSignal', {
      ...data,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;

    await client.join(`rtc:${roomId}`);

    client.to(`rtc:${roomId}`).emit('userJoined', {
      userId,
      roomId,
      timestamp: Date.now(),
    });

    this.logger.log(`User ${userId} joined RTC room ${roomId}`);

    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;

    await client.leave(`rtc:${roomId}`);

    client.to(`rtc:${roomId}`).emit('userLeft', {
      userId,
      roomId,
      timestamp: Date.now(),
    });

    this.logger.log(`User ${userId} left RTC room ${roomId}`);

    return { success: true };
  }

  private startAckCheckTask() {
    this.ackCheckInterval = setInterval(() => {
      this.checkPendingAcks();
    }, 5000);
  }

  private checkPendingAcks() {
    const now = Date.now();

    for (const [messageId, ackInfo] of this.pendingAcks.entries()) {
      const elapsed = now - ackInfo.timestamp;

      if (elapsed > this.ACK_TIMEOUT) {
        if (ackInfo.retryCount < this.MAX_RETRY_COUNT) {
          this.retryMessage(ackInfo);
          ackInfo.retryCount++;
          ackInfo.timestamp = now;
        } else {
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

  private retryMessage(ackInfo: {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    timestamp: number;
    retryCount: number;
  }) {
    this.logger.debug(`Retrying message ${ackInfo.messageId}, attempt ${ackInfo.retryCount + 1}`);

    this.server.to(`user:${ackInfo.fromUserId}`).emit('messageRetrying', {
      messageId: ackInfo.messageId,
      attempt: ackInfo.retryCount + 1,
      timestamp: Date.now(),
    });

    this.server.to(`user:${ackInfo.toUserId}`).emit('newMessage', {
      messageId: ackInfo.messageId,
      fromUserId: ackInfo.fromUserId,
      toUserId: ackInfo.toUserId,
      isRetry: true,
      timestamp: Date.now(),
    });
  }

  private subscribeCrossServerMessages() {
    // 防止重复订阅
    if (this.isSubscribed) {
      return;
    }

    this.subClient.subscribe('openchat:system');
    this.subClient.on('message', this.handleCrossServerMessage);
    this.isSubscribed = true;
    this.logger.log('Subscribed to cross-server messages');
  }

  private handleCrossServerMessage = (channel: string, message: string) => {
    if (channel === 'openchat:system') {
      try {
        const data = JSON.parse(message);
        this.handleSystemMessage(data);
      } catch (error) {
        this.logger.error('Failed to parse system message:', error);
      }
    }
  };

  private handleSystemMessage(data: any) {
    switch (data.type) {
      case 'kickUser':
        this.localClients.forEach((info, socketId) => {
          if (info.userId === data.userId) {
            this.server.sockets.sockets.get(socketId)?.disconnect(true);
          }
        });
        break;
      case 'broadcast':
        this.server.emit('systemBroadcast', data.payload);
        break;
    }
  }

  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    // TODO: 向好友列表广播状态
  }

  private async getConnectionsFromIp(ip: string): Promise<number> {
    const count = await this.redisService.get(`conn:ip:${ip}`);
    return parseInt(count || '0', 10);
  }

  private startServerHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      await this.redisService.updateServerHeartbeat(this.serverId);
    }, 10000);
  }

  private startCleanupTask() {
    this.cleanupInterval = setInterval(async () => {
      try {
        const offlineUsers = await this.redisService.cleanupOfflineUsers();
        if (offlineUsers.length > 0) {
          this.logger.log(`Cleaned up ${offlineUsers.length} offline users`);
        }
      } catch (error: any) {
        this.logger.error('Error in cleanup task', error);
      }
    }, 60000);
  }

  async notifyUser(userId: string, event: string, data: any): Promise<void> {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async notifyUsers(userIds: string[], event: string, data: any): Promise<void> {
    const rooms = userIds.map((id) => `user:${id}`);
    this.server.to(rooms).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async notifyRoom(roomId: string, event: string, data: any): Promise<void> {
    this.server.to(`group:${roomId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async broadcast(event: string, data: any): Promise<void> {
    this.server.emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async getOnlineStats() {
    const totalOnline = await this.redisService.getOnlineUserCount();
    const localClients = this.localClients.size;

    return {
      totalOnline,
      localClients,
      serverId: this.serverId,
    };
  }

  onModuleDestroy() {
    this.logger.log('Cleaning up WebSocket gateway resources...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.ackCheckInterval) {
      clearInterval(this.ackCheckInterval);
    }

    // 清理所有连接超时定时器
    for (const [clientId, timeout] of this.connectionTimeouts) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(clientId);
    }

    // 取消订阅跨服务器消息
    if (this.isSubscribed) {
      try {
        this.subClient.unsubscribe('openchat:system');
        this.subClient.off('message', this.handleCrossServerMessage);
        this.isSubscribed = false;
        this.logger.log('Unsubscribed from cross-server messages');
      } catch (error) {
        this.logger.error('Error unsubscribing from cross-server messages:', error);
      }
    }

    this.logger.log('WebSocket gateway resources cleaned up');
  }
}
