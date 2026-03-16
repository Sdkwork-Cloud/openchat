import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { IMProviderService } from '../im-provider/im-provider.service';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationUnreadService } from '../conversation/conversation-unread.service';
import { ContactService } from '../contact/contact.service';
import { MessageDeduplicationService } from './message-deduplication.service';
import { MessageFilterService } from './message-filter.service';
import { MessageReceiptService } from './message-receipt.service';
import { MessageSequenceService } from './services/message-sequence.service';
import { GroupMember } from '../group/group-member.entity';
import { GroupMessageBatchService } from '../group/group-message-batch.service';
import { DataSource } from 'typeorm';
import { EventBusService } from '../../common/events/event-bus.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessageStatus } from './message.interface';
import { PrometheusService } from '../../common/metrics/prometheus.service';

describe('MessageService', () => {
  let service: MessageService;

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockGroupMemberRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockImProviderService = {
    sendMessage: jest.fn(),
  };

  const mockConversationService = {
    advanceLastReadSeq: jest.fn(),
    advanceDeviceLastReadSeq: jest.fn(),
    getConversationSyncStateForUser: jest.fn(),
  };

  const mockConversationUnreadService = {};

  const mockContactService = {};

  const mockDeduplicationService = {
    isDuplicate: jest.fn(),
    markAsProcessedTransactional: jest.fn(),
    commitTransactionalMark: jest.fn(),
    rollbackTransactionalMark: jest.fn(),
  };

  const mockSequenceService = {
    getNextSequence: jest.fn(),
    getNextSequences: jest.fn(),
    getMissingSequences: jest.fn(),
    getMissingSequencesWithMeta: jest.fn(),
  };

  const mockFilterService = {
    checkSingleMessagePermission: jest.fn(),
    checkGroupMessagePermission: jest.fn(),
  };

  const mockGroupMessageBatchService = {};
  const mockMessageReceiptService = {
    upsertReceipt: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };
  const mockPrometheusService = {
    incrementMessageSeqGapScan: jest.fn(),
    observeMessageSeqGapScanDuration: jest.fn(),
    incrementMessageSeqGapTruncated: jest.fn(),
    incrementMessageSeqAck: jest.fn(),
    observeMessageSeqAckPendingSeq: jest.fn(),
    observeMessageSeqAckDuration: jest.fn(),
    incrementMessageSeqAckBatch: jest.fn(),
    observeMessageSeqAckBatchDuration: jest.fn(),
    observeMessageSeqAckBatchFailedItems: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'MESSAGE_BATCH_SIZE') {
        return 20;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: mockGroupMemberRepository,
        },
        {
          provide: IMProviderService,
          useValue: mockImProviderService,
        },
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
        {
          provide: ConversationUnreadService,
          useValue: mockConversationUnreadService,
        },
        {
          provide: ContactService,
          useValue: mockContactService,
        },
        {
          provide: MessageDeduplicationService,
          useValue: mockDeduplicationService,
        },
        {
          provide: MessageFilterService,
          useValue: mockFilterService,
        },
        {
          provide: GroupMessageBatchService,
          useValue: mockGroupMessageBatchService,
        },
        {
          provide: MessageReceiptService,
          useValue: mockMessageReceiptService,
        },
        {
          provide: MessageSequenceService,
          useValue: mockSequenceService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: PrometheusService,
          useValue: mockPrometheusService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMessageById', () => {
    it('should return message by id', async () => {
      const mockMessage = {
        id: 'msg-123',
        uuid: 'uuid-123',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: { text: 'Hello' },
        type: 'text',
        status: 'sent',
        createdAt: new Date(),
      };
      mockMessageRepository.findOne.mockResolvedValue(mockMessage);

      const result = await service.getMessageById('msg-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('msg-123');
    });

    it('should return null if message not found', async () => {
      mockMessageRepository.findOne.mockResolvedValue(null);

      const result = await service.getMessageById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockMessageRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteMessage('msg-123');

      expect(result).toBe(true);
    });

    it('should return false if message not found', async () => {
      mockMessageRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.deleteMessage('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('editMessage', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reject edits for recalled messages', async () => {
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        fromUserId: 'user-1',
        status: MessageStatus.RECALLED,
        createdAt: new Date('2026-03-14T11:55:00.000Z'),
      });

      const result = await service.editMessage('msg-1', 'user-1', {
        content: { text: { text: 'edited text' } },
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });

    it('should persist editedAt and edit history for valid edits', async () => {
      const now = new Date('2026-03-14T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        type: 'text',
        status: MessageStatus.SENT,
        content: { text: { text: 'before edit' } },
        extra: { existing: true },
        createdAt: new Date('2026-03-14T11:59:00.000Z'),
        updatedAt: new Date('2026-03-14T11:59:10.000Z'),
      });
      mockMessageRepository.save.mockImplementation(async (entity: any) => entity);

      const result = await service.editMessage('msg-1', 'user-1', {
        content: { text: { text: 'after edit' } },
      } as any);

      expect(mockMessageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-1',
          content: { text: { text: 'after edit' } },
          editedAt: now,
          extra: expect.objectContaining({
            existing: true,
            editHistory: [
              expect.objectContaining({
                content: { text: { text: 'before edit' } },
              }),
            ],
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.objectContaining({
            id: 'msg-1',
            editedAt: now,
          }),
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'custom.event',
        expect.objectContaining({
          type: 'message.realtime.fanout',
          eventType: 'messageUpdated',
          conversationType: 'single',
          messageId: 'msg-1',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          payload: expect.objectContaining({
            eventType: 'messageUpdated',
            stateVersion: 1,
            message: expect.objectContaining({
              id: 'msg-1',
              editedAt: now,
            }),
          }),
        }),
        expect.objectContaining({
          async: true,
          broadcast: true,
        }),
      );
    });
  });

  describe('updateMessageStatus', () => {
    const createStatusUpdateQueryBuilder = () => {
      const queryBuilder = {
        update: jest.fn(),
        set: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        execute: jest.fn(),
      };
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.set.mockReturnValue(queryBuilder);
      queryBuilder.where.mockReturnValue(queryBuilder);
      queryBuilder.andWhere.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    it('should promote sent to delivered with guarded update', async () => {
      const queryBuilder = createStatusUpdateQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 1 });
      mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockMessageRepository.findOne.mockResolvedValue({ id: 'msg-1', status: MessageStatus.SENT });

      const result = await service.updateMessageStatus('msg-1', MessageStatus.DELIVERED);

      expect(result).toBe(true);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'status IN (:...allowed)',
        { allowed: [MessageStatus.SENDING, MessageStatus.SENT] },
      );
      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });

    it('should treat downgraded status update as noop', async () => {
      mockMessageRepository.findOne.mockResolvedValue({ id: 'msg-1', status: MessageStatus.READ });

      const result = await service.updateMessageStatus('msg-1', MessageStatus.DELIVERED);

      expect(result).toBe(true);
      expect(mockMessageRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });

    it('should reject updates after message recalled', async () => {
      mockMessageRepository.findOne.mockResolvedValue({ id: 'msg-1', status: MessageStatus.RECALLED });

      const result = await service.updateMessageStatus('msg-1', MessageStatus.DELIVERED);

      expect(result).toBe(false);
      expect(mockMessageRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });

    it('should return true when concurrent update already advanced status', async () => {
      const queryBuilder = createStatusUpdateQueryBuilder();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });
      mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockMessageRepository.findOne
        .mockResolvedValueOnce({ id: 'msg-1', status: MessageStatus.SENT })
        .mockResolvedValueOnce({ status: MessageStatus.READ });

      const result = await service.updateMessageStatus('msg-1', MessageStatus.DELIVERED);

      expect(result).toBe(true);
      expect(mockMessageRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('markGroupMessagesAsRead', () => {
    it('should mark group messages as read and write receipts', async () => {
      mockGroupMemberRepository.findOne.mockResolvedValue({ id: 'member-1' });
      mockMessageRepository.find.mockResolvedValue([
        { id: 'msg-1', fromUserId: 'user-2' },
        { id: 'msg-2', fromUserId: 'user-3' },
        { id: 'msg-self', fromUserId: 'user-1' },
      ]);
      mockMessageReceiptService.upsertReceipt.mockResolvedValue(true);

      const result = await service.markGroupMessagesAsRead(
        'user-1',
        'group-1',
        ['msg-1', 'msg-2', 'msg-self'],
      );

      expect(result).toBe(true);
      expect(mockMessageReceiptService.upsertReceipt).toHaveBeenCalledTimes(2);
      expect(mockMessageReceiptService.upsertReceipt).toHaveBeenCalledWith(
        'msg-1',
        'user-1',
        'read',
        'api_group_mark_read',
        { groupId: 'group-1' },
      );
      expect(mockMessageReceiptService.upsertReceipt).toHaveBeenCalledWith(
        'msg-2',
        'user-1',
        'read',
        'api_group_mark_read',
        { groupId: 'group-1' },
      );
    });

    it('should return false when user is not group member', async () => {
      mockGroupMemberRepository.findOne.mockResolvedValue(null);

      const result = await service.markGroupMessagesAsRead(
        'user-1',
        'group-1',
        ['msg-1'],
      );

      expect(result).toBe(false);
      expect(mockMessageRepository.find).not.toHaveBeenCalled();
      expect(mockMessageReceiptService.upsertReceipt).not.toHaveBeenCalled();
    });
  });

  describe('markMessagesAsRead', () => {
    it('should advance conversation lastReadSeq by sender after read', async () => {
      mockMessageRepository.find.mockResolvedValue([
        { id: 'msg-1', fromUserId: 'user-a', seq: 100 },
        { id: 'msg-2', fromUserId: 'user-a', seq: 105 },
        { id: 'msg-3', fromUserId: 'user-b', seq: 88 },
      ]);
      mockMessageRepository.update.mockResolvedValue({ affected: 3 });
      mockMessageReceiptService.upsertReceipt.mockResolvedValue(true);
      mockConversationService.advanceLastReadSeq.mockResolvedValue(true);

      const result = await service.markMessagesAsRead('user-1', ['msg-1', 'msg-2', 'msg-3']);

      expect(result).toBe(true);
      expect(mockMessageReceiptService.upsertReceipt).toHaveBeenCalledTimes(3);
      expect(mockConversationService.advanceLastReadSeq).toHaveBeenCalledWith(
        'user-1',
        'user-a',
        'single',
        105,
      );
      expect(mockConversationService.advanceLastReadSeq).toHaveBeenCalledWith(
        'user-1',
        'user-b',
        'single',
        88,
      );
    });
  });

  describe('getMessageHistoryBySeq', () => {
    const createHistoryQueryBuilder = () => {
      const queryBuilder = {
        where: jest.fn(),
        andWhere: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        take: jest.fn(),
        getMany: jest.fn(),
      };
      queryBuilder.where.mockReturnValue(queryBuilder);
      queryBuilder.andWhere.mockReturnValue(queryBuilder);
      queryBuilder.orderBy.mockReturnValue(queryBuilder);
      queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
      queryBuilder.take.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    const createMaxSeqQueryBuilder = () => {
      const queryBuilder = {
        select: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        getRawOne: jest.fn(),
      };
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.where.mockReturnValue(queryBuilder);
      queryBuilder.andWhere.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    it('should throw ForbiddenException for group history when user is not member', async () => {
      mockGroupMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getMessageHistoryBySeq('user-1', 'group-1', 'group', { fromSeq: 0 }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mockMessageRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return seq history result with hasMore and nextSeq', async () => {
      const historyQueryBuilder = createHistoryQueryBuilder();
      const maxSeqQueryBuilder = createMaxSeqQueryBuilder();
      historyQueryBuilder.getMany.mockResolvedValue([
        { id: 'm1', seq: 11, createdAt: new Date('2026-03-07T10:00:00.000Z') },
        { id: 'm2', seq: 12, createdAt: new Date('2026-03-07T10:00:01.000Z') },
        { id: 'm3', seq: 13, createdAt: new Date('2026-03-07T10:00:02.000Z') },
      ]);
      maxSeqQueryBuilder.getRawOne.mockResolvedValue({ maxSeq: '99' });

      mockMessageRepository.createQueryBuilder
        .mockReturnValueOnce(historyQueryBuilder as any)
        .mockReturnValueOnce(maxSeqQueryBuilder as any);
      mockSequenceService.getMissingSequencesWithMeta.mockResolvedValue({
        missingSequences: [14, 15],
        scanFrom: 11,
        scanTo: 90,
        requestedTo: 99,
        truncated: true,
      });

      const result = await service.getMessageHistoryBySeq('user-1', 'user-2', 'single', {
        fromSeq: 10,
        limit: 2,
        direction: 'after',
      });

      expect(result.targetId).toBe('user-2');
      expect(result.type).toBe('single');
      expect(result.direction).toBe('after');
      expect(result.maxSeq).toBe(99);
      expect(result.hasMore).toBe(true);
      expect(result.nextSeq).toBe(12);
      expect(result.missingSeqFrom).toBe(11);
      expect(result.missingSeqTo).toBe(90);
      expect(result.missingSeqRequestedTo).toBe(99);
      expect(result.missingSeqTruncated).toBe(true);
      expect(result.missingSeqs).toEqual([14, 15]);
      expect(result.messages).toHaveLength(2);
      expect(mockSequenceService.getMissingSequencesWithMeta).toHaveBeenCalledWith(
        'single:user-1:user-2',
        11,
        99,
      );
      expect(mockPrometheusService.incrementMessageSeqGapScan).toHaveBeenCalledWith('single', 'success');
      expect(mockPrometheusService.incrementMessageSeqGapTruncated).toHaveBeenCalledWith('single');
      expect(mockPrometheusService.observeMessageSeqGapScanDuration).toHaveBeenCalledWith(
        'single',
        'success',
        expect.any(Number),
      );
    });

    it('should skip missing sequence scan for before direction by default', async () => {
      const historyQueryBuilder = createHistoryQueryBuilder();
      const maxSeqQueryBuilder = createMaxSeqQueryBuilder();
      historyQueryBuilder.getMany.mockResolvedValue([
        { id: 'm1', seq: 20, createdAt: new Date('2026-03-07T10:00:00.000Z') },
      ]);
      maxSeqQueryBuilder.getRawOne.mockResolvedValue({ maxSeq: '20' });

      mockMessageRepository.createQueryBuilder
        .mockReturnValueOnce(historyQueryBuilder as any)
        .mockReturnValueOnce(maxSeqQueryBuilder as any);

      const result = await service.getMessageHistoryBySeq('user-1', 'user-2', 'single', {
        fromSeq: 10,
        limit: 10,
        direction: 'before',
      });

      expect(result.missingSeqs).toBeUndefined();
      expect(mockSequenceService.getMissingSequencesWithMeta).not.toHaveBeenCalled();
      expect(mockPrometheusService.incrementMessageSeqGapScan).not.toHaveBeenCalled();
      expect(mockPrometheusService.observeMessageSeqGapScanDuration).not.toHaveBeenCalled();
    });
  });

  describe('ackConversationSeq', () => {
    it('should advance seq and return sync state for single conversation', async () => {
      mockConversationService.advanceLastReadSeq.mockResolvedValue(true);
      mockConversationService.getConversationSyncStateForUser.mockResolvedValue({
        targetId: 'user-2',
        type: 'single',
        unreadCount: 0,
        lastReadSeq: 120,
        maxSeq: 130,
        pendingSeq: 10,
        isCaughtUp: false,
        serverTime: '2026-03-08T00:00:00.000Z',
      });

      const result = await service.ackConversationSeq('user-1', {
        targetId: 'user-2',
        type: 'single',
        ackSeq: 120,
      });

      expect(result.success).toBe(true);
      expect(mockConversationService.advanceLastReadSeq).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'single',
        120,
      );
      expect(mockConversationService.getConversationSyncStateForUser).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'single',
      );
      expect(mockPrometheusService.incrementMessageSeqAck).toHaveBeenCalledWith(
        'single',
        'user',
        'success',
        'false',
      );
      expect(mockPrometheusService.observeMessageSeqAckPendingSeq).toHaveBeenCalledWith(
        'single',
        'user',
        10,
      );
      expect(mockPrometheusService.observeMessageSeqAckDuration).toHaveBeenCalledWith(
        'single',
        'user',
        'success',
        expect.any(Number),
      );
    });

    it('should reject group ack when user is not a member', async () => {
      mockGroupMemberRepository.findOne.mockResolvedValue(null);

      const result = await service.ackConversationSeq('user-1', {
        targetId: 'group-9',
        type: 'group',
        ackSeq: 88,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('not a group member');
      expect(mockConversationService.advanceLastReadSeq).not.toHaveBeenCalled();
      expect(mockPrometheusService.incrementMessageSeqAck).toHaveBeenCalledWith(
        'group',
        'user',
        'failure',
        'unknown',
      );
      expect(mockPrometheusService.observeMessageSeqAckPendingSeq).not.toHaveBeenCalled();
      expect(mockPrometheusService.observeMessageSeqAckDuration).toHaveBeenCalledWith(
        'group',
        'user',
        'failure',
        expect.any(Number),
      );
    });

    it('should advance device cursor when deviceId is provided', async () => {
      mockConversationService.advanceLastReadSeq.mockResolvedValue(true);
      mockConversationService.advanceDeviceLastReadSeq.mockResolvedValue(true);
      mockConversationService.getConversationSyncStateForUser.mockResolvedValue({
        targetId: 'user-2',
        type: 'single',
        unreadCount: 0,
        lastReadSeq: 120,
        userLastReadSeq: 140,
        deviceId: 'ios-1',
        deviceLastReadSeq: 120,
        syncScope: 'device',
        maxSeq: 150,
        pendingSeq: 30,
        isCaughtUp: false,
        serverTime: '2026-03-08T00:00:00.000Z',
      });

      const result = await service.ackConversationSeq(
        'user-1',
        {
          targetId: 'user-2',
          type: 'single',
          ackSeq: 120,
        },
        { deviceId: 'ios-1' },
      );

      expect(result.success).toBe(true);
      expect(mockConversationService.advanceDeviceLastReadSeq).toHaveBeenCalledWith(
        'user-1',
        'ios-1',
        'user-2',
        'single',
        120,
      );
      expect(mockConversationService.getConversationSyncStateForUser).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'single',
        { deviceId: 'ios-1' },
      );
      expect(mockPrometheusService.incrementMessageSeqAck).toHaveBeenCalledWith(
        'single',
        'device',
        'success',
        'false',
      );
      expect(mockPrometheusService.observeMessageSeqAckPendingSeq).toHaveBeenCalledWith(
        'single',
        'device',
        30,
      );
      expect(mockPrometheusService.observeMessageSeqAckDuration).toHaveBeenCalledWith(
        'single',
        'device',
        'success',
        expect.any(Number),
      );
    });

    it('should return success with null state when sync-state query fails after ack update', async () => {
      mockConversationService.advanceLastReadSeq.mockResolvedValue(true);
      mockConversationService.getConversationSyncStateForUser.mockRejectedValue(new Error('state query failed'));

      const result = await service.ackConversationSeq('user-1', {
        targetId: 'user-2',
        type: 'single',
        ackSeq: 120,
      });

      expect(result.success).toBe(true);
      expect(result.state).toBeNull();
      expect(mockPrometheusService.incrementMessageSeqAck).toHaveBeenCalledWith(
        'single',
        'user',
        'success',
        'unknown',
      );
      expect(mockPrometheusService.observeMessageSeqAckPendingSeq).not.toHaveBeenCalled();
      expect(mockPrometheusService.observeMessageSeqAckDuration).toHaveBeenCalledWith(
        'single',
        'user',
        'success',
        expect.any(Number),
      );
    });
  });

  describe('ackConversationSeqBatch', () => {
    it('should deduplicate batch items and keep max ackSeq per conversation', async () => {
      mockConversationService.advanceLastReadSeq.mockResolvedValue(true);
      mockConversationService.getConversationSyncStateForUser.mockResolvedValue({
        targetId: 'user-2',
        type: 'single',
        unreadCount: 0,
        lastReadSeq: 200,
        maxSeq: 210,
        pendingSeq: 10,
        isCaughtUp: false,
        serverTime: '2026-03-08T00:00:00.000Z',
      });

      const result = await service.ackConversationSeqBatch('user-1', [
        { targetId: 'user-2', type: 'single', ackSeq: 100 },
        { targetId: 'user-2', type: 'single', ackSeq: 200 },
        { targetId: 'group-1', type: 'group', ackSeq: 0 }, // filtered invalid
      ]);

      expect(result.total).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockConversationService.advanceLastReadSeq).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        'single',
        200,
      );
      expect(mockPrometheusService.incrementMessageSeqAckBatch).toHaveBeenCalledWith(
        'user',
        'success',
      );
      expect(mockPrometheusService.observeMessageSeqAckBatchFailedItems).toHaveBeenCalledWith(
        'user',
        0,
      );
      expect(mockPrometheusService.observeMessageSeqAckBatchDuration).toHaveBeenCalledWith(
        'user',
        'success',
        expect.any(Number),
      );
    });

    it('should isolate per-item ack failures instead of failing entire batch', async () => {
      mockConversationService.advanceLastReadSeq
        .mockRejectedValueOnce(new Error('db timeout'))
        .mockResolvedValueOnce(true);
      mockConversationService.getConversationSyncStateForUser.mockResolvedValue({
        targetId: 'user-3',
        type: 'single',
        unreadCount: 0,
        lastReadSeq: 50,
        maxSeq: 50,
        pendingSeq: 0,
        isCaughtUp: true,
        serverTime: '2026-03-08T00:00:00.000Z',
      });

      const result = await service.ackConversationSeqBatch('user-1', [
        { targetId: 'user-2', type: 'single', ackSeq: 40 },
        { targetId: 'user-3', type: 'single', ackSeq: 50 },
      ]);

      expect(result.total).toBe(2);
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0]).toEqual({
        targetId: 'user-2',
        type: 'single',
        ackSeq: 40,
        success: false,
        error: 'ack operation failed',
      });
      expect(result.results[1]?.success).toBe(true);
      expect(mockPrometheusService.observeMessageSeqAckDuration).toHaveBeenCalledWith(
        'single',
        'user',
        'failure',
        expect.any(Number),
      );
      expect(mockPrometheusService.incrementMessageSeqAckBatch).toHaveBeenCalledWith(
        'user',
        'partial',
      );
      expect(mockPrometheusService.observeMessageSeqAckBatchFailedItems).toHaveBeenCalledWith(
        'user',
        1,
      );
      expect(mockPrometheusService.observeMessageSeqAckBatchDuration).toHaveBeenCalledWith(
        'user',
        'partial',
        expect.any(Number),
      );
    });

    it('should emit success batch metrics when normalized items are empty', async () => {
      const result = await service.ackConversationSeqBatch('user-1', [
        { targetId: 'group-1', type: 'group', ackSeq: 0 },
      ]);

      expect(result).toEqual({
        total: 0,
        updated: 0,
        failed: 0,
        results: [],
      });
      expect(mockPrometheusService.incrementMessageSeqAckBatch).toHaveBeenCalledWith(
        'user',
        'success',
      );
      expect(mockPrometheusService.observeMessageSeqAckBatchFailedItems).toHaveBeenCalledWith(
        'user',
        0,
      );
      expect(mockPrometheusService.observeMessageSeqAckBatchDuration).toHaveBeenCalledWith(
        'user',
        'success',
        expect.any(Number),
      );
    });
  });

  describe('group receipt member query guards', () => {
    it('getGroupMessageUnreadMembers should throw on non-group message', async () => {
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        groupId: null,
        status: 'sent',
      });

      await expect(
        service.getGroupMessageUnreadMembers('user-1', 'msg-1', { limit: 20, offset: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('getGroupMessageReadMembers should throw on non-group message', async () => {
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        groupId: null,
        status: 'sent',
      });

      await expect(
        service.getGroupMessageReadMembers('user-1', 'msg-1', { limit: 20, offset: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('group receipt member cursor pagination', () => {
    type QueryBuilderMock = {
      leftJoin: jest.Mock;
      innerJoin: jest.Mock;
      where: jest.Mock;
      andWhere: jest.Mock;
      clone: jest.Mock;
      select: jest.Mock;
      orderBy: jest.Mock;
      addOrderBy: jest.Mock;
      limit: jest.Mock;
      offset: jest.Mock;
      getRawOne: jest.Mock;
      getRawMany: jest.Mock;
    };

    const createChainableQueryBuilder = (): QueryBuilderMock => {
      const queryBuilder = {
        leftJoin: jest.fn(),
        innerJoin: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        clone: jest.fn(),
        select: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        limit: jest.fn(),
        offset: jest.fn(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
      } as QueryBuilderMock;

      queryBuilder.leftJoin.mockReturnValue(queryBuilder);
      queryBuilder.innerJoin.mockReturnValue(queryBuilder);
      queryBuilder.where.mockReturnValue(queryBuilder);
      queryBuilder.andWhere.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.orderBy.mockReturnValue(queryBuilder);
      queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
      queryBuilder.limit.mockReturnValue(queryBuilder);
      queryBuilder.offset.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    const setupMemberListQueryBuilder = ({
      total,
      rows,
    }: {
      total: string | number;
      rows: Array<{
        userId: string;
        role: 'owner' | 'admin' | 'member';
        receiptStatus: 'sent' | 'delivered' | 'read' | null;
        deliveredAt: Date | null;
        readAt: Date | null;
        sortTime: Date | string;
      }>;
    }) => {
      const baseQueryBuilder = createChainableQueryBuilder();
      const countQueryBuilder = createChainableQueryBuilder();
      const rowsQueryBuilder = createChainableQueryBuilder();

      countQueryBuilder.getRawOne.mockResolvedValue({ total });
      rowsQueryBuilder.getRawMany.mockResolvedValue(rows);

      baseQueryBuilder.clone
        .mockReturnValueOnce(countQueryBuilder)
        .mockReturnValueOnce(rowsQueryBuilder);

      mockGroupMemberRepository.createQueryBuilder.mockReturnValue(baseQueryBuilder);

      return {
        baseQueryBuilder,
        countQueryBuilder,
        rowsQueryBuilder,
      };
    };

    it('getGroupMessageUnreadMembers should support cursor paging and return nextCursor', async () => {
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        fromUserId: 'user-1',
        toUserId: null,
        groupId: 'group-1',
        status: 'sent',
      });

      const queryBuilders = setupMemberListQueryBuilder({
        total: '3',
        rows: [
          {
            userId: 'user-2',
            role: 'member',
            receiptStatus: 'delivered',
            deliveredAt: new Date('2026-03-05T10:05:00.000Z'),
            readAt: null,
            sortTime: '2026-03-05T10:10:00.000Z',
          },
          {
            userId: 'user-3',
            role: 'admin',
            receiptStatus: null,
            deliveredAt: null,
            readAt: null,
            sortTime: '2026-03-05T10:00:00.000Z',
          },
          {
            userId: 'user-4',
            role: 'member',
            receiptStatus: 'sent',
            deliveredAt: null,
            readAt: null,
            sortTime: '2026-03-05T09:50:00.000Z',
          },
        ],
      });

      const cursor = Buffer.from(
        JSON.stringify({
          t: '2026-03-05T11:00:00.000Z',
          u: 'user-1',
        }),
      ).toString('base64url');

      const result = await service.getGroupMessageUnreadMembers('user-1', 'msg-1', {
        limit: 2,
        offset: 100,
        cursor,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeDefined();
      expect(queryBuilders.rowsQueryBuilder.offset).not.toHaveBeenCalled();

      const cursorConditionCall = queryBuilders.baseQueryBuilder.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('cursorTime'),
      );
      expect(cursorConditionCall).toBeDefined();
      expect(cursorConditionCall?.[1]).toMatchObject({
        cursorUserId: 'user-1',
      });

      const decodedNextCursor = JSON.parse(
        Buffer.from(result.nextCursor as string, 'base64url').toString('utf8'),
      ) as { t: string; u: string };
      expect(decodedNextCursor.u).toBe('user-3');
      expect(decodedNextCursor.t).toBe('2026-03-05T10:00:00.000Z');
    });

    it('getGroupMessageUnreadMembers should throw Invalid cursor for malformed cursor', async () => {
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        fromUserId: 'user-1',
        toUserId: null,
        groupId: 'group-1',
        status: 'sent',
      });

      setupMemberListQueryBuilder({
        total: '0',
        rows: [],
      });

      await expect(
        service.getGroupMessageUnreadMembers('user-1', 'msg-1', {
          limit: 20,
          offset: 0,
          cursor: 'not-a-valid-cursor',
        }),
      ).rejects.toThrow('Invalid cursor');
    });

    it('getGroupMessageReadMembers should support cursor paging and return nextCursor', async () => {
      mockMessageRepository.findOne.mockResolvedValue({
        id: 'msg-9',
        fromUserId: 'user-9',
        toUserId: null,
        groupId: 'group-9',
        status: 'sent',
      });

      const queryBuilders = setupMemberListQueryBuilder({
        total: 3,
        rows: [
          {
            userId: 'user-a',
            role: 'member',
            receiptStatus: 'read',
            deliveredAt: new Date('2026-03-05T10:05:00.000Z'),
            readAt: new Date('2026-03-05T10:10:00.000Z'),
            sortTime: new Date('2026-03-05T10:10:00.000Z'),
          },
          {
            userId: 'user-b',
            role: 'admin',
            receiptStatus: 'read',
            deliveredAt: new Date('2026-03-05T10:00:00.000Z'),
            readAt: new Date('2026-03-05T10:00:00.000Z'),
            sortTime: '2026-03-05T10:00:00.000Z',
          },
          {
            userId: 'user-c',
            role: 'member',
            receiptStatus: 'read',
            deliveredAt: new Date('2026-03-05T09:55:00.000Z'),
            readAt: new Date('2026-03-05T09:55:00.000Z'),
            sortTime: '2026-03-05T09:55:00.000Z',
          },
        ],
      });

      const cursor = Buffer.from(
        JSON.stringify({
          t: '2026-03-05T10:20:00.000Z',
          u: 'user-root',
        }),
      ).toString('base64url');

      const result = await service.getGroupMessageReadMembers('user-9', 'msg-9', {
        limit: 2,
        offset: 7,
        cursor,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeDefined();
      expect(queryBuilders.rowsQueryBuilder.offset).not.toHaveBeenCalled();

      const decodedNextCursor = JSON.parse(
        Buffer.from(result.nextCursor as string, 'base64url').toString('utf8'),
      ) as { t: string; u: string };
      expect(decodedNextCursor.u).toBe('user-b');
      expect(decodedNextCursor.t).toBe('2026-03-05T10:00:00.000Z');
    });
  });

  describe('sendMessage duplicate handling', () => {
    it('should return existing message by fromUserId + clientSeq for duplicate message', async () => {
      const existingMessage = {
        id: 'msg-existing',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        clientSeq: 1001,
        type: 'text',
        content: { text: 'hello' },
        status: 'sent',
        createdAt: new Date('2026-03-06T10:00:00.000Z'),
      };
      mockDeduplicationService.isDuplicate.mockResolvedValue(true);
      mockMessageRepository.findOne.mockResolvedValue(existingMessage);

      const result = await service.sendMessage({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        type: 'text' as any,
        content: { text: 'hello' } as any,
        clientSeq: 1001,
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          isDuplicate: true,
          message: existingMessage,
        }),
      );
      expect(mockMessageRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fromUserId: 'user-1',
            clientSeq: 1001,
            toUserId: 'user-2',
          }),
        }),
      );
      expect(mockFilterService.checkSingleMessagePermission).not.toHaveBeenCalled();
    });
  });

  describe('unique constraint recovery', () => {
    it('should recover duplicate single send on unique constraint and return existing message', async () => {
      const queryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        manager: {
          save: jest.fn().mockRejectedValue({ code: '23505', message: 'duplicate key value violates unique constraint' }),
        },
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockDataSource.createQueryRunner.mockReturnValue(queryRunner as any);
      mockDeduplicationService.isDuplicate.mockResolvedValue(false);
      mockFilterService.checkSingleMessagePermission.mockResolvedValue({ allowed: true });
      mockSequenceService.getNextSequence.mockResolvedValue(1001);
      mockMessageRepository.create.mockReturnValue({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        clientSeq: 101,
      });
      const existingMessage = {
        id: 'msg-existing',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        clientSeq: 101,
      };
      mockMessageRepository.findOne.mockResolvedValue(existingMessage);

      const result = await service.sendMessage({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        type: 'text' as any,
        content: { text: 'hello' } as any,
        clientSeq: 101,
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          isDuplicate: true,
          message: existingMessage,
        }),
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should fallback to per-message send when batch save hits unique constraint', async () => {
      const queryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        manager: {
          save: jest.fn().mockRejectedValue({ code: '23505', message: 'duplicate key value violates unique constraint' }),
        },
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockDataSource.createQueryRunner.mockReturnValue(queryRunner as any);
      mockDeduplicationService.isDuplicate.mockResolvedValue(false);
      mockFilterService.checkSingleMessagePermission.mockResolvedValue({ allowed: true });
      mockSequenceService.getNextSequences.mockResolvedValue([2001]);
      mockMessageRepository.create.mockReturnValue({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        clientSeq: 202,
      });

      const fallbackResult = {
        success: true,
        isDuplicate: true,
        message: { id: 'msg-recovered' },
      };
      const sendSpy = jest.spyOn(service, 'sendMessage').mockResolvedValue(fallbackResult as any);

      const result = await service.sendMessageBatch([
        {
          fromUserId: 'user-1',
          toUserId: 'user-2',
          type: 'text' as any,
          content: { text: 'hello' } as any,
          clientSeq: 202,
        } as any,
      ]);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(result.results).toEqual([fallbackResult]);
      expect(result.success).toBe(true);
      sendSpy.mockRestore();
    });
  });
});
