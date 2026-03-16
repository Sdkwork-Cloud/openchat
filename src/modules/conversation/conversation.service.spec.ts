import { DataSource, Repository } from 'typeorm';
import { ConversationService } from './conversation.service';
import { ConversationEntity } from './conversation.entity';
import { ConversationReadCursorEntity } from './conversation-read-cursor.entity';
import { EventBusService } from '../../common/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';

type UpdateQueryBuilderMock = {
  update: jest.Mock;
  set: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  execute: jest.Mock;
};

type SummaryQueryBuilderMock = {
  where: jest.Mock;
  andWhere: jest.Mock;
  clone: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
};

function createUpdateQueryBuilder(): UpdateQueryBuilderMock {
  const queryBuilder: UpdateQueryBuilderMock = {
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
}

function createSummaryQueryBuilder(): SummaryQueryBuilderMock {
  const queryBuilder: SummaryQueryBuilderMock = {
    where: jest.fn(),
    andWhere: jest.fn(),
    clone: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.addSelect.mockReturnValue(queryBuilder);
  queryBuilder.groupBy.mockReturnValue(queryBuilder);
  queryBuilder.orderBy.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockReturnValue(queryBuilder);
  return queryBuilder;
}

describe('ConversationService', () => {
  let service: ConversationService;
  let conversationRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let cursorRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let conversationUpdateQueryBuilder: UpdateQueryBuilderMock;
  let cursorUpdateQueryBuilder: UpdateQueryBuilderMock;

  beforeEach(() => {
    conversationUpdateQueryBuilder = createUpdateQueryBuilder();
    cursorUpdateQueryBuilder = createUpdateQueryBuilder();

    conversationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(conversationUpdateQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    cursorRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(cursorUpdateQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn((input: object) => input),
      save: jest.fn(),
      update: jest.fn(),
    };

    service = new ConversationService(
      {} as DataSource,
      conversationRepository as unknown as Repository<ConversationEntity>,
      cursorRepository as unknown as Repository<ConversationReadCursorEntity>,
      {} as EventBusService,
      {} as CacheService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('advanceLastReadSeq', () => {
    it('should return false for invalid input', async () => {
      const result = await service.advanceLastReadSeq('user-1', 'user-2', 'single', 0);

      expect(result).toBe(false);
      expect(conversationRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should update lastReadSeq atomically when seq is newer', async () => {
      conversationUpdateQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await service.advanceLastReadSeq('user-1', 'user-2', 'single', 120);

      expect(result).toBe(true);
      expect(conversationUpdateQueryBuilder.update).toHaveBeenCalledWith(ConversationEntity);
      expect(conversationUpdateQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(last_read_seq IS NULL OR last_read_seq < :seq)',
        { seq: 120 },
      );
      expect(conversationRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true when seq is stale but conversation exists', async () => {
      conversationUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });

      const result = await service.advanceLastReadSeq('user-1', 'user-2', 'single', 80);

      expect(result).toBe(true);
      expect(conversationRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          targetId: 'user-2',
          type: 'single',
          isDeleted: false,
        },
        select: ['id'],
      });
    });

    it('should return false when conversation is missing', async () => {
      conversationUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      conversationRepository.findOne.mockResolvedValue(null);

      const result = await service.advanceLastReadSeq('user-1', 'user-2', 'single', 120);

      expect(result).toBe(false);
    });
  });

  describe('updateConversationForUser', () => {
    it('should persist draft text and draftUpdatedAt when draft is provided', async () => {
      const now = new Date('2026-03-14T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);
      conversationRepository.findOne.mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
        isDeleted: false,
        draft: null,
        draftUpdatedAt: null,
      });
      conversationRepository.save.mockImplementation(async (entity: any) => entity);

      const result = await service.updateConversationForUser('conv-1', 'user-1', {
        draft: 'reply later',
      } as any);

      expect(conversationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conv-1',
          draft: 'reply later',
          draftUpdatedAt: now,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          draft: 'reply later',
        }),
      );
      jest.useRealTimers();
    });

    it('should clear draft and draftUpdatedAt when draft is blank', async () => {
      conversationRepository.findOne.mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
        isDeleted: false,
        draft: 'stale draft',
        draftUpdatedAt: new Date('2026-03-13T10:00:00.000Z'),
      });
      conversationRepository.save.mockImplementation(async (entity: any) => entity);

      const result = await service.updateConversationForUser('conv-1', 'user-1', {
        draft: '   ',
      } as any);

      expect(conversationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conv-1',
          draft: null,
          draftUpdatedAt: null,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          draft: undefined,
        }),
      );
    });
  });

  describe('advanceDeviceLastReadSeq', () => {
    it('should reject invalid deviceId', async () => {
      const result = await service.advanceDeviceLastReadSeq('user-1', 'bad device id', 'user-2', 'single', 10);

      expect(result).toBe(false);
      expect(cursorRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return false when conversation does not exist', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      const result = await service.advanceDeviceLastReadSeq(
        'user-1',
        'ios-1',
        'user-2',
        'single',
        100,
      );

      expect(result).toBe(false);
      expect(cursorRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should atomically update device cursor when seq is newer', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });
      cursorUpdateQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await service.advanceDeviceLastReadSeq(
        'user-1',
        'ios-1',
        'user-2',
        'single',
        220,
      );

      expect(result).toBe(true);
      expect(cursorUpdateQueryBuilder.update).toHaveBeenCalledWith(ConversationReadCursorEntity);
      expect(cursorUpdateQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(last_read_seq IS NULL OR last_read_seq < :seq)',
        { seq: 220 },
      );
      expect(cursorRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true when cursor exists but ack is stale', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });
      cursorUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      cursorRepository.findOne.mockResolvedValue({ id: 'cursor-1' });

      const result = await service.advanceDeviceLastReadSeq(
        'user-1',
        'android-1',
        'group-9',
        'group',
        90,
      );

      expect(result).toBe(true);
      expect(cursorRepository.save).not.toHaveBeenCalled();
    });

    it('should create cursor when no cursor exists', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });
      cursorUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      cursorRepository.findOne.mockResolvedValue(null);
      cursorRepository.save.mockResolvedValue({ id: 'cursor-2' });

      const result = await service.advanceDeviceLastReadSeq(
        'user-1',
        'web-1',
        'user-2',
        'single',
        300,
      );

      expect(result).toBe(true);
      expect(cursorRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          deviceId: 'web-1',
          targetId: 'user-2',
          type: 'single',
          lastReadSeq: 300,
        }),
      );
      expect(cursorRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteDeviceReadCursorsForUser', () => {
    it('should return 0 when deviceId is invalid', async () => {
      const result = await service.deleteDeviceReadCursorsForUser('user-1', 'invalid device id');

      expect(result).toBe(0);
      expect(cursorRepository.update).not.toHaveBeenCalled();
    });

    it('should soft delete device cursors for authenticated user', async () => {
      cursorRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.deleteDeviceReadCursorsForUser('user-1', 'ios-001');

      expect(result).toBe(3);
      expect(cursorRepository.update).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          deviceId: 'ios-001',
          isDeleted: false,
        },
        { isDeleted: true },
      );
    });
  });

  describe('deleteDeviceReadCursorsForUserExcept', () => {
    it('should return 0 when keepDeviceId is invalid', async () => {
      const result = await service.deleteDeviceReadCursorsForUserExcept('user-1', 'bad device id');

      expect(result).toBe(0);
      expect(cursorRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should soft delete all device cursors except keepDeviceId', async () => {
      const deleteOthersQueryBuilder = createUpdateQueryBuilder();
      deleteOthersQueryBuilder.execute.mockResolvedValue({ affected: 7 });
      cursorRepository.createQueryBuilder.mockReturnValue(deleteOthersQueryBuilder);

      const result = await service.deleteDeviceReadCursorsForUserExcept('user-1', 'ios-001');

      expect(result).toBe(7);
      expect(deleteOthersQueryBuilder.update).toHaveBeenCalledWith(ConversationReadCursorEntity);
      expect(deleteOthersQueryBuilder.andWhere).toHaveBeenCalledWith(
        'device_id != :keepDeviceId',
        { keepDeviceId: 'ios-001' },
      );
    });
  });

  describe('getDeviceReadCursorSummariesForUser', () => {
    it('should return empty result when userId is missing', async () => {
      const result = await service.getDeviceReadCursorSummariesForUser('', 100);

      expect(result).toEqual({ total: 0, items: [] });
      expect(cursorRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return summarized device cursor stats', async () => {
      const baseQueryBuilder = createSummaryQueryBuilder();
      const countQueryBuilder = createSummaryQueryBuilder();
      const listQueryBuilder = createSummaryQueryBuilder();

      baseQueryBuilder.clone
        .mockReturnValueOnce(countQueryBuilder)
        .mockReturnValueOnce(listQueryBuilder);
      countQueryBuilder.getRawOne.mockResolvedValue({ total: '2' });
      listQueryBuilder.getRawMany.mockResolvedValue([
        {
          deviceId: 'ios-001',
          conversationCount: '8',
          lastActiveAt: '2026-03-08T10:00:00.000Z',
        },
        {
          deviceId: 'web-001',
          conversationCount: 3,
          lastActiveAt: '2026-03-08T09:00:00.000Z',
        },
      ]);

      cursorRepository.createQueryBuilder.mockReturnValue(baseQueryBuilder);

      const result = await service.getDeviceReadCursorSummariesForUser('user-1', 500);

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        deviceId: 'ios-001',
        conversationCount: 8,
        lastActiveAt: '2026-03-08T10:00:00.000Z',
      });
      expect(result.items[1]).toEqual({
        deviceId: 'web-001',
        conversationCount: 3,
        lastActiveAt: '2026-03-08T09:00:00.000Z',
      });
      expect(listQueryBuilder.limit).toHaveBeenCalledWith(200);
    });

    it('should fallback to default limit when limit is invalid', async () => {
      const baseQueryBuilder = createSummaryQueryBuilder();
      const countQueryBuilder = createSummaryQueryBuilder();
      const listQueryBuilder = createSummaryQueryBuilder();

      baseQueryBuilder.clone
        .mockReturnValueOnce(countQueryBuilder)
        .mockReturnValueOnce(listQueryBuilder);
      countQueryBuilder.getRawOne.mockResolvedValue({ total: '0' });
      listQueryBuilder.getRawMany.mockResolvedValue([]);

      cursorRepository.createQueryBuilder.mockReturnValue(baseQueryBuilder);

      const result = await service.getDeviceReadCursorSummariesForUser(
        'user-1',
        'bad-limit' as unknown as number,
      );

      expect(result).toEqual({ total: 0, items: [] });
      expect(listQueryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('deleteStaleDeviceReadCursorsForUser', () => {
    it('should return 0 when userId is missing', async () => {
      const result = await service.deleteStaleDeviceReadCursorsForUser('', 90);

      expect(result).toBe(0);
      expect(cursorRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should soft delete stale cursors based on inactiveDays', async () => {
      const staleUpdateQueryBuilder = createUpdateQueryBuilder();
      staleUpdateQueryBuilder.execute.mockResolvedValue({ affected: 5 });
      cursorRepository.createQueryBuilder.mockReturnValue(staleUpdateQueryBuilder);

      const result = await service.deleteStaleDeviceReadCursorsForUser('user-1', 120);

      expect(result).toBe(5);
      expect(staleUpdateQueryBuilder.update).toHaveBeenCalledWith(ConversationReadCursorEntity);
      expect(staleUpdateQueryBuilder.andWhere).toHaveBeenCalledWith(
        'updated_at < :cutoffTime',
        expect.objectContaining({
          cutoffTime: expect.any(Date),
        }),
      );
    });
  });
});
