import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Friend } from '../friend/friend.entity';
import { TimelineFeedItemEntity } from './entities/timeline-feed-item.entity';
import { TimelinePostLikeEntity } from './entities/timeline-post-like.entity';
import { TimelinePostEntity } from './entities/timeline-post.entity';
import {
  TimelineDistributionMode,
  TimelineVisibility,
} from './timeline.interface';
import { TimelineService } from './timeline.service';

interface FeedCandidate {
  sortScore: string;
  postId: string;
}

function makeCandidate(sortScore: number, postId: number): FeedCandidate {
  return {
    sortScore: String(sortScore),
    postId: String(postId),
  };
}

function makePost(postId: string): TimelinePostEntity {
  return {
    id: postId,
    authorId: 'author-1',
    visibility: TimelineVisibility.PUBLIC,
    distributionMode: TimelineDistributionMode.HYBRID,
    text: `post-${postId}`,
    media: [],
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    publishedAt: new Date(1700000000000),
    status: 'active',
    isDeleted: false,
  } as unknown as TimelinePostEntity;
}

async function setup(
  feedScanRounds = 4,
  options?: {
    feedProfilingEnabled?: boolean;
    feedProfilingSampleRate?: number;
  },
): Promise<{
  service: TimelineService;
  mockPostRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  mockFeedItemRepository: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
  };
  mockLikeRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  mockFriendRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
  };
  mockDataSource: {
    options: { type: string };
    transaction: jest.Mock;
  };
}> {
  const mockPostRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockFeedItemRepository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((value) => value),
  };
  const mockLikeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mockFriendRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };
  const mockDataSource = {
    options: { type: 'postgres' },
    transaction: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TIMELINE_FANOUT_BATCH_SIZE') {
        return 500;
      }
      if (key === 'TIMELINE_FANOUT_THRESHOLD') {
        return 5000;
      }
      if (key === 'TIMELINE_HYBRID_SEED_COUNT') {
        return 2000;
      }
      if (key === 'TIMELINE_FEED_SCAN_ROUNDS') {
        return feedScanRounds;
      }
      if (key === 'TIMELINE_FEED_PROFILING_ENABLED') {
        return options?.feedProfilingEnabled === true ? 'true' : undefined;
      }
      if (key === 'TIMELINE_FEED_PROFILING_SAMPLE_RATE') {
        return options?.feedProfilingSampleRate;
      }
      return undefined;
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TimelineService,
      {
        provide: getRepositoryToken(TimelinePostEntity),
        useValue: mockPostRepository,
      },
      {
        provide: getRepositoryToken(TimelineFeedItemEntity),
        useValue: mockFeedItemRepository,
      },
      {
        provide: getRepositoryToken(TimelinePostLikeEntity),
        useValue: mockLikeRepository,
      },
      {
        provide: getRepositoryToken(Friend),
        useValue: mockFriendRepository,
      },
      {
        provide: DataSource,
        useValue: mockDataSource as unknown as DataSource,
      },
      {
        provide: ConfigService,
        useValue: mockConfigService,
      },
    ],
  }).compile();

  return {
    service: module.get<TimelineService>(TimelineService),
    mockPostRepository,
    mockFeedItemRepository,
    mockLikeRepository,
    mockFriendRepository,
    mockDataSource,
  };
}

describe('TimelineService', () => {
  it('should return a continuation cursor when no visible item in current scan window', async () => {
    const { service, mockPostRepository } = await setup(1);
    const fetchSize = 60; // limit(20) * multiplier(3)
    const batch = Array.from({ length: fetchSize }, (_, idx) =>
      makeCandidate(1_000_000 - idx, 9_000_000 - idx),
    );

    jest.spyOn(service as any, 'getInboxCandidates').mockResolvedValue(batch);
    jest.spyOn(service as any, 'getPullCandidates').mockResolvedValue([]);
    jest.spyOn(service as any, 'filterVisibleCandidates').mockResolvedValue([]);
    mockPostRepository.find.mockResolvedValue([]);

    const page = await service.getFeed('viewer-1', { limit: 20 });

    expect(page.items).toHaveLength(0);
    expect(page.nextCursor).toBeDefined();

    const decoded = JSON.parse(Buffer.from(page.nextCursor!, 'base64').toString('utf8'));
    expect(decoded).toEqual(batch[batch.length - 1]);
  });

  it('should continue scanning rounds to backfill enough visible posts', async () => {
    const { service, mockPostRepository, mockLikeRepository } = await setup(2);
    const fetchSize = 60; // limit(20) * multiplier(3)
    const batchOne = Array.from({ length: fetchSize }, (_, idx) =>
      makeCandidate(2_000_000 - idx, 8_000_000 - idx),
    );
    const batchTwo = Array.from({ length: fetchSize }, (_, idx) =>
      makeCandidate(1_000_000 - idx, 7_000_000 - idx),
    );
    const visibleRoundOne = batchOne.slice(0, 10);
    const visibleRoundTwo = [...visibleRoundOne, ...batchTwo.slice(0, 11)];

    const inboxSpy = jest
      .spyOn(service as any, 'getInboxCandidates')
      .mockResolvedValueOnce(batchOne)
      .mockResolvedValueOnce(batchTwo);
    jest.spyOn(service as any, 'getPullCandidates').mockResolvedValue([]);
    const visibleSpy = jest
      .spyOn(service as any, 'filterVisibleCandidates')
      .mockResolvedValueOnce(visibleRoundOne)
      .mockResolvedValueOnce(visibleRoundTwo);

    const postMapData = [...batchOne, ...batchTwo].map((candidate) => makePost(candidate.postId));
    mockPostRepository.find.mockResolvedValue(postMapData);
    mockLikeRepository.find.mockResolvedValue([]);

    const page = await service.getFeed('viewer-1', { limit: 20 });

    expect(inboxSpy).toHaveBeenCalledTimes(2);
    expect(visibleSpy).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBeDefined();
    expect(page.items.map((item) => item.id)).toEqual(
      visibleRoundTwo.slice(0, 20).map((item) => item.postId),
    );
  });

  it('should acquire per-user advisory lock before mutating like state', async () => {
    const {
      service,
      mockDataSource,
      mockPostRepository,
    } = await setup(2);
    const managerQuery = jest.fn().mockResolvedValue(undefined);

    const likeRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const likeUpdateExecute = jest.fn().mockResolvedValue(undefined);
    const likeUpdateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: likeUpdateExecute,
    };
    const postRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(likeUpdateBuilder),
      findOne: jest.fn().mockResolvedValue({ id: '101', likeCount: 1 }),
    };

    mockDataSource.transaction.mockImplementation(async (callback: (manager: any) => Promise<any>) =>
      callback({
        query: managerQuery,
        getRepository: (repo: unknown) => {
          if (repo === TimelinePostLikeEntity) {
            return likeRepo;
          }
          if (repo === TimelinePostEntity) {
            return postRepo;
          }
          throw new Error('Unexpected repository');
        },
      }),
    );

    mockPostRepository.findOne.mockResolvedValue({
      id: '101',
      authorId: 'author-1',
      visibility: TimelineVisibility.PUBLIC,
      customAudienceIds: [],
    } as unknown as TimelinePostEntity);

    const result = await service.toggleLike('viewer-1', '101', { liked: true });

    expect(managerQuery).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));',
      ['101', 'viewer-1'],
    );
    expect(likeRepo.save).toHaveBeenCalledTimes(1);
    expect(likeUpdateExecute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ liked: true, likeCount: 1 });
  });

  it('should only fetch hybrid seed audience for public posts instead of full friend list', async () => {
    const { service, mockFriendRepository } = await setup(2);
    mockFriendRepository.count.mockResolvedValue(100000);
    mockFriendRepository.find.mockResolvedValue([{ friendId: 'friend-1' }, { friendId: 'friend-2' }]);

    const result = await (service as any).resolveAudience(
      'author-1',
      TimelineVisibility.PUBLIC,
      [],
      mockFriendRepository,
    );

    expect(mockFriendRepository.count).toHaveBeenCalledTimes(1);
    expect(mockFriendRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        select: ['friendId'],
        take: 1999,
      }),
    );
    expect(result.audienceCount).toBe(100001);
    expect(result.audience).toEqual(expect.arrayContaining(['author-1', 'friend-1', 'friend-2']));
  });

  it('should resolve custom audience by filtering requested user ids against accepted friends', async () => {
    const { service, mockFriendRepository } = await setup(2);
    mockFriendRepository.find.mockResolvedValue([{ friendId: 'friend-2' }]);

    const result = await (service as any).resolveAudience(
      'author-1',
      TimelineVisibility.CUSTOM,
      ['friend-2', 'friend-3', 'author-1', 'friend-2'],
      mockFriendRepository,
    );

    expect(mockFriendRepository.count).not.toHaveBeenCalled();
    expect(mockFriendRepository.find).toHaveBeenCalledTimes(1);
    expect(result.audience).toEqual(['author-1', 'friend-2']);
    expect(result.audienceCount).toBe(2);
  });

  it('should encode cursor as base64url and decode both base64url and legacy base64', async () => {
    const { service } = await setup(2);
    const cursor = {
      sortScore: '123456789',
      postId: '9001',
    };

    const encoded = (service as any).encodeCursor(cursor);
    expect(encoded).toBeDefined();
    expect(encoded.includes('+')).toBe(false);
    expect(encoded.includes('/')).toBe(false);

    const decodedFromBase64url = (service as any).decodeCursor(encoded);
    expect(decodedFromBase64url).toEqual(cursor);

    const legacyBase64 = Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
    const decodedFromLegacy = (service as any).decodeCursor(legacyBase64);
    expect(decodedFromLegacy).toEqual(cursor);
  });

  it('should reject overlong cursor payload defensively', async () => {
    const { service } = await setup(2);
    const overlong = 'a'.repeat(3000);
    expect((service as any).decodeCursor(overlong)).toBeUndefined();
  });

  it('should emit feed profiling log when profiling is enabled', async () => {
    const { service, mockPostRepository, mockLikeRepository } = await setup(1, {
      feedProfilingEnabled: true,
    });
    const batch = [makeCandidate(1_000_000, 9_000_000)];
    jest.spyOn(service as any, 'getInboxCandidates').mockResolvedValue(batch);
    jest.spyOn(service as any, 'getPullCandidates').mockResolvedValue([]);
    jest.spyOn(service as any, 'filterVisibleCandidates').mockResolvedValue(batch);
    mockPostRepository.find.mockResolvedValue([makePost('9000000')]);
    mockLikeRepository.find.mockResolvedValue([]);

    const debugSpy = jest.spyOn((service as any).logger, 'debug').mockImplementation(() => undefined);
    const page = await service.getFeed('viewer-1', { limit: 20 });

    expect(page.items).toHaveLength(1);
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('timeline feed profile '));
  });

  it('should honor feed profiling sample rate when profiling is enabled', async () => {
    const { service, mockPostRepository, mockLikeRepository } = await setup(1, {
      feedProfilingEnabled: true,
      feedProfilingSampleRate: 0.5,
    });
    const batch = [makeCandidate(1_000_000, 9_000_000)];
    jest.spyOn(service as any, 'getInboxCandidates').mockResolvedValue(batch);
    jest.spyOn(service as any, 'getPullCandidates').mockResolvedValue([]);
    jest.spyOn(service as any, 'filterVisibleCandidates').mockResolvedValue(batch);
    mockPostRepository.find.mockResolvedValue([makePost('9000000')]);
    mockLikeRepository.find.mockResolvedValue([]);

    const debugSpy = jest.spyOn((service as any).logger, 'debug').mockImplementation(() => undefined);
    const randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.2);

    await service.getFeed('viewer-1', { limit: 20 });
    await service.getFeed('viewer-1', { limit: 20 });

    expect(debugSpy).toHaveBeenCalledTimes(1);
    randomSpy.mockRestore();
  });
});
