import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { RedisService } from '../common/redis/redis.service';
import { MessageService } from '../modules/message/message.service';
import { MessageReceiptService } from '../modules/message/message-receipt.service';
import { MessageStatus } from '../modules/message/message.interface';
import { WsAckRetryService } from './services/ws-ack-retry.service';
import { WsGroupAuthorizationService } from './services/ws-group-authorization.service';
import { WsGroupSessionCommandService } from './services/ws-group-session-command.service';
import { WsMessageAckCommandService } from './services/ws-message-ack-command.service';
import { WsMessageCommandService } from './services/ws-message-command.service';
import { WsMessageEventEmitterService } from './services/ws-message-event-emitter.service';
import { WsMessageTelemetryService } from './services/ws-message-telemetry.service';
import { WsRtcSessionCommandService } from './services/ws-rtc-session-command.service';
import { WsSystemMessageService } from './services/ws-system-message.service';
import { WsTypingIndicatorService } from './services/ws-typing-indicator.service';
import { WSGateway } from './ws.gateway';

const MESSAGE_REALTIME_FANOUT_EVENT_TYPE = 'message.realtime.fanout';

type MockSocket = Partial<Omit<Socket, 'emit' | 'join' | 'leave' | 'to' | 'handshake'>> & {
  user?: { userId?: string; deviceId?: string };
  emit: jest.Mock;
  join?: jest.Mock;
  leave?: jest.Mock;
  to?: jest.Mock;
  handshake?: Partial<Socket['handshake']>;
};

type AckBatchPayload = {
  items: Array<{ targetId: string; type: 'single' | 'group'; ackSeq: number }>;
};

function createSocket(overrides?: Partial<MockSocket>): MockSocket {
  return {
    emit: jest.fn(),
    ...overrides,
  };
}

function asSocket(client: MockSocket): Socket {
  return client as unknown as Socket;
}

describe('WSGateway', () => {
  let gateway: WSGateway;
  let redisService: {
    getJson: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    zrem: jest.Mock;
    setJson: jest.Mock;
    set: jest.Mock;
    zadd: jest.Mock;
    getOnlineUserCount: jest.Mock;
  };
  let messageService: {
    ackConversationSeq: jest.Mock;
    ackConversationSeqBatch: jest.Mock;
    isUserInGroup: jest.Mock;
    sendMessage: jest.Mock;
    updateMessageStatus: jest.Mock;
  };
  let messageReceiptService: {
    upsertReceipt: jest.Mock;
  };
  let wsAckRetryService: WsAckRetryService;
  let wsGroupAuthorizationService: WsGroupAuthorizationService;
  let wsGroupSessionCommandService: WsGroupSessionCommandService;
  let wsTypingIndicatorService: WsTypingIndicatorService;
  let wsMessageAckCommandService: WsMessageAckCommandService;
  let wsMessageCommandService: WsMessageCommandService;
  let wsRtcSessionCommandService: WsRtcSessionCommandService;
  let rtcService: { getRoomById: jest.Mock };
  let wsMessageEventEmitterService: WsMessageEventEmitterService;
  let wsMessageTelemetryService: WsMessageTelemetryService;
  let wsSystemMessageService: WsSystemMessageService;
  let friendService: { getFriendIds: jest.Mock };
  let groupService: { getUsersWithSharedJoinedGroups: jest.Mock };
  let eventBusService: { subscribe: jest.Mock };
  let customEventHandler: ((event: any) => void) | undefined;

  beforeEach(() => {
    redisService = {
      getJson: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      zrem: jest.fn(),
      setJson: jest.fn(),
      set: jest.fn(),
      zadd: jest.fn(),
      getOnlineUserCount: jest.fn().mockResolvedValue(2),
    };

    messageService = {
      ackConversationSeq: jest.fn(),
      ackConversationSeqBatch: jest.fn(),
      isUserInGroup: jest.fn(),
      sendMessage: jest.fn(),
      updateMessageStatus: jest.fn(),
    };

    messageReceiptService = {
      upsertReceipt: jest.fn(),
    };

    wsMessageEventEmitterService = new WsMessageEventEmitterService();
    wsSystemMessageService = new WsSystemMessageService();
    wsAckRetryService = new WsAckRetryService(
      redisService as unknown as RedisService,
      {
        get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
      } as unknown as ConfigService,
      wsMessageEventEmitterService,
    );
    wsGroupAuthorizationService = new WsGroupAuthorizationService(
      redisService as unknown as RedisService,
      messageService as unknown as MessageService,
    );
    wsGroupSessionCommandService = new WsGroupSessionCommandService(
      redisService as unknown as RedisService,
      wsGroupAuthorizationService,
    );
    wsTypingIndicatorService = new WsTypingIndicatorService(
      wsGroupAuthorizationService,
      wsMessageEventEmitterService,
    );
    wsMessageCommandService = new WsMessageCommandService(
      messageService as unknown as MessageService,
      messageReceiptService as unknown as MessageReceiptService,
      wsAckRetryService,
      wsGroupAuthorizationService,
      wsMessageEventEmitterService,
      new EventEmitter2(),
    );
    wsMessageAckCommandService = new WsMessageAckCommandService(
      messageService as unknown as MessageService,
      messageReceiptService as unknown as MessageReceiptService,
      wsAckRetryService,
      wsMessageEventEmitterService,
      new EventEmitter2(),
    );
    rtcService = {
      getRoomById: jest.fn().mockResolvedValue({
        id: 'room-1',
        status: 'active',
        participants: ['user-1', 'user-2'],
      }),
    };
    wsRtcSessionCommandService = new WsRtcSessionCommandService(
      undefined,
      rtcService as any,
    );
    wsMessageTelemetryService = new WsMessageTelemetryService(
      new EventEmitter2(),
      {
        get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
      } as unknown as ConfigService,
    );
    friendService = {
      getFriendIds: jest.fn().mockResolvedValue(['user-2', 'user-3']),
    };
    groupService = {
      getUsersWithSharedJoinedGroups: jest.fn().mockResolvedValue([]),
    };
    eventBusService = {
      subscribe: jest.fn((_eventName: string, handler: (event: any) => void) => {
        customEventHandler = handler;
        return jest.fn();
      }),
    };

    gateway = new WSGateway(
      {} as unknown as Redis,
      { unsubscribe: jest.fn(), off: jest.fn() } as unknown as Redis,
      redisService as unknown as RedisService,
      messageService as unknown as MessageService,
      wsAckRetryService,
      wsGroupSessionCommandService,
      wsTypingIndicatorService,
      wsMessageAckCommandService,
      wsMessageCommandService,
      wsRtcSessionCommandService,
      wsMessageEventEmitterService,
      wsMessageTelemetryService,
      wsSystemMessageService,
      undefined,
      friendService,
      groupService,
      eventBusService,
    );
  });

  describe('handleSyncAckSeq', () => {
    it('should reject when auth payload missing', async () => {
      const client = createSocket();

      const result = await gateway.handleSyncAckSeq(
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 10,
        },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Authentication payload missing' });
      expect(messageService.ackConversationSeq).not.toHaveBeenCalled();
    });

    it('should reject invalid payload', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });

      const result = await gateway.handleSyncAckSeq(
        {
          targetId: '',
          type: 'single',
          ackSeq: 10,
        },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'targetId and type are required' });
      expect(messageService.ackConversationSeq).not.toHaveBeenCalled();
    });

    it('should emit syncStateUpdated when ack succeeds', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });
      const syncState = {
        targetId: 'user-2',
        type: 'single',
        unreadCount: 0,
        lastReadSeq: 10,
        maxSeq: 10,
        pendingSeq: 0,
        isCaughtUp: true,
        serverTime: '2026-03-07T00:00:00.000Z',
      };
      messageService.ackConversationSeq.mockResolvedValue({
        success: true,
        state: syncState,
      });

      const result = await gateway.handleSyncAckSeq(
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 10,
        },
        asSocket(client),
      );

      expect(messageService.ackConversationSeq).toHaveBeenCalledWith('user-1', {
        targetId: 'user-2',
        type: 'single',
        ackSeq: 10,
      });
      expect(client.emit).toHaveBeenCalledWith('syncStateUpdated', syncState);
      expect(result).toEqual({ success: true, state: syncState });
    });

    it('should not emit syncStateUpdated when ack fails', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });
      messageService.ackConversationSeq.mockResolvedValue({
        success: false,
        error: 'conversation not found',
      });

      const result = await gateway.handleSyncAckSeq(
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 10,
        },
        asSocket(client),
      );

      expect(client.emit).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'conversation not found' });
    });

    it('should pass normalized deviceId when provided in payload', async () => {
      const client = createSocket({ user: { userId: 'user-1', deviceId: 'ios-001' } });
      messageService.ackConversationSeq.mockResolvedValue({
        success: true,
        state: { targetId: 'user-2', type: 'single' },
      });

      await gateway.handleSyncAckSeq(
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 10,
          deviceId: ' ios-001 ',
        },
        asSocket(client),
      );

      expect(messageService.ackConversationSeq).toHaveBeenCalledWith(
        'user-1',
        { targetId: 'user-2', type: 'single', ackSeq: 10 },
        { deviceId: 'ios-001' },
      );
    });

    it('should reject payload deviceId when token is not bound to a device', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });

      const result = await gateway.handleSyncAckSeq(
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 10,
          deviceId: 'ios-001',
        },
        asSocket(client),
      );

      expect(result).toEqual({
        success: false,
        error: 'deviceId must be bound to authenticated token',
      });
      expect(messageService.ackConversationSeq).not.toHaveBeenCalled();
    });

    it('should reject mismatched payload deviceId when authenticated deviceId exists', async () => {
      const client = createSocket({
        user: { userId: 'user-1', deviceId: 'trusted-device' },
      });

      const result = await gateway.handleSyncAckSeq(
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 10,
          deviceId: 'spoofed-device',
        },
        asSocket(client),
      );

      expect(result).toEqual({
        success: false,
        error: 'deviceId does not match authenticated device',
      });
      expect(messageService.ackConversationSeq).not.toHaveBeenCalled();
    });
  });

  describe('handleSyncAckSeqBatch', () => {
    it('should reject when auth payload missing', async () => {
      const client = createSocket();

      const result = await gateway.handleSyncAckSeqBatch(
        {
          items: [],
        },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Authentication payload missing' });
      expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
    });

    it('should reject invalid batch payload', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });

      const result = await gateway.handleSyncAckSeqBatch(
        {} as AckBatchPayload,
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'items must be an array' });
      expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
    });

    it('should emit syncStateBatchUpdated and return batch result', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });
      const batchResult = {
        total: 2,
        updated: 1,
        failed: 1,
        results: [
          { targetId: 'user-2', type: 'single', ackSeq: 100, success: true },
          { targetId: 'group-1', type: 'group', ackSeq: 99, success: false, error: 'not a group member' },
        ],
      };
      messageService.ackConversationSeqBatch.mockResolvedValue(batchResult);

      const result = await gateway.handleSyncAckSeqBatch(
        {
          items: [
            { targetId: 'user-2', type: 'single', ackSeq: 100 },
            { targetId: 'group-1', type: 'group', ackSeq: 99 },
          ],
        },
        asSocket(client),
      );

      expect(messageService.ackConversationSeqBatch).toHaveBeenCalledWith('user-1', [
        { targetId: 'user-2', type: 'single', ackSeq: 100 },
        { targetId: 'group-1', type: 'group', ackSeq: 99 },
      ]);
      expect(client.emit).toHaveBeenCalledWith('syncStateBatchUpdated', batchResult);
      expect(result).toEqual(batchResult);
    });

    it('should reject batch payload deviceId when token is not bound to a device', async () => {
      const client = createSocket({
        user: { userId: 'user-1' },
        handshake: {
          auth: { deviceId: 'web-01' },
        },
      });

      const result = await gateway.handleSyncAckSeqBatch(
        {
          items: [{ targetId: 'user-2', type: 'single', ackSeq: 1 }],
          deviceId: 'web-01',
        },
        asSocket(client),
      );

      expect(result).toEqual({
        success: false,
        error: 'deviceId must be bound to authenticated token',
      });
      expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
    });

    it('should reject mismatched batch payload deviceId when authenticated deviceId exists', async () => {
      const client = createSocket({
        user: { userId: 'user-1', deviceId: 'trusted-device' },
        handshake: {
          auth: { deviceId: 'trusted-device' },
        },
      });

      const result = await gateway.handleSyncAckSeqBatch(
        {
          items: [{ targetId: 'user-2', type: 'single', ackSeq: 1 }],
          deviceId: 'spoofed-device',
        },
        asSocket(client),
      );

      expect(result).toEqual({
        success: false,
        error: 'deviceId does not match authenticated device',
      });
      expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
    });

    it('should reject batch payload when item size exceeds upper bound', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });
      const oversizeItems = Array.from({ length: 201 }, (_, index) => ({
        targetId: `user-${index}`,
        type: 'single' as const,
        ackSeq: index,
      }));

      const result = await gateway.handleSyncAckSeqBatch(
        { items: oversizeItems },
        asSocket(client),
      );

      expect(result).toEqual({
        success: false,
        error: 'items exceeds max batch size 200',
      });
      expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
    });
  });

  describe('payload validation', () => {
    it('should reject sendMessage when message type is invalid', async () => {
      const client = createSocket({ id: 'socket-1' });
      (gateway as any).localClients = new Map([
        ['socket-1', { userId: 'user-1', socketId: 'socket-1', serverId: 'test', connectedAt: Date.now() }],
      ]);

      const result = await gateway.handleSendMessage(
        {
          toUserId: 'user-2',
          fromUserId: 'user-1',
          messageId: 'client-msg-1',
          content: 'hello',
          type: 'text with space',
        } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Invalid message type' });
      expect(messageService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject sendMessage when clientSeq is not non-negative integer', async () => {
      const client = createSocket({ id: 'socket-1' });
      (gateway as any).localClients = new Map([
        ['socket-1', { userId: 'user-1', socketId: 'socket-1', serverId: 'test', connectedAt: Date.now() }],
      ]);

      const result = await gateway.handleSendMessage(
        {
          toUserId: 'user-2',
          fromUserId: 'user-1',
          messageId: 'client-msg-2',
          content: 'hello',
          type: 'text',
          clientSeq: -1,
        },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'clientSeq must be a non-negative integer' });
      expect(messageService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject messageAck when status is invalid', async () => {
      const client = createSocket({ user: { userId: 'user-2' } });
      const result = await gateway.handleMessageAck(
        {
          messageId: 'server-msg-1',
          status: 'received' as any,
          timestamp: Date.now(),
        },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Invalid ack status' });
      expect(messageService.updateMessageStatus).not.toHaveBeenCalled();
    });

    it('should reject rtcSignal when payload is incomplete', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });
      const result = await gateway.handleRTCSignal(
        {
          fromUserId: 'user-1',
          toUserId: '',
          roomId: 'room-1',
          signal: null,
          type: 'offer',
        } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Invalid rtc signal payload' });
    });

    it('should reject rtcSignal offer when sdp payload is missing', async () => {
      const client = createSocket({ user: { userId: 'user-1' } });
      const result = await gateway.handleRTCSignal(
        {
          fromUserId: 'user-1',
          toUserId: 'user-2',
          roomId: 'room-1',
          signal: {},
          type: 'offer',
        } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Invalid rtc signal payload' });
    });
  });

  describe('typing indicators', () => {
    it('should reject typing events when client is not registered', async () => {
      const client = createSocket({ id: 'socket-typing-1' });

      const result = await gateway.handleTypingStart(
        { toUserId: 'user-2' } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Client not authenticated' });
    });

    it('should emit direct typing indicators to target user room', async () => {
      const emit = jest.fn();
      (gateway as any).server = {
        to: jest.fn(() => ({ emit })),
      };
      const client = createSocket({ id: 'socket-typing-2' });
      (gateway as any).localClients.set('socket-typing-2', {
        userId: 'user-1',
        socketId: 'socket-typing-2',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });

      const result = await gateway.handleTypingStart(
        { toUserId: ' user-2 ' } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: true });
      expect((gateway as any).server.to).toHaveBeenCalledWith('user:user-2');
      expect(emit).toHaveBeenCalledWith(
        'typingStatusChanged',
        expect.objectContaining({
          conversationType: 'single',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          isTyping: true,
        }),
      );
    });

    it('should reject group typing indicators for non-members', async () => {
      const emit = jest.fn();
      const client = createSocket({
        id: 'socket-typing-3',
        to: jest.fn(() => ({ emit })),
      });
      (gateway as any).localClients.set('socket-typing-3', {
        userId: 'user-1',
        socketId: 'socket-typing-3',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      messageService.isUserInGroup.mockResolvedValue(false);

      const result = await gateway.handleTypingStart(
        { groupId: 'group-1' } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'You are not a member of this group' });
      expect(client.to).not.toHaveBeenCalled();
    });

    it('should emit group typing stop indicators to other group members', async () => {
      const emit = jest.fn();
      const client = createSocket({
        id: 'socket-typing-4',
        to: jest.fn(() => ({ emit })),
      });
      (gateway as any).localClients.set('socket-typing-4', {
        userId: 'user-1',
        socketId: 'socket-typing-4',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      messageService.isUserInGroup.mockResolvedValue(true);

      const result = await gateway.handleTypingStop(
        { groupId: ' group-1 ' } as any,
        asSocket(client),
      );

      expect(result).toEqual({ success: true });
      expect(messageService.isUserInGroup).toHaveBeenCalledWith('group-1', 'user-1');
      expect(client.to).toHaveBeenCalledWith('group:group-1');
      expect(emit).toHaveBeenCalledWith(
        'typingStatusChanged',
        expect.objectContaining({
          conversationType: 'group',
          fromUserId: 'user-1',
          groupId: 'group-1',
          isTyping: false,
        }),
      );
    });
  });

  describe('message event envelope', () => {
    it('should include event envelope on newMessage and messageSent events', async () => {
      const recipientEmit = jest.fn();
      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: recipientEmit }),
      };
      (gateway as any).localClients = new Map([
        ['socket-1', { userId: 'user-1', socketId: 'socket-1', serverId: 'test', connectedAt: Date.now() }],
      ]);

      messageService.sendMessage.mockResolvedValue({
        success: true,
        message: {
          id: 'server-msg-1',
          status: MessageStatus.SENT,
        },
      });
      messageReceiptService.upsertReceipt.mockResolvedValue(undefined);

      const client = createSocket({ id: 'socket-1' });
      const result = await gateway.handleSendMessage(
        {
          toUserId: 'user-2',
          fromUserId: 'user-1',
          messageId: 'client-msg-1',
          content: 'hello',
          type: 'text',
          requireAck: false,
        },
        asSocket(client),
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          messageId: 'client-msg-1',
          serverMessageId: 'server-msg-1',
        }),
      );

      const newMessagePayload = recipientEmit.mock.calls[0][1];
      expect(recipientEmit.mock.calls[0][0]).toBe('newMessage');
      expect(newMessagePayload).toEqual(
        expect.objectContaining({
          eventType: 'newMessage',
          stateVersion: 1,
          serverMessageId: 'server-msg-1',
          clientMessageId: 'client-msg-1',
          status: MessageStatus.SENT,
        }),
      );
      expect(newMessagePayload.eventId).toEqual(expect.any(String));
      expect(newMessagePayload.occurredAt).toBe(newMessagePayload.timestamp);

      const sentPayload = client.emit.mock.calls.find((call) => call[0] === 'messageSent')?.[1];
      expect(sentPayload).toEqual(
        expect.objectContaining({
          eventType: 'messageSent',
          stateVersion: 1,
          messageId: 'client-msg-1',
          serverMessageId: 'server-msg-1',
          status: 'sent',
        }),
      );
      expect(sentPayload?.eventId).toEqual(expect.any(String));
      expect(sentPayload?.occurredAt).toBe(sentPayload?.timestamp);
    });

    it('should include read stateVersion for messageAcknowledged', async () => {
      const senderEmit = jest.fn();
      (gateway as any).server = {
        to: jest.fn().mockReturnValue({ emit: senderEmit }),
      };

      redisService.getJson.mockResolvedValue({
        messageId: 'server-msg-1',
        clientMessageId: 'client-msg-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        payload: {},
        timestamp: Date.now(),
        retryCount: 0,
      });
      redisService.del.mockResolvedValue(undefined);
      redisService.zrem.mockResolvedValue(undefined);
      messageService.updateMessageStatus.mockResolvedValue(true);
      messageReceiptService.upsertReceipt.mockResolvedValue(undefined);

      const client = createSocket({ user: { userId: 'user-2' } });
      const result = await gateway.handleMessageAck(
        {
          messageId: 'server-msg-1',
          status: 'read',
          timestamp: Date.now(),
        },
        asSocket(client),
      );

      expect(result).toEqual({ success: true });
      expect(senderEmit.mock.calls[0][0]).toBe('messageAcknowledged');
      expect(senderEmit.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          eventType: 'messageAcknowledged',
          stateVersion: 3,
          messageId: 'client-msg-1',
          serverMessageId: 'server-msg-1',
          status: 'read',
        }),
      );
    });

    it('should include event envelope for retry and failed events', () => {
      const senderEmit = jest.fn();
      const receiverEmit = jest.fn();
      (gateway as any).server = {
        to: jest.fn((room: string) => ({
          emit: room === 'user:sender' ? senderEmit : receiverEmit,
        })),
      };

      wsAckRetryService.retryMessage((gateway as any).server, {
        messageId: 'server-msg-2',
        fromUserId: 'sender',
        toUserId: 'receiver',
        payload: {
          fromUserId: 'sender',
          toUserId: 'receiver',
          messageId: 'server-msg-2',
          content: 'retry',
          type: 'text',
          status: MessageStatus.SENT,
        },
        timestamp: Date.now(),
        retryCount: 1,
      });

      expect(senderEmit.mock.calls[0][0]).toBe('messageRetrying');
      expect(senderEmit.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          eventType: 'messageRetrying',
          stateVersion: 0,
          messageId: 'server-msg-2',
          attempt: 2,
        }),
      );

      expect(receiverEmit.mock.calls[0][0]).toBe('newMessage');
      expect(receiverEmit.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          eventType: 'newMessage',
          stateVersion: 1,
          messageId: 'server-msg-2',
          isRetry: true,
        }),
      );

      const failedPayload = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageFailed',
        { messageId: 'server-msg-3', timestamp: Date.now() },
        MessageStatus.FAILED,
      );
      expect(failedPayload).toEqual(
        expect.objectContaining({
          eventType: 'messageFailed',
          stateVersion: -1,
          messageId: 'server-msg-3',
        }),
      );
    });

    it('should generate deterministic eventId for same logical event and different ids for state/attempt changes', () => {
      const first = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageSent',
        {
          messageId: 'client-msg-9',
          serverMessageId: 'server-msg-9',
          status: 'sent',
          timestamp: 1700000000000,
        },
        MessageStatus.SENT,
      );
      const second = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageSent',
        {
          messageId: 'client-msg-9',
          serverMessageId: 'server-msg-9',
          status: 'sent',
          timestamp: 1700000009999,
        },
        MessageStatus.SENT,
      );
      expect(first.eventId).toBe(second.eventId);

      const delivered = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageAcknowledged',
        {
          messageId: 'client-msg-9',
          serverMessageId: 'server-msg-9',
          status: 'delivered',
          timestamp: 1700000010000,
        },
        MessageStatus.DELIVERED,
      );
      const read = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageAcknowledged',
        {
          messageId: 'client-msg-9',
          serverMessageId: 'server-msg-9',
          status: 'read',
          timestamp: 1700000011000,
        },
        MessageStatus.READ,
      );
      expect(delivered.eventId).not.toBe(read.eventId);

      const retryAttempt1 = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageRetrying',
        {
          messageId: 'server-msg-9',
          attempt: 1,
          timestamp: 1700000012000,
        },
        'retrying',
      );
      const retryAttempt2 = wsMessageEventEmitterService.buildMessageEventPayload(
        'messageRetrying',
        {
          messageId: 'server-msg-9',
          attempt: 2,
          timestamp: 1700000013000,
        },
        'retrying',
      );
      expect(retryAttempt1.eventId).not.toBe(retryAttempt2.eventId);
    });
  });

  describe('custom realtime events', () => {
    it('should fan out direct message update events to both user rooms', () => {
      const emit = jest.fn();
      (gateway as any).server = {
        to: jest.fn(() => ({ emit })),
      };
      (gateway as any).subscribePresenceAclInvalidationEvents();

      customEventHandler?.({
        eventName: 'custom.event',
        data: {
          type: MESSAGE_REALTIME_FANOUT_EVENT_TYPE,
          eventType: 'messageUpdated',
          conversationType: 'single',
          messageId: 'msg-1',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          payload: {
            eventId: 'evt-edit-1',
            eventType: 'messageUpdated',
            occurredAt: 1700000000000,
            stateVersion: 1,
            messageId: 'msg-1',
          },
        },
      });

      expect((gateway as any).server.to).toHaveBeenCalledWith([
        'user:user-1',
        'user:user-2',
      ]);
      expect(emit).toHaveBeenCalledWith(
        'messageUpdated',
        expect.objectContaining({
          messageId: 'msg-1',
          eventType: 'messageUpdated',
        }),
      );
    });

    it('should fan out group reaction updates to the group room', () => {
      const emit = jest.fn();
      (gateway as any).server = {
        to: jest.fn(() => ({ emit })),
      };
      (gateway as any).subscribePresenceAclInvalidationEvents();

      customEventHandler?.({
        eventName: 'custom.event',
        data: {
          type: MESSAGE_REALTIME_FANOUT_EVENT_TYPE,
          eventType: 'messageReactionUpdated',
          conversationType: 'group',
          messageId: 'msg-9',
          fromUserId: 'user-1',
          groupId: 'group-1',
          payload: {
            eventId: 'evt-reaction-1',
            eventType: 'messageReactionUpdated',
            occurredAt: 1700000001000,
            stateVersion: 1,
            messageId: 'msg-9',
            totalReactions: 2,
          },
        },
      });

      expect((gateway as any).server.to).toHaveBeenCalledWith('group:group-1');
      expect(emit).toHaveBeenCalledWith(
        'messageReactionUpdated',
        expect.objectContaining({
          messageId: 'msg-9',
          totalReactions: 2,
        }),
      );
    });
  });

  describe('presence subscription', () => {
    it('should subscribe presence rooms with normalized and deduplicated userIds', async () => {
      const client = createSocket({
        id: 'socket-presence-1',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-1', {
        userId: 'user-1',
        socketId: 'socket-presence-1',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });

      const result = await gateway.handlePresenceSubscribe(
        { userIds: [' user-2 ', 'user-3', 'user-2'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: true, subscribed: 2 });
      expect(client.join).toHaveBeenCalledWith([
        'presence:user:user-2',
        'presence:user:user-3',
      ]);
    });

    it('should reject presence subscribe when client is not registered', async () => {
      const client = createSocket({
        id: 'socket-presence-2',
        join: jest.fn(),
      });

      const result = await gateway.handlePresenceSubscribe(
        { userIds: ['user-2'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Client not authenticated' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should reject presence subscribe when payload has invalid userId item', async () => {
      const client = createSocket({
        id: 'socket-presence-3',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-3', {
        userId: 'user-1',
        socketId: 'socket-presence-3',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });

      const result = await gateway.handlePresenceSubscribe(
        { userIds: ['user-2', 'bad user id'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'invalid userId at index 1' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should reject presence subscribe for unauthorized target user', async () => {
      const client = createSocket({
        id: 'socket-presence-5',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-5', {
        userId: 'user-1',
        socketId: 'socket-presence-5',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue(['user-2']);

      const result = await gateway.handlePresenceSubscribe(
        { userIds: ['user-2', 'user-9'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Forbidden presence subscription targets' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should allow presence subscribe for same-group target user', async () => {
      const client = createSocket({
        id: 'socket-presence-6',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-6', {
        userId: 'user-1',
        socketId: 'socket-presence-6',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue([]);
      groupService.getUsersWithSharedJoinedGroups.mockResolvedValue(['user-9']);

      const result = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: true, subscribed: 1 });
      expect(groupService.getUsersWithSharedJoinedGroups).toHaveBeenCalledWith('user-1', ['user-9']);
      expect(client.join).toHaveBeenCalledWith(['presence:user:user-9']);
    });

    it('should reject presence subscribe when group ACL lookup fails', async () => {
      const client = createSocket({
        id: 'socket-presence-7',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-7', {
        userId: 'user-1',
        socketId: 'socket-presence-7',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue([]);
      groupService.getUsersWithSharedJoinedGroups.mockRejectedValue(new Error('group acl down'));

      const result = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: false, error: 'Presence ACL service unavailable' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should reuse allowed shared-group ACL from cache for repeated subscriptions', async () => {
      const client = createSocket({
        id: 'socket-presence-8',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-8', {
        userId: 'user-1',
        socketId: 'socket-presence-8',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue([]);
      groupService.getUsersWithSharedJoinedGroups.mockResolvedValue(['user-9']);

      const firstResult = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );
      const secondResult = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );

      expect(firstResult).toEqual({ success: true, subscribed: 1 });
      expect(secondResult).toEqual({ success: true, subscribed: 1 });
      expect(groupService.getUsersWithSharedJoinedGroups).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cached ACL entries when presence ACL changed event is received', async () => {
      (gateway as any).subscribePresenceAclInvalidationEvents();
      expect(eventBusService.subscribe).toHaveBeenCalledWith(
        'custom.event',
        expect.any(Function),
        { async: true },
      );

      const client = createSocket({
        id: 'socket-presence-9',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-9', {
        userId: 'user-1',
        socketId: 'socket-presence-9',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue([]);
      groupService.getUsersWithSharedJoinedGroups.mockResolvedValue(['user-9']);

      const firstResult = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );
      expect(firstResult).toEqual({ success: true, subscribed: 1 });
      expect(groupService.getUsersWithSharedJoinedGroups).toHaveBeenCalledTimes(1);

      customEventHandler?.({
        eventName: 'custom.event',
        data: {
          type: 'presence.acl.changed',
          affectedUserIds: ['user-1'],
        },
      });

      const secondResult = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );
      expect(secondResult).toEqual({ success: true, subscribed: 1 });
      expect(groupService.getUsersWithSharedJoinedGroups).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cached ACL entries when affected user is the target side', async () => {
      (gateway as any).subscribePresenceAclInvalidationEvents();

      const client = createSocket({
        id: 'socket-presence-11',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-11', {
        userId: 'user-1',
        socketId: 'socket-presence-11',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue([]);
      groupService.getUsersWithSharedJoinedGroups.mockResolvedValue(['user-9']);

      const firstResult = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );
      expect(firstResult).toEqual({ success: true, subscribed: 1 });
      expect(groupService.getUsersWithSharedJoinedGroups).toHaveBeenCalledTimes(1);

      customEventHandler?.({
        eventName: 'custom.event',
        data: {
          type: 'presence.acl.changed',
          affectedUserIds: ['user-9'],
        },
      });

      const secondResult = await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );
      expect(secondResult).toEqual({ success: true, subscribed: 1 });
      expect(groupService.getUsersWithSharedJoinedGroups).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe presence rooms one-by-one', async () => {
      const client = createSocket({
        id: 'socket-presence-4',
        leave: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-4', {
        userId: 'user-1',
        socketId: 'socket-presence-4',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });

      const result = await gateway.handlePresenceUnsubscribe(
        { userIds: ['user-2', 'user-3'] },
        asSocket(client),
      );

      expect(result).toEqual({ success: true, unsubscribed: 2 });
      expect(client.leave).toHaveBeenCalledTimes(2);
      expect(client.leave).toHaveBeenNthCalledWith(1, 'presence:user:user-2');
      expect(client.leave).toHaveBeenNthCalledWith(2, 'presence:user:user-3');
    });

    it('should expose presence ACL cache runtime stats in online stats', async () => {
      const client = createSocket({
        id: 'socket-presence-10',
        join: jest.fn(),
      });
      (gateway as any).localClients.set('socket-presence-10', {
        userId: 'user-1',
        socketId: 'socket-presence-10',
        serverId: 'test-server',
        connectedAt: Date.now(),
      });
      friendService.getFriendIds.mockResolvedValue([]);
      groupService.getUsersWithSharedJoinedGroups.mockResolvedValue(['user-9']);

      await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );
      await gateway.handlePresenceSubscribe(
        { userIds: ['user-9'] },
        asSocket(client),
      );

      const stats = await gateway.getOnlineStats();
      expect(stats).toEqual(
        expect.objectContaining({
          totalOnline: 2,
          presenceAclCache: expect.objectContaining({
            entries: 1,
            maxEntries: 50000,
            ttlMs: 60000,
            runtime: expect.objectContaining({
              hits: 1,
              misses: 1,
              totalAccesses: 2,
              hitRate: 0.5,
            }),
          }),
        }),
      );
    });
  });

  describe('systemMessage kickDevice', () => {
    it('should disconnect only sockets that match userId and deviceId', () => {
      const disconnectTarget = jest.fn();
      const disconnectOtherDevice = jest.fn();

      (gateway as any).server = {
        sockets: {
          sockets: new Map<string, { disconnect: jest.Mock }>([
            ['socket-target', { disconnect: disconnectTarget }],
            ['socket-other-device', { disconnect: disconnectOtherDevice }],
          ]),
        },
      };

      (gateway as any).localClients = new Map<string, { userId: string; deviceId?: string }>([
        ['socket-target', { userId: 'user-1', deviceId: 'ios-001' }],
        ['socket-other-device', { userId: 'user-1', deviceId: 'web-001' }],
      ]);

      wsSystemMessageService.handleSystemMessage(
        {
          type: 'kickDevice',
          userId: 'user-1',
          deviceId: 'ios-001',
        },
        (gateway as any).server,
        (gateway as any).localClients,
      );

      expect(disconnectTarget).toHaveBeenCalledWith(true);
      expect(disconnectOtherDevice).not.toHaveBeenCalled();
    });
  });

  describe('systemMessage kickUserExceptDevice', () => {
    it('should disconnect all user sockets except keepDeviceId', () => {
      const disconnectKeep = jest.fn();
      const disconnectOther1 = jest.fn();
      const disconnectOther2 = jest.fn();

      (gateway as any).server = {
        sockets: {
          sockets: new Map<string, { disconnect: jest.Mock }>([
            ['socket-keep', { disconnect: disconnectKeep }],
            ['socket-other-1', { disconnect: disconnectOther1 }],
            ['socket-other-2', { disconnect: disconnectOther2 }],
          ]),
        },
      };

      (gateway as any).localClients = new Map<string, { userId: string; deviceId?: string }>([
        ['socket-keep', { userId: 'user-1', deviceId: 'ios-001' }],
        ['socket-other-1', { userId: 'user-1', deviceId: 'web-001' }],
        ['socket-other-2', { userId: 'user-1', deviceId: 'android-001' }],
      ]);

      wsSystemMessageService.handleSystemMessage(
        {
          type: 'kickUserExceptDevice',
          userId: 'user-1',
          keepDeviceId: 'ios-001',
        },
        (gateway as any).server,
        (gateway as any).localClients,
      );

      expect(disconnectKeep).not.toHaveBeenCalled();
      expect(disconnectOther1).toHaveBeenCalledWith(true);
      expect(disconnectOther2).toHaveBeenCalledWith(true);
    });
  });
});
