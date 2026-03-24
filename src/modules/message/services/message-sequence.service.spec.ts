import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { Message } from '../message.entity';
import { MessageSequenceService } from './message-sequence.service';

type QueryBuilderMock = {
  select: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
};

const createQueryBuilderMock = (): QueryBuilderMock => {
  const queryBuilder = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  } as QueryBuilderMock;

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  return queryBuilder;
};

describe('MessageSequenceService', () => {
  let service: MessageSequenceService;

  const mockRedis = {
    incr: jest.fn(),
    incrby: jest.fn(),
    expire: jest.fn(),
    pipeline: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMessageRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageSequenceService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    service = module.get<MessageSequenceService>(MessageSequenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should rehydrate missing sequence keys from db max before allocating next sequence', async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockRedis.set
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK');
    mockRedis.incr.mockResolvedValue(43);

    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getRawOne.mockResolvedValue({ maxSeq: '42' });
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getNextSequence('single:user-1:user-2');

    expect(result).toBe(43);
    expect(queryBuilder.getRawOne).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenNthCalledWith(
      1,
      'msg:seq:initlock:single:user-1:user-2',
      '1',
      'PX',
      5000,
      'NX',
    );
    expect(mockRedis.set).toHaveBeenNthCalledWith(
      2,
      'msg:seq:single:user-1:user-2',
      '42',
      'EX',
      2592000,
    );
    expect(mockRedis.incr).toHaveBeenCalledWith('msg:seq:single:user-1:user-2');
    expect(mockRedis.expire).toHaveBeenCalledWith('msg:seq:single:user-1:user-2', 2592000);
    expect(mockRedis.del).toHaveBeenCalledWith('msg:seq:initlock:single:user-1:user-2');
  });

  it('should refresh ttl for existing sequence keys when allocating next sequence', async () => {
    mockRedis.get.mockResolvedValue('7');
    mockRedis.incr.mockResolvedValue(8);

    const result = await service.getNextSequence('single:user-1:user-2');

    expect(result).toBe(8);
    expect(mockMessageRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(mockRedis.expire).toHaveBeenCalledWith('msg:seq:single:user-1:user-2', 2592000);
  });

  it('should fallback to db max sequence when redis key is missing', async () => {
    mockRedis.get.mockResolvedValue(null);
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getRawOne.mockResolvedValue({ maxSeq: '42' });
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getCurrentSequence('single:user-1:user-2');

    expect(result).toBe(42);
    expect(queryBuilder.getRawOne).toHaveBeenCalledTimes(1);
  });

  it('should allocate contiguous sequence range via incrby for existing keys', async () => {
    mockRedis.get.mockResolvedValue('100');
    mockRedis.incrby.mockResolvedValue(105);

    const sequences = await service.getNextSequences('single:user-1:user-2', 5);

    expect(sequences).toEqual([101, 102, 103, 104, 105]);
    expect(mockRedis.incrby).toHaveBeenCalledWith('msg:seq:single:user-1:user-2', 5);
    expect(mockRedis.expire).toHaveBeenCalledWith('msg:seq:single:user-1:user-2', 2592000);
  });

  it('should rehydrate missing sequence keys from db max before allocating ranges', async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockRedis.set
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce('OK');
    mockRedis.incrby.mockResolvedValue(45);

    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getRawOne.mockResolvedValue({ maxSeq: '42' });
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getNextSequences('single:user-1:user-2', 3);

    expect(result).toEqual([43, 44, 45]);
    expect(queryBuilder.getRawOne).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenNthCalledWith(
      1,
      'msg:seq:initlock:single:user-1:user-2',
      '1',
      'PX',
      5000,
      'NX',
    );
    expect(mockRedis.set).toHaveBeenNthCalledWith(
      2,
      'msg:seq:single:user-1:user-2',
      '42',
      'EX',
      2592000,
    );
    expect(mockRedis.expire).toHaveBeenCalledWith('msg:seq:single:user-1:user-2', 2592000);
    expect(mockRedis.del).toHaveBeenCalledWith('msg:seq:initlock:single:user-1:user-2');
  });

  it('should return missing sequences for a group conversation', async () => {
    mockRedis.get.mockResolvedValue('6');
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getRawMany.mockResolvedValue([
      { seq: '1' },
      { seq: '2' },
      { seq: '4' },
    ]);
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getMissingSequences('group:group-1', 1, 5);

    expect(result).toEqual([3, 5]);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'message.groupId = :groupId',
      { groupId: 'group-1' },
    );
  });

  it('should return missing sequence scan metadata', async () => {
    mockRedis.get.mockResolvedValue('50000');
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getRawMany.mockResolvedValue([
      { seq: '1' },
      { seq: '2' },
      { seq: '4' },
    ]);
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getMissingSequencesWithMeta('group:group-1', 1, 50000);

    expect(result.scanFrom).toBe(1);
    expect(result.scanTo).toBe(20000);
    expect(result.requestedTo).toBe(50000);
    expect(result.truncated).toBe(true);
    expect(result.missingSequences).toContain(3);
  });

  it('should return empty missing list for invalid conversation key', async () => {
    mockRedis.get.mockResolvedValue('100');
    const queryBuilder = createQueryBuilderMock();
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getMissingSequences('invalid-key', 1, 10);

    expect(result).toEqual([]);
    expect(queryBuilder.getRawMany).not.toHaveBeenCalled();
  });

  it('should cap missing sequence scan window to protect storage', async () => {
    mockRedis.get.mockResolvedValue('50000');
    const queryBuilder = createQueryBuilderMock();
    queryBuilder.getRawMany.mockResolvedValue([]);
    mockMessageRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getMissingSequences('group:group-9', 1, 50000);

    expect(result).toHaveLength(20000);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20000);
  });
});
