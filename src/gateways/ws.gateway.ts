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
import { Logger, Inject, UseGuards, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { WsJwtGuard } from './ws-jwt.guard';
import { WsThrottlerGuard } from '../common/throttler/ws-throttler.guard';
import { WsAckRetryService } from './services/ws-ack-retry.service';
import { WsGroupSessionCommandService } from './services/ws-group-session-command.service';
import { WsMessageAckCommandService } from './services/ws-message-ack-command.service';
import { WsMessageCommandService } from './services/ws-message-command.service';
import { WsMessageEventEmitterService } from './services/ws-message-event-emitter.service';
import { WsMessageTelemetryService } from './services/ws-message-telemetry.service';
import { WsRtcSessionCommandService } from './services/ws-rtc-session-command.service';
import { WsSystemMessageService } from './services/ws-system-message.service';
import { WsTypingIndicatorService } from './services/ws-typing-indicator.service';
import {
  MAX_ACK_BATCH_SIZE,
  isAckStatus,
  isConversationType,
  isNonNegativeSafeInteger,
  isPlainObject,
  isValidRtcSignalPayload,
  normalizeIdentifier,
  normalizeMessageContent,
  normalizeMessageTypeToken,
  normalizeRtcSignalType,
} from './utils/ws-payload-validator.util';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from '../common/redis/redis.constants';
import { RedisService } from '../common/redis/redis.service';
import { PrometheusService } from '../common/metrics/prometheus.service';
import { EventBusService, EventTypeConstants, IEvent } from '../common/events/event-bus.service';
import { MessageService } from '../modules/message/message.service';
import { FriendService } from '../modules/friend/friend.service';
import { GroupService } from '../modules/group/group.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * 客户端信息接口
 */
interface ClientInfo {
  userId: string;
  deviceId?: string;
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
  clientSeq?: number;
  idempotencyKey?: string;
  needReadReceipt?: boolean;
  extra?: Record<string, unknown>;
  timestamp?: number;
  requireAck?: boolean;
}

/**
 * 消息确认接口
 */
interface MessageAckPayload {
  messageId: string;
  fromUserId?: string;
  toUserId?: string;
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
  signal: unknown;
  type: 'offer' | 'answer' | 'ice-candidate';
}

interface ConversationSeqAckPayload {
  targetId: string;
  type: 'single' | 'group';
  ackSeq: number;
  deviceId?: string;
}

interface ConversationSeqAckBatchPayload {
  deviceId?: string;
  items: ConversationSeqAckPayload[];
}

interface PresenceSubscriptionPayload {
  userIds?: unknown;
}

interface TypingIndicatorPayload {
  toUserId?: unknown;
  groupId?: unknown;
}

const MAX_PRESENCE_SUBSCRIPTION_BATCH = 500;
const PRESENCE_ACL_ALLOWED_CACHE_TTL_MS = 60000;
const MAX_PRESENCE_ACL_ALLOWED_CACHE_SIZE = 50000;
const PRESENCE_ACL_CHANGED_EVENT_TYPE = 'presence.acl.changed';
const PRESENCE_ACL_ALLOWED_CACHE_KEY_DELIMITER = '\u0001';
const OFFLINE_CLEANUP_LOCK_KEY = 'ws:cleanup:offline-users';
const OFFLINE_CLEANUP_LOCK_TTL_MS = 55000;

interface PresenceAclChangedEventPayload {
  type?: unknown;
  affectedUserIds?: unknown;
}

interface PresenceAclCacheRuntimeStats {
  hits: number;
  misses: number;
  invalidations: Record<string, number>;
  startedAt: string;
  hitRate: number;
  totalAccesses: number;
}

interface PresenceAclAllowedCacheEntry {
  requesterUserId: string;
  targetUserId: string;
  expiresAt: number;
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
  private ackCheckInterval: NodeJS.Timeout;
  private presenceAclAllowedCache = new Map<string, PresenceAclAllowedCacheEntry>();
  private presenceAclAllowedCacheIndex = new Map<string, Set<string>>();
  private presenceAclEventUnsubscribe?: () => void;
  private presenceAclCacheHits = 0;
  private presenceAclCacheMisses = 0;
  private presenceAclCacheInvalidations = new Map<string, number>();
  private readonly presenceAclCacheStatsStartedAt = new Date();

  // 标记是否已订阅跨服务器消息
  private isSubscribed = false;

  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subClient: Redis,
    private readonly redisService: RedisService,
    private readonly messageService: MessageService,
    private readonly wsAckRetryService: WsAckRetryService,
    private readonly wsGroupSessionCommandService: WsGroupSessionCommandService,
    private readonly wsTypingIndicatorService: WsTypingIndicatorService,
    private readonly wsMessageAckCommandService: WsMessageAckCommandService,
    private readonly wsMessageCommandService: WsMessageCommandService,
    private readonly wsRtcSessionCommandService: WsRtcSessionCommandService,
    private readonly wsMessageEventEmitter: WsMessageEventEmitterService,
    private readonly wsMessageTelemetryService: WsMessageTelemetryService,
    private readonly wsSystemMessageService: WsSystemMessageService,
    @Optional() private readonly prometheusService?: PrometheusService,
    @Optional() @Inject(FriendService) private readonly friendService?: Pick<FriendService, 'getFriendIds'>,
    @Optional() @Inject(GroupService) private readonly groupService?: Pick<GroupService, 'getUsersWithSharedJoinedGroups'>,
    @Optional() @Inject(EventBusService) private readonly eventBusService?: Pick<EventBusService, 'subscribe'>,
  ) {
    const serverIdSeed = typeof uuidv4 === 'function' ? uuidv4() : undefined;
    const serverIdSuffix = (
      typeof serverIdSeed === 'string' && serverIdSeed.length > 0
        ? serverIdSeed
        : `${Date.now()}`
    ).slice(0, 8);
    this.serverId = `${process.env.POD_NAME || 'server'}-${process.pid}-${serverIdSuffix}`;

    this.logger.log(
      `Gateway initialized with serverId: ${this.serverId}, ackTimeout: ${this.wsAckRetryService.getAckTimeout()}ms, maxRetry: ${this.wsAckRetryService.getMaxRetryCount()}`,
    );
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
      this.subscribePresenceAclInvalidationEvents();
      this.updatePresenceAclCacheGauge();

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
      this.prometheusService?.incrementWsValidationFailure('gateway', 'connection', 'missing_ip');
      this.logger.warn(`Client ${client.id} has no IP address`);
      client.disconnect(true);
      return;
    }

    const connectionCount = await this.redisService.increment(`conn:ip:${ip}`, 300);

    if (connectionCount > 10) {
      this.prometheusService?.incrementWsValidationFailure('gateway', 'connection', 'ip_connection_limit_exceeded');
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

      const becameOffline = await this.redisService.removeUserSocket(clientInfo.userId, client.id);
      if (becameOffline) {
        await this.broadcastUserStatus(clientInfo.userId, 'offline');
      }
      this.logger.log(`User ${clientInfo.userId} disconnected from socket ${client.id}`);
    }

    const ip = client.handshake?.address;
    if (ip) {
      await this.redisService.decrement(`conn:ip:${ip}`);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { userId?: string } | undefined,
    @ConnectedSocket() client: Socket,
  ) {
    const resolvedUser = this.resolveAuthenticatedUser(client, data?.userId);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'register',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }

    const userId = resolvedUser.userId;
    const socketUser = (client as Socket & { user?: Record<string, unknown> }).user;
    const clientInfo: ClientInfo = {
      userId,
      deviceId: this.normalizeDeviceIdCandidate(socketUser?.deviceId),
      socketId: client.id,
      serverId: this.serverId,
      connectedAt: Date.now(),
    };
    this.localClients.set(client.id, clientInfo);

    if (!this.localUserSockets.has(userId)) {
      this.localUserSockets.set(userId, new Set());
    }
    this.localUserSockets.get(userId)!.add(client.id);

    const becameOnline = await this.redisService.addUserSocket(userId, client.id, this.serverId);
    await this.redisService.updateUserHeartbeat(userId);

    await client.join(`user:${userId}`);

    this.logger.log(`User ${userId} registered with socket ${client.id}`);
    if (becameOnline) {
      await this.broadcastUserStatus(userId, 'online');
    }

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
    return this.validationFailure('heartbeat', 'not_registered', 'Not registered');
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('syncAckSeq')
  async handleSyncAckSeq(
    @MessageBody() data: ConversationSeqAckPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const resolvedUser = this.resolveAuthenticatedUser(client);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'sync_ack_seq',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }

    const targetId = normalizeIdentifier(data?.targetId);
    if (!targetId || !isConversationType(data?.type)) {
      return this.validationFailure('sync_ack_seq', 'invalid_target_or_type', 'targetId and type are required');
    }
    if (!isNonNegativeSafeInteger(data?.ackSeq)) {
      return this.validationFailure('sync_ack_seq', 'invalid_ack_seq', 'ackSeq must be a non-negative integer');
    }

    const resolvedDevice = this.resolveDeviceId(client, data?.deviceId);
    if (resolvedDevice.error) {
      return this.validationFailure('sync_ack_seq', 'invalid_device', resolvedDevice.error);
    }

    const result = resolvedDevice.deviceId
      ? await this.messageService.ackConversationSeq(
          resolvedUser.userId,
          {
            targetId,
            type: data.type,
            ackSeq: data.ackSeq,
          },
          { deviceId: resolvedDevice.deviceId },
        )
      : await this.messageService.ackConversationSeq(resolvedUser.userId, {
          targetId,
          type: data.type,
          ackSeq: data.ackSeq,
        });

    if (result.success) {
      client.emit('syncStateUpdated', result.state);
    }

    return result;
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('syncAckSeqBatch')
  async handleSyncAckSeqBatch(
    @MessageBody() data: ConversationSeqAckBatchPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const resolvedUser = this.resolveAuthenticatedUser(client);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'sync_ack_seq_batch',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }

    if (!Array.isArray(data?.items)) {
      return this.validationFailure('sync_ack_seq_batch', 'invalid_items_array', 'items must be an array');
    }
    if (data.items.length > MAX_ACK_BATCH_SIZE) {
      return this.validationFailure(
        'sync_ack_seq_batch',
        'batch_too_large',
        `items exceeds max batch size ${MAX_ACK_BATCH_SIZE}`,
      );
    }

    const normalizedItems: ConversationSeqAckPayload[] = [];
    for (let i = 0; i < data.items.length; i += 1) {
      const item = data.items[i];
      const targetId = normalizeIdentifier(item?.targetId);
      if (!targetId || !isConversationType(item?.type) || !isNonNegativeSafeInteger(item?.ackSeq)) {
        return this.validationFailure(
          'sync_ack_seq_batch',
          'invalid_batch_item',
          `invalid ack item at index ${i}`,
        );
      }
      normalizedItems.push({
        targetId,
        type: item.type,
        ackSeq: item.ackSeq,
      });
    }

    const resolvedDevice = this.resolveDeviceId(client, data?.deviceId);
    if (resolvedDevice.error) {
      return this.validationFailure('sync_ack_seq_batch', 'invalid_device', resolvedDevice.error);
    }

    const batchResult = resolvedDevice.deviceId
      ? await this.messageService.ackConversationSeqBatch(
          resolvedUser.userId,
          normalizedItems,
          { deviceId: resolvedDevice.deviceId },
        )
      : await this.messageService.ackConversationSeqBatch(resolvedUser.userId, normalizedItems);

    client.emit('syncStateBatchUpdated', batchResult);
    return batchResult;
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: MessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isPlainObject(data)) {
      return this.validationFailure('message_single', 'invalid_payload', 'Invalid payload');
    }
    const {
      toUserId,
      messageId,
      content,
      type,
      fromUserId,
      requireAck = true,
      clientSeq,
      idempotencyKey,
      needReadReceipt,
      extra,
    } = data;

    const normalizedToUserId = normalizeIdentifier(toUserId);
    const normalizedMessageId = normalizeIdentifier(messageId);
    if (!normalizedToUserId || !normalizedMessageId) {
      return this.validationFailure('message_single', 'missing_required_fields', 'Missing required fields');
    }
    const normalizedType = normalizeMessageTypeToken(type);
    if (!normalizedType) {
      return this.validationFailure('message_single', 'invalid_message_type', 'Invalid message type');
    }
    const normalizedContent = normalizeMessageContent(content);
    if (normalizedContent === undefined) {
      return this.validationFailure('message_single', 'invalid_message_content', 'Invalid message content');
    }
    if (requireAck !== undefined && typeof requireAck !== 'boolean') {
      return this.validationFailure('message_single', 'invalid_require_ack', 'requireAck must be a boolean');
    }
    if (clientSeq !== undefined && !isNonNegativeSafeInteger(clientSeq)) {
      return this.validationFailure('message_single', 'invalid_client_seq', 'clientSeq must be a non-negative integer');
    }
    const normalizedIdempotencyKey = idempotencyKey !== undefined
      ? normalizeIdentifier(idempotencyKey)
      : undefined;
    if (idempotencyKey !== undefined && !normalizedIdempotencyKey) {
      return this.validationFailure('message_single', 'invalid_idempotency_key', 'Invalid idempotencyKey');
    }
    if (needReadReceipt !== undefined && typeof needReadReceipt !== 'boolean') {
      return this.validationFailure(
        'message_single',
        'invalid_need_read_receipt',
        'needReadReceipt must be a boolean',
      );
    }
    if (extra !== undefined && !isPlainObject(extra)) {
      return this.validationFailure('message_single', 'invalid_extra', 'extra must be an object');
    }

    const resolvedSender = this.resolveRegisteredClientUser(client, fromUserId);
    if (resolvedSender.error || !resolvedSender.userId) {
      return this.validationFailure(
        'message_single',
        'invalid_sender',
        resolvedSender.error || 'Client not authenticated',
      );
    }
    const authenticatedUserId = resolvedSender.userId;

    return this.wsMessageCommandService.sendSingleMessage({
      server: this.server,
      client,
      fromUserId: authenticatedUserId,
      toUserId: normalizedToUserId,
      clientMessageId: normalizedMessageId,
      content: normalizedContent,
      type: normalizedType,
      requireAck,
      clientSeq,
      idempotencyKey: normalizedIdempotencyKey,
      needReadReceipt,
      extra,
    });
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('messageAck')
  async handleMessageAck(
    @MessageBody() data: MessageAckPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isPlainObject(data)) {
      return this.validationFailure('message_ack', 'invalid_payload', 'Invalid payload');
    }
    const { messageId, status } = data;
    const resolvedUser = this.resolveAuthenticatedUser(client);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'message_ack',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }
    const normalizedMessageId = normalizeIdentifier(messageId);
    if (!normalizedMessageId) {
      return this.validationFailure('message_ack', 'invalid_message_id', 'messageId is required');
    }
    if (!isAckStatus(status)) {
      return this.validationFailure('message_ack', 'invalid_ack_status', 'Invalid ack status');
    }
    return this.wsMessageAckCommandService.execute({
      server: this.server,
      authenticatedUserId: resolvedUser.userId,
      messageId: normalizedMessageId,
      status,
    });
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('sendGroupMessage')
  async handleSendGroupMessage(
    @MessageBody() data: {
      groupId: string;
      fromUserId: string;
      messageId: string;
      content: string;
      type: string;
      clientSeq?: number;
      idempotencyKey?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (!isPlainObject(data)) {
      return this.validationFailure('message_group', 'invalid_payload', 'Invalid payload');
    }
    const {
      groupId,
      messageId,
      fromUserId,
      content,
      type,
      clientSeq,
      idempotencyKey,
    } = data;

    const normalizedGroupId = normalizeIdentifier(groupId);
    const normalizedMessageId = normalizeIdentifier(messageId);
    if (!normalizedGroupId || !normalizedMessageId) {
      return this.validationFailure('message_group', 'missing_required_fields', 'Missing required fields');
    }
    const normalizedType = normalizeMessageTypeToken(type);
    if (!normalizedType) {
      return this.validationFailure('message_group', 'invalid_message_type', 'Invalid message type');
    }
    const normalizedContent = normalizeMessageContent(content);
    if (normalizedContent === undefined) {
      return this.validationFailure('message_group', 'invalid_message_content', 'Invalid message content');
    }
    if (clientSeq !== undefined && !isNonNegativeSafeInteger(clientSeq)) {
      return this.validationFailure('message_group', 'invalid_client_seq', 'clientSeq must be a non-negative integer');
    }
    const normalizedIdempotencyKey = idempotencyKey !== undefined
      ? normalizeIdentifier(idempotencyKey)
      : undefined;
    if (idempotencyKey !== undefined && !normalizedIdempotencyKey) {
      return this.validationFailure('message_group', 'invalid_idempotency_key', 'Invalid idempotencyKey');
    }

    const resolvedSender = this.resolveRegisteredClientUser(
      client,
      fromUserId,
      `group ${normalizedGroupId}`,
    );
    if (resolvedSender.error || !resolvedSender.userId) {
      return this.validationFailure(
        'message_group',
        'invalid_sender',
        resolvedSender.error || 'Client not authenticated',
      );
    }
    const authenticatedUserId = resolvedSender.userId;

    return this.wsMessageCommandService.sendGroupMessage({
      server: this.server,
      client,
      fromUserId: authenticatedUserId,
      groupId: normalizedGroupId,
      clientMessageId: normalizedMessageId,
      content: normalizedContent,
      type: normalizedType,
      clientSeq,
      idempotencyKey: normalizedIdempotencyKey,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const groupId = normalizeIdentifier(data?.groupId);
    if (!groupId) {
      return this.validationFailure('group_session', 'invalid_group_id', 'groupId is required');
    }
    const resolvedUser = this.resolveAuthenticatedUser(client, data.userId);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'group_session',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }
    return this.wsGroupSessionCommandService.joinGroup({
      client,
      userId: resolvedUser.userId,
      groupId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(
    @MessageBody() data: { groupId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const groupId = normalizeIdentifier(data?.groupId);
    if (!groupId) {
      return this.validationFailure('group_session', 'invalid_group_id', 'groupId is required');
    }
    const resolvedUser = this.resolveAuthenticatedUser(client, data.userId);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'group_session',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }
    return this.wsGroupSessionCommandService.leaveGroup({
      client,
      userId: resolvedUser.userId,
      groupId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('rtcSignal')
  async handleRTCSignal(
    @MessageBody() data: RTCSignalPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isPlainObject(data)) {
      return this.validationFailure('rtc_signal', 'invalid_payload', 'Invalid payload');
    }
    const resolvedUser = this.resolveAuthenticatedUser(client);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'rtc_signal',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }
    const toUserId = normalizeIdentifier(data?.toUserId);
    const roomId = normalizeIdentifier(data?.roomId);
    const signalType = normalizeRtcSignalType(data?.type);
    const fromUserId = data?.fromUserId
      ? normalizeIdentifier(data.fromUserId)
      : undefined;
    if (!toUserId || !roomId || !signalType) {
      return this.validationFailure('rtc_signal', 'invalid_signal_identifiers', 'Invalid rtc signal payload');
    }
    if (!isValidRtcSignalPayload(data.signal)) {
      return this.validationFailure('rtc_signal', 'invalid_signal_payload', 'Invalid rtc signal payload');
    }
    if (data.fromUserId && !fromUserId) {
      return this.validationFailure('rtc_signal', 'invalid_sender', 'Invalid sender');
    }
    return this.wsRtcSessionCommandService.relaySignal({
      client,
      authenticatedUserId: resolvedUser.userId,
      payload: {
        fromUserId,
        toUserId,
        roomId,
        type: signalType,
        signal: data.signal,
      },
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = normalizeIdentifier(data?.roomId);
    if (!roomId) {
      return this.validationFailure('rtc_room', 'invalid_room_id', 'roomId is required');
    }
    const resolvedUser = this.resolveAuthenticatedUser(client, data.userId);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'rtc_room',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }
    return this.wsRtcSessionCommandService.joinRoom({
      client,
      authenticatedUserId: resolvedUser.userId,
      roomId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = normalizeIdentifier(data?.roomId);
    if (!roomId) {
      return this.validationFailure('rtc_room', 'invalid_room_id', 'roomId is required');
    }
    const resolvedUser = this.resolveAuthenticatedUser(client, data.userId);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'rtc_room',
        'invalid_authenticated_user',
        resolvedUser.error || 'Authentication payload missing',
      );
    }
    return this.wsRtcSessionCommandService.leaveRoom({
      client,
      authenticatedUserId: resolvedUser.userId,
      roomId,
    });
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('typingStart')
  async handleTypingStart(
    @MessageBody() data: TypingIndicatorPayload,
    @ConnectedSocket() client: Socket,
  ) {
    return this.handleTypingIndicatorChange(data, client, true);
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('typingStop')
  async handleTypingStop(
    @MessageBody() data: TypingIndicatorPayload,
    @ConnectedSocket() client: Socket,
  ) {
    return this.handleTypingIndicatorChange(data, client, false);
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('presenceSubscribe')
  async handlePresenceSubscribe(
    @MessageBody() data: PresenceSubscriptionPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isPlainObject(data)) {
      return this.validationFailure('presence_subscription', 'invalid_payload', 'Invalid payload');
    }

    const resolvedUser = this.resolveRegisteredClientUser(client);
    if (resolvedUser.error) {
      return this.validationFailure(
        'presence_subscription',
        'unregistered_client',
        resolvedUser.error,
      );
    }

    const normalized = this.normalizePresenceUserIds(data.userIds);
    if (!normalized.userIds || normalized.error || normalized.errorCode) {
      return this.validationFailure(
        'presence_subscription',
        normalized.errorCode || 'invalid_user_ids',
        normalized.error || 'Invalid presence subscription userIds',
      );
    }

    const acl = await this.authorizePresenceSubscriptionTargets(resolvedUser.userId!, normalized.userIds);
    if (!acl.authorizedUserIds || acl.error || acl.errorCode) {
      return this.validationFailure(
        'presence_subscription',
        acl.errorCode || 'forbidden_targets',
        acl.error || 'Forbidden presence subscription targets',
      );
    }

    const rooms = acl.authorizedUserIds.map((userId) => `presence:user:${userId}`);
    await client.join(rooms);
    return { success: true, subscribed: acl.authorizedUserIds.length };
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('presenceUnsubscribe')
  async handlePresenceUnsubscribe(
    @MessageBody() data: PresenceSubscriptionPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isPlainObject(data)) {
      return this.validationFailure('presence_subscription', 'invalid_payload', 'Invalid payload');
    }

    const resolvedUser = this.resolveRegisteredClientUser(client);
    if (resolvedUser.error) {
      return this.validationFailure(
        'presence_subscription',
        'unregistered_client',
        resolvedUser.error,
      );
    }

    const normalized = this.normalizePresenceUserIds(data.userIds);
    if (!normalized.userIds || normalized.error || normalized.errorCode) {
      return this.validationFailure(
        'presence_subscription',
        normalized.errorCode || 'invalid_user_ids',
        normalized.error || 'Invalid presence subscription userIds',
      );
    }

    const rooms = normalized.userIds.map((userId) => `presence:user:${userId}`);
    await Promise.all(rooms.map((room) => client.leave(room)));
    return { success: true, unsubscribed: normalized.userIds.length };
  }

  private async handleTypingIndicatorChange(
    data: TypingIndicatorPayload,
    client: Socket,
    isTyping: boolean,
  ): Promise<Record<string, unknown>> {
    if (!isPlainObject(data)) {
      return this.validationFailure('typing_indicator', 'invalid_payload', 'Invalid payload');
    }

    const resolvedUser = this.resolveRegisteredClientUser(client);
    if (resolvedUser.error || !resolvedUser.userId) {
      return this.validationFailure(
        'typing_indicator',
        'unregistered_client',
        resolvedUser.error || 'Client not authenticated',
      );
    }

    return this.wsTypingIndicatorService.dispatchTyping({
      server: this.server,
      client,
      authenticatedUserId: resolvedUser.userId,
      target: {
        toUserId: typeof data.toUserId === 'string' ? data.toUserId : undefined,
        groupId: typeof data.groupId === 'string' ? data.groupId : undefined,
      },
      isTyping,
    });
  }

  private getAuthenticatedUserId(client: Socket): string | null {
    const payload = (client as Socket & { user?: Record<string, unknown> }).user;
    const normalizedUserId = normalizeIdentifier(payload?.userId);
    if (!normalizedUserId) {
      return null;
    }
    return normalizedUserId;
  }

  private resolveAuthenticatedUser(
    client: Socket,
    requestedUserId?: string,
  ): { userId?: string; error?: string } {
    const authenticatedUserId = this.getAuthenticatedUserId(client);
    if (!authenticatedUserId) {
      return { error: 'Authentication payload missing' };
    }

    if (requestedUserId !== undefined) {
      const normalizedRequestedUserId = normalizeIdentifier(requestedUserId);
      if (!normalizedRequestedUserId) {
        return { error: 'Invalid user identity' };
      }
      if (normalizedRequestedUserId !== authenticatedUserId) {
        this.logger.warn(`User ${authenticatedUserId} attempted to operate as ${normalizedRequestedUserId}`);
        return { error: 'Invalid user identity' };
      }
    }

    return { userId: authenticatedUserId };
  }

  private resolveRegisteredClientUser(
    client: Socket,
    claimedUserId?: string,
    context?: string,
  ): { userId?: string; error?: string } {
    const clientInfo = this.localClients.get(client.id);
    if (!clientInfo) {
      return { error: 'Client not authenticated' };
    }

    if (claimedUserId !== undefined) {
      const normalizedClaimedUserId = normalizeIdentifier(claimedUserId);
      if (!normalizedClaimedUserId) {
        return { error: 'Invalid sender' };
      }
      if (normalizedClaimedUserId === clientInfo.userId) {
        return { userId: clientInfo.userId };
      }
      const suffix = context ? ` in ${context}` : '';
      this.logger.warn(`User ${clientInfo.userId} attempted to spoof sender as ${normalizedClaimedUserId}${suffix}`);
      return { error: 'Invalid sender' };
    }

    return { userId: clientInfo.userId };
  }

  private resolveDeviceId(
    client: Socket,
    hintedDeviceId?: string,
  ): { deviceId?: string; error?: string } {
    const socketUser = (client as Socket & { user?: Record<string, unknown> }).user;
    const trustedCandidate = this.normalizeDeviceIdCandidate(socketUser?.deviceId);
    const hasHintedDeviceId = hintedDeviceId !== undefined;
    const hintedCandidate = this.normalizeDeviceIdCandidate(hintedDeviceId);

    if (hasHintedDeviceId && !hintedCandidate) {
      return { error: 'Invalid deviceId format' };
    }

    if (hintedCandidate && !trustedCandidate) {
      return { error: 'deviceId must be bound to authenticated token' };
    }

    if (trustedCandidate && hintedCandidate && trustedCandidate !== hintedCandidate) {
      return { error: 'deviceId does not match authenticated device' };
    }

    if (trustedCandidate) {
      return { deviceId: trustedCandidate };
    }

    return {};
  }

  private normalizeDeviceIdCandidate(candidate: unknown): string | undefined {
    const rawValue = Array.isArray(candidate) ? candidate[0] : candidate;
    if (typeof rawValue !== 'string') {
      return undefined;
    }

    const normalized = rawValue.trim();
    if (!normalized) {
      return undefined;
    }

    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return undefined;
    }

    return normalized;
  }

  private validationFailure(
    domain: string,
    errorCode: string,
    error: string,
  ): { success: false; error: string } {
    this.prometheusService?.incrementWsValidationFailure('gateway', domain, errorCode);
    return { success: false, error };
  }

  private normalizePresenceUserIds(
    value: unknown,
  ): { userIds?: string[]; error?: string; errorCode?: string } {
    if (!Array.isArray(value)) {
      return { error: 'userIds must be an array', errorCode: 'invalid_user_ids' };
    }
    if (value.length === 0) {
      return { error: 'userIds must not be empty', errorCode: 'empty_user_ids' };
    }
    if (value.length > MAX_PRESENCE_SUBSCRIPTION_BATCH) {
      return {
        error: `userIds exceeds max batch size ${MAX_PRESENCE_SUBSCRIPTION_BATCH}`,
        errorCode: 'presence_batch_too_large',
      };
    }

    const deduplicated: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < value.length; i += 1) {
      const normalizedUserId = normalizeIdentifier(value[i]);
      if (!normalizedUserId) {
        return {
          error: `invalid userId at index ${i}`,
          errorCode: 'invalid_user_id_item',
        };
      }
      if (seen.has(normalizedUserId)) {
        continue;
      }
      seen.add(normalizedUserId);
      deduplicated.push(normalizedUserId);
    }

    if (deduplicated.length === 0) {
      return { error: 'userIds must not be empty', errorCode: 'empty_user_ids' };
    }

    return { userIds: deduplicated };
  }

  private async authorizePresenceSubscriptionTargets(
    requesterUserId: string,
    targetUserIds: string[],
  ): Promise<{ authorizedUserIds?: string[]; error?: string; errorCode?: string }> {
    const normalizedRequesterUserId = normalizeIdentifier(requesterUserId);
    if (!normalizedRequesterUserId) {
      return { error: 'Invalid authenticated user', errorCode: 'invalid_authenticated_user' };
    }

    if (!this.friendService) {
      return { error: 'Presence ACL service unavailable', errorCode: 'acl_unavailable' };
    }

    if (!this.groupService) {
      return { error: 'Presence ACL service unavailable', errorCode: 'acl_unavailable' };
    }

    let friendIds: string[] = [];
    try {
      friendIds = await this.friendService.getFriendIds(normalizedRequesterUserId);
    } catch (error: any) {
      this.logger.error(
        `Failed to evaluate presence ACL for ${normalizedRequesterUserId}: ${error?.message || error}`,
      );
      return { error: 'Presence ACL service unavailable', errorCode: 'acl_unavailable' };
    }

    const allowedTargets = new Set<string>([normalizedRequesterUserId, ...friendIds]);
    const pendingGroupAclTargets: string[] = [];
    for (const targetUserId of targetUserIds) {
      if (allowedTargets.has(targetUserId)) {
        continue;
      }
      if (this.isPresenceAclAllowedCacheHit(normalizedRequesterUserId, targetUserId)) {
        allowedTargets.add(targetUserId);
        continue;
      }
      pendingGroupAclTargets.push(targetUserId);
    }
    if (pendingGroupAclTargets.length > 0) {
      try {
        const sharedGroupUserIds = await this.groupService.getUsersWithSharedJoinedGroups(
          normalizedRequesterUserId,
          pendingGroupAclTargets,
        );
        for (const sharedGroupUserId of sharedGroupUserIds) {
          allowedTargets.add(sharedGroupUserId);
          this.cachePresenceAclAllowed(normalizedRequesterUserId, sharedGroupUserId);
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to evaluate shared-group presence ACL for ${normalizedRequesterUserId}: ${error?.message || error}`,
        );
        return { error: 'Presence ACL service unavailable', errorCode: 'acl_unavailable' };
      }
    }

    const unauthorizedExists = targetUserIds.some((targetUserId) => !allowedTargets.has(targetUserId));
    if (unauthorizedExists) {
      return { error: 'Forbidden presence subscription targets', errorCode: 'forbidden_targets' };
    }

    return { authorizedUserIds: targetUserIds };
  }

  private isPresenceAclAllowedCacheHit(requesterUserId: string, targetUserId: string): boolean {
    const cacheKey = this.buildPresenceAclAllowedCacheKey(requesterUserId, targetUserId);
    const cacheEntry = this.presenceAclAllowedCache.get(cacheKey);
    if (!cacheEntry) {
      this.recordPresenceAclCacheAccess('miss');
      return false;
    }
    if (cacheEntry.expiresAt < Date.now()) {
      this.deletePresenceAclAllowedCacheEntry(cacheKey);
      this.recordPresenceAclCacheInvalidation('expired_ttl');
      this.updatePresenceAclCacheGauge();
      this.recordPresenceAclCacheAccess('miss');
      return false;
    }
    this.recordPresenceAclCacheAccess('hit');
    return true;
  }

  private cachePresenceAclAllowed(requesterUserId: string, targetUserId: string): void {
    if (requesterUserId === targetUserId) {
      return;
    }

    if (this.presenceAclAllowedCache.size >= MAX_PRESENCE_ACL_ALLOWED_CACHE_SIZE) {
      const removedExpiredEntries = this.evictExpiredPresenceAclAllowedCacheEntries(5000);
      if (removedExpiredEntries > 0) {
        this.recordPresenceAclCacheInvalidation('expired_scan', removedExpiredEntries);
      }
      if (this.presenceAclAllowedCache.size >= MAX_PRESENCE_ACL_ALLOWED_CACHE_SIZE) {
        const oldestKey = this.presenceAclAllowedCache.keys().next().value;
        if (oldestKey) {
          this.deletePresenceAclAllowedCacheEntry(oldestKey);
          this.recordPresenceAclCacheInvalidation('capacity', 1);
        }
      }
    }

    const cacheKey = this.buildPresenceAclAllowedCacheKey(requesterUserId, targetUserId);
    this.presenceAclAllowedCache.set(cacheKey, {
      requesterUserId,
      targetUserId,
      expiresAt: Date.now() + PRESENCE_ACL_ALLOWED_CACHE_TTL_MS,
    });
    this.linkPresenceAclCacheIndex(requesterUserId, cacheKey);
    this.linkPresenceAclCacheIndex(targetUserId, cacheKey);
    this.updatePresenceAclCacheGauge();
  }

  private evictExpiredPresenceAclAllowedCacheEntries(limit: number): number {
    const now = Date.now();
    let scanned = 0;
    let deletedCount = 0;
    for (const [cacheKey, cacheEntry] of this.presenceAclAllowedCache) {
      if (scanned >= limit) {
        break;
      }
      scanned += 1;
      if (cacheEntry.expiresAt < now) {
        this.deletePresenceAclAllowedCacheEntry(cacheKey);
        deletedCount += 1;
      }
    }
    if (deletedCount > 0) {
      this.updatePresenceAclCacheGauge();
    }
    return deletedCount;
  }

  private buildPresenceAclAllowedCacheKey(requesterUserId: string, targetUserId: string): string {
    return `${requesterUserId}${PRESENCE_ACL_ALLOWED_CACHE_KEY_DELIMITER}${targetUserId}`;
  }

  private subscribePresenceAclInvalidationEvents(): void {
    if (!this.eventBusService || this.presenceAclEventUnsubscribe) {
      return;
    }

    this.presenceAclEventUnsubscribe = this.eventBusService.subscribe<IEvent<PresenceAclChangedEventPayload>>(
      EventTypeConstants.CUSTOM_EVENT,
      (event) => {
        this.handlePresenceAclChangedEvent(event);
      },
      { async: true },
    );
  }

  private handlePresenceAclChangedEvent(event: IEvent<PresenceAclChangedEventPayload>): void {
    const payload = event?.data;
    if (!isPlainObject(payload)) {
      return;
    }

    if (payload.type !== PRESENCE_ACL_CHANGED_EVENT_TYPE) {
      return;
    }

    const normalizedUserIds = this.normalizePresenceAclChangedUserIds(payload.affectedUserIds);
    if (normalizedUserIds.length === 0) {
      return;
    }

    const clearedEntries = this.invalidatePresenceAclAllowedCacheForUsers(normalizedUserIds, 'event');
    if (clearedEntries > 0) {
      this.logger.debug(
        `Invalidated ${clearedEntries} presence ACL cache entries for users [${normalizedUserIds.join(',')}]`,
      );
    }
  }

  private normalizePresenceAclChangedUserIds(value: unknown): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      return [];
    }

    const deduplicatedUserIds = new Set<string>();
    for (const candidate of value) {
      const normalizedUserId = normalizeIdentifier(candidate);
      if (normalizedUserId) {
        deduplicatedUserIds.add(normalizedUserId);
      }
    }

    return [...deduplicatedUserIds];
  }

  private invalidatePresenceAclAllowedCacheForUsers(userIds: string[], trigger: string): number {
    if (userIds.length === 0 || this.presenceAclAllowedCache.size === 0) {
      return 0;
    }

    const cacheKeysToDelete = new Set<string>();
    for (const userId of userIds) {
      const relatedCacheKeys = this.presenceAclAllowedCacheIndex.get(userId);
      if (!relatedCacheKeys) {
        continue;
      }
      for (const cacheKey of relatedCacheKeys) {
        cacheKeysToDelete.add(cacheKey);
      }
    }

    let deletedCount = 0;
    for (const cacheKey of cacheKeysToDelete) {
      if (this.deletePresenceAclAllowedCacheEntry(cacheKey)) {
        deletedCount += 1;
      }
    }

    if (deletedCount > 0) {
      this.recordPresenceAclCacheInvalidation(trigger, deletedCount);
      this.updatePresenceAclCacheGauge();
    }

    return deletedCount;
  }

  private linkPresenceAclCacheIndex(userId: string, cacheKey: string): void {
    const existing = this.presenceAclAllowedCacheIndex.get(userId);
    if (existing) {
      existing.add(cacheKey);
      return;
    }

    this.presenceAclAllowedCacheIndex.set(userId, new Set([cacheKey]));
  }

  private unlinkPresenceAclCacheIndex(userId: string, cacheKey: string): void {
    const existing = this.presenceAclAllowedCacheIndex.get(userId);
    if (!existing) {
      return;
    }

    existing.delete(cacheKey);
    if (existing.size === 0) {
      this.presenceAclAllowedCacheIndex.delete(userId);
    }
  }

  private deletePresenceAclAllowedCacheEntry(cacheKey: string): boolean {
    const cacheEntry = this.presenceAclAllowedCache.get(cacheKey);
    if (!cacheEntry) {
      return false;
    }

    this.presenceAclAllowedCache.delete(cacheKey);
    this.unlinkPresenceAclCacheIndex(cacheEntry.requesterUserId, cacheKey);
    this.unlinkPresenceAclCacheIndex(cacheEntry.targetUserId, cacheKey);
    return true;
  }

  private updatePresenceAclCacheGauge(): void {
    this.prometheusService?.setWsPresenceAclCacheEntries(this.presenceAclAllowedCache.size);
  }

  private recordPresenceAclCacheAccess(result: 'hit' | 'miss', value: number = 1): void {
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }
    if (result === 'hit') {
      this.presenceAclCacheHits += safeValue;
    } else {
      this.presenceAclCacheMisses += safeValue;
    }
    this.prometheusService?.incrementWsPresenceAclCacheAccess(result, safeValue);
  }

  private recordPresenceAclCacheInvalidation(trigger: string, value: number = 1): void {
    const safeValue = Math.max(0, Math.trunc(value));
    if (safeValue <= 0) {
      return;
    }
    this.presenceAclCacheInvalidations.set(
      trigger,
      (this.presenceAclCacheInvalidations.get(trigger) || 0) + safeValue,
    );
    this.prometheusService?.incrementWsPresenceAclCacheInvalidation(trigger, safeValue);
  }

  private buildPresenceAclCacheRuntimeStats(): PresenceAclCacheRuntimeStats {
    const totalAccesses = this.presenceAclCacheHits + this.presenceAclCacheMisses;
    const hitRate = totalAccesses > 0 ? this.presenceAclCacheHits / totalAccesses : 0;
    const invalidations: Record<string, number> = {};
    for (const [trigger, count] of this.presenceAclCacheInvalidations.entries()) {
      invalidations[trigger] = count;
    }

    return {
      hits: this.presenceAclCacheHits,
      misses: this.presenceAclCacheMisses,
      invalidations,
      startedAt: this.presenceAclCacheStatsStartedAt.toISOString(),
      hitRate: Number(hitRate.toFixed(4)),
      totalAccesses,
    };
  }

  private startAckCheckTask() {
    this.ackCheckInterval = setInterval(() => {
      void this.checkPendingAcks();
    }, 5000);
  }

  private async checkPendingAcks() {
    await this.wsAckRetryService.processDueAcks(this.serverId, this.server);
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
    this.wsSystemMessageService.handleRawSystemMessage(channel, message, this.server, this.localClients);
  };

  private async broadcastUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    const normalizedUserId = normalizeIdentifier(userId);
    if (!normalizedUserId) {
      this.prometheusService?.incrementWsValidationFailure('gateway', 'presence', 'invalid_user_id');
      this.logger.warn(`Skipped status broadcast for invalid userId: ${userId}`);
      return;
    }

    try {
      const presenceVersion = await this.redisService.nextUserPresenceVersion(normalizedUserId);
      const payload = {
        userId: normalizedUserId,
        status,
        presenceVersion,
        source: 'ws_gateway',
      };
      this.wsMessageEventEmitter.emitToRoom(this.server, `presence:user:${normalizedUserId}`, 'userStatusChanged', payload);
      this.wsMessageEventEmitter.emitToUser(this.server, normalizedUserId, 'userStatusChanged', payload);
    } catch (error: any) {
      this.prometheusService?.incrementWsValidationFailure('gateway', 'presence', 'broadcast_failed');
      this.logger.error(
        `Failed to broadcast user status for ${normalizedUserId}: ${error?.message || error}`,
      );
    }
  }

  private startServerHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      await this.redisService.updateServerHeartbeat(this.serverId);
    }, 10000);
  }

  private startCleanupTask() {
    this.cleanupInterval = setInterval(async () => {
      try {
        const lockAcquired = await this.redisService.acquireLock(
          OFFLINE_CLEANUP_LOCK_KEY,
          OFFLINE_CLEANUP_LOCK_TTL_MS,
        );
        if (!lockAcquired) {
          return;
        }

        const offlineUsers = await this.redisService.cleanupOfflineUsers();
        if (offlineUsers.length > 0) {
          this.logger.log(`Cleaned up ${offlineUsers.length} offline users`);
          await Promise.allSettled(offlineUsers.map((userId) => this.broadcastUserStatus(userId, 'offline')));
        }
      } catch (error: any) {
        this.logger.error('Error in cleanup task', error);
      }
    }, 60000);
  }

  async notifyUser(userId: string, event: string, data: Record<string, unknown>): Promise<void> {
    this.wsMessageEventEmitter.emitToUser(this.server, userId, event, data);
  }

  async notifyUsers(userIds: string[], event: string, data: Record<string, unknown>): Promise<void> {
    this.wsMessageEventEmitter.emitToUsers(this.server, userIds, event, data);
  }

  async notifyRoom(roomId: string, event: string, data: Record<string, unknown>): Promise<void> {
    this.wsMessageEventEmitter.emitToGroup(this.server, roomId, event, data);
  }

  async broadcast(event: string, data: Record<string, unknown>): Promise<void> {
    this.wsMessageEventEmitter.emitBroadcast(this.server, event, data);
  }

  async getOnlineStats() {
    const totalOnline = await this.redisService.getOnlineUserCount();
    const localClients = this.localClients.size;
    const messageTelemetry = this.wsMessageTelemetryService.getMonitoringSnapshot(5);
    const presenceAclCache = {
      entries: this.presenceAclAllowedCache.size,
      maxEntries: MAX_PRESENCE_ACL_ALLOWED_CACHE_SIZE,
      ttlMs: PRESENCE_ACL_ALLOWED_CACHE_TTL_MS,
      runtime: this.buildPresenceAclCacheRuntimeStats(),
    };

    return {
      totalOnline,
      localClients,
      serverId: this.serverId,
      messageTelemetry,
      presenceAclCache,
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

    if (this.presenceAclEventUnsubscribe) {
      try {
        this.presenceAclEventUnsubscribe();
      } catch (error) {
        this.logger.error('Error unsubscribing from presence ACL events:', error);
      } finally {
        this.presenceAclEventUnsubscribe = undefined;
      }
    }

    this.presenceAclAllowedCache.clear();
    this.presenceAclAllowedCacheIndex.clear();
    this.updatePresenceAclCacheGauge();

    this.logger.log('WebSocket gateway resources cleaned up');
  }
}
