import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Friend } from '../friend/friend.entity';
import {
  CreateTimelinePostDto,
  GetTimelineFeedQueryDto,
  ToggleTimelineLikeDto,
} from './dto/timeline.dto';
import { TimelineFeedItemEntity } from './entities/timeline-feed-item.entity';
import { TimelinePostLikeEntity } from './entities/timeline-post-like.entity';
import { TimelinePostEntity } from './entities/timeline-post.entity';
import {
  TimelineDistributionMode,
  TimelineFeedItemStatus,
  TimelineFeedPage,
  TimelinePostStatus,
  TimelinePostView,
  TimelineVisibility,
} from './timeline.interface';

interface FeedCursor {
  sortScore: string;
  postId: string;
}

interface FeedCollectionResult {
  mergedCandidates: FeedCursor[];
  visibleCandidates: FeedCursor[];
  postMap: Map<string, TimelinePostEntity>;
  fullyScanned: boolean;
  profile: FeedCollectionProfile;
}

interface TimelineAudienceResolution {
  audience: string[];
  audienceCount: number;
}

interface FeedScanRoundProfile {
  round: number;
  inboxBatchSize: number;
  pullBatchSize: number;
  mergedCandidates: number;
  visibleCandidates: number;
  inboxExhausted: boolean;
  pullExhausted: boolean;
}

interface FeedCollectionProfile {
  roundsExecuted: number;
  sourceFetchSize: number;
  limitPlusOne: number;
  mergedCandidates: number;
  visibleCandidates: number;
  postMapSize: number;
  fullyScanned: boolean;
  rounds: FeedScanRoundProfile[];
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);
  private readonly fanoutBatchSize: number;
  private readonly fanoutThreshold: number;
  private readonly hybridSeedCount: number;
  private readonly maxFeedScanRounds: number;
  private readonly feedProfilingEnabled: boolean;
  private readonly feedProfilingSampleRate: number;
  private readonly feedSourceFetchMultiplier = 3;
  private readonly maxSourceFetchSize = 300;

  constructor(
    @InjectRepository(TimelinePostEntity)
    private readonly postRepository: Repository<TimelinePostEntity>,
    @InjectRepository(TimelineFeedItemEntity)
    private readonly feedItemRepository: Repository<TimelineFeedItemEntity>,
    @InjectRepository(TimelinePostLikeEntity)
    private readonly likeRepository: Repository<TimelinePostLikeEntity>,
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.fanoutBatchSize = this.readNumberConfig('TIMELINE_FANOUT_BATCH_SIZE', 500, 100, 5000);
    this.fanoutThreshold = this.readNumberConfig('TIMELINE_FANOUT_THRESHOLD', 5000, 100, 1000000);
    this.hybridSeedCount = this.readNumberConfig('TIMELINE_HYBRID_SEED_COUNT', 2000, 1, 50000);
    this.maxFeedScanRounds = this.readNumberConfig('TIMELINE_FEED_SCAN_ROUNDS', 4, 1, 20);
    this.feedProfilingEnabled = this.readBooleanConfig('TIMELINE_FEED_PROFILING_ENABLED', false);
    this.feedProfilingSampleRate = this.readRatioConfig('TIMELINE_FEED_PROFILING_SAMPLE_RATE', 1);
  }

  async createPost(
    authorId: string,
    dto: CreateTimelinePostDto,
  ): Promise<{ post: TimelinePostEntity; audienceCount: number }> {
    const normalizedText = dto.text?.trim();
    const media = dto.media || [];
    if (!normalizedText && media.length === 0) {
      throw new BadRequestException('Post text and media cannot both be empty');
    }

    if (
      dto.visibility === TimelineVisibility.CUSTOM &&
      (!dto.customAudienceIds || dto.customAudienceIds.length === 0)
    ) {
      throw new BadRequestException('customAudienceIds is required for custom visibility');
    }

    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const postRepo = manager.getRepository(TimelinePostEntity);
      const friendRepo = manager.getRepository(Friend);
      const feedRepo = manager.getRepository(TimelineFeedItemEntity);

      const audienceResolution = await this.resolveAudience(
        authorId,
        dto.visibility,
        dto.customAudienceIds || [],
        friendRepo,
      );
      const normalizedCustomAudienceIds = this.normalizeCustomAudienceIds(
        authorId,
        dto.visibility,
        audienceResolution.audience,
      );
      if (dto.visibility === TimelineVisibility.CUSTOM && !normalizedCustomAudienceIds?.length) {
        throw new BadRequestException('customAudienceIds contains no valid recipients');
      }
      const distributionMode = this.resolveDistributionMode(
        dto.visibility,
        audienceResolution.audienceCount,
      );
      const fanoutAudience = this.resolveFanoutAudience(
        authorId,
        audienceResolution.audience,
        distributionMode,
      );

      const post = postRepo.create({
        authorId,
        visibility: dto.visibility,
        distributionMode,
        text: normalizedText,
        media,
        customAudienceIds: normalizedCustomAudienceIds,
        extra: dto.extra,
        status: TimelinePostStatus.ACTIVE,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        publishedAt: now,
      });
      const savedPost = await postRepo.save(post);

      await this.fanoutPost(savedPost, fanoutAudience, feedRepo);

      if (distributionMode !== TimelineDistributionMode.PUSH) {
        this.logger.debug(
          `timeline post ${savedPost.id} mode=${distributionMode} audience=${audienceResolution.audienceCount} seed=${fanoutAudience.length}`,
        );
      }

      return {
        post: savedPost,
        audienceCount: audienceResolution.audienceCount,
      };
    });
  }

  async getFeed(userId: string, query: GetTimelineFeedQueryDto): Promise<TimelineFeedPage> {
    const startedAt = Date.now();
    const limit = Math.max(1, Math.min(query.limit || 20, 100));
    const cursor = this.decodeCursor(query.cursor);
    const sourceFetchSize = Math.min(
      Math.max(limit * this.feedSourceFetchMultiplier, limit + 1),
      this.maxSourceFetchSize,
    );
    const {
      mergedCandidates,
      visibleCandidates,
      postMap,
      fullyScanned,
      profile,
    } = await this.collectFeedCandidates(
      userId,
      cursor,
      sourceFetchSize,
      limit + 1,
    );

    let response: TimelineFeedPage;
    if (visibleCandidates.length === 0) {
      const nextCursor = !fullyScanned && mergedCandidates.length > 0
        ? this.encodeCursor(mergedCandidates[mergedCandidates.length - 1])
        : undefined;
      response = {
        items: [],
        nextCursor,
      };
    } else {
      const hasMore = visibleCandidates.length > limit;
      const pageCandidates = hasMore ? visibleCandidates.slice(0, limit) : visibleCandidates;
      const pagePostIds = pageCandidates.map((item) => item.postId);
      const likes = pagePostIds.length > 0
        ? await this.likeRepository.find({
            where: {
              userId,
              postId: In(pagePostIds),
              isDeleted: false,
            },
            select: ['postId'],
          })
        : [];
      const likedSet = new Set(likes.map((like) => like.postId));

      const items: TimelinePostView[] = [];
      for (const candidate of pageCandidates) {
        const post = postMap.get(candidate.postId);
        if (!post) {
          continue;
        }
        items.push(this.toPostView(post, likedSet.has(post.id)));
      }

      let nextCursor: string | undefined;
      if (hasMore && pageCandidates.length > 0) {
        nextCursor = this.encodeCursor(pageCandidates[pageCandidates.length - 1]);
      } else if (!fullyScanned && mergedCandidates.length > 0) {
        // Continue from the oldest scanned candidate to avoid repeatedly scanning hidden items.
        nextCursor = this.encodeCursor(mergedCandidates[mergedCandidates.length - 1]);
      }

      response = {
        items,
        nextCursor,
      };
    }

    this.logFeedProfile({
      userId,
      limit,
      sourceFetchSize,
      cursorProvided: !!cursor,
      durationMs: Date.now() - startedAt,
      result: response,
      collectionProfile: profile,
    });
    return response;
  }

  async getPost(postId: string, viewerId: string): Promise<TimelinePostView> {
    const post = await this.postRepository.findOne({
      where: {
        id: postId,
        status: TimelinePostStatus.ACTIVE,
        isDeleted: false,
      },
    });
    if (!post) {
      throw new NotFoundException('Timeline post not found');
    }

    const canView = await this.canViewPost(viewerId, post);
    if (!canView) {
      throw new ForbiddenException('No permission to view this post');
    }

    const liked = await this.likeRepository.findOne({
      where: {
        postId,
        userId: viewerId,
        isDeleted: false,
      },
      select: ['id'],
    });

    return this.toPostView(post, !!liked);
  }

  async getUserPosts(
    viewerId: string,
    authorId: string,
    query: GetTimelineFeedQueryDto,
  ): Promise<TimelineFeedPage> {
    const limit = Math.max(1, Math.min(query.limit || 20, 100));
    const cursor = this.decodeCursor(query.cursor);
    const isFriend = viewerId === authorId
      ? true
      : await this.isFriend(authorId, viewerId);

    const qb = this.postRepository
      .createQueryBuilder('post')
      .where('post.author_id = :authorId', { authorId })
      .andWhere('post.status = :status', { status: TimelinePostStatus.ACTIVE })
      .andWhere('post.is_deleted = false')
      .orderBy('post.published_at', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .take(limit + 1);

    if (viewerId !== authorId) {
      const visibilityWhereParts = [
        'post.visibility = :publicVisibility',
        `(post.visibility = :customVisibility AND post.custom_audience_ids IS NOT NULL AND :viewerId = ANY(post.custom_audience_ids))`,
      ];
      if (isFriend) {
        visibilityWhereParts.push('post.visibility = :friendsVisibility');
      }
      qb.andWhere(`(${visibilityWhereParts.join(' OR ')})`, {
        viewerId,
        publicVisibility: TimelineVisibility.PUBLIC,
        friendsVisibility: TimelineVisibility.FRIENDS,
        customVisibility: TimelineVisibility.CUSTOM,
      });
    }

    if (cursor) {
      const cursorDate = new Date(Number(cursor.sortScore));
      if (!Number.isNaN(cursorDate.getTime())) {
        qb.andWhere(
          '(post.published_at < :cursorDate OR (post.published_at = :cursorDate AND post.id < :postId))',
          { cursorDate, postId: cursor.postId },
        );
      }
    }

    const candidates = await qb.getMany();
    const hasMore = candidates.length > limit;
    const pagePosts = hasMore ? candidates.slice(0, limit) : candidates;

    const likedPostIds = pagePosts.length === 0
      ? []
      : (await this.likeRepository.find({
          where: {
            userId: viewerId,
            postId: In(pagePosts.map((item) => item.id)),
            isDeleted: false,
          },
          select: ['postId'],
        })).map((like) => like.postId);

    const likedSet = new Set(likedPostIds);
    const items = pagePosts.map((post) => this.toPostView(post, likedSet.has(post.id)));

    const nextCursor = hasMore && pagePosts.length > 0
      ? this.encodeCursor({
          sortScore: pagePosts[pagePosts.length - 1].publishedAt.getTime().toString(),
          postId: pagePosts[pagePosts.length - 1].id,
        })
      : undefined;

    return { items, nextCursor };
  }

  async deletePost(authorId: string, postId: string): Promise<boolean> {
    const post = await this.postRepository.findOne({
      where: {
        id: postId,
        authorId,
        status: TimelinePostStatus.ACTIVE,
        isDeleted: false,
      },
      select: ['id'],
    });
    if (!post) {
      return false;
    }

    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      await manager.update(
        TimelinePostEntity,
        { id: postId, authorId, isDeleted: false },
        {
          status: TimelinePostStatus.DELETED,
          deletedAt: now,
          isDeleted: true,
        },
      );

      await manager.update(
        TimelineFeedItemEntity,
        { postId, isDeleted: false },
        {
          status: TimelineFeedItemStatus.REMOVED,
          isDeleted: true,
        },
      );

      await manager.update(
        TimelinePostLikeEntity,
        { postId, isDeleted: false },
        {
          isDeleted: true,
          canceledAt: now,
        },
      );
    });

    return true;
  }

  async toggleLike(
    userId: string,
    postId: string,
    dto: ToggleTimelineLikeDto,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const post = await this.postRepository.findOne({
      where: {
        id: postId,
        status: TimelinePostStatus.ACTIVE,
        isDeleted: false,
      },
      select: ['id', 'authorId', 'visibility', 'customAudienceIds'],
    });
    if (!post) {
      throw new NotFoundException('Timeline post not found');
    }
    if (!(await this.canViewPost(userId, post))) {
      throw new ForbiddenException('No permission to like this post');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.acquireLikeLock(manager, postId, userId);
      const likeRepo = manager.getRepository(TimelinePostLikeEntity);
      const postRepo = manager.getRepository(TimelinePostEntity);

      const existingLike = await likeRepo.findOne({
        where: { postId, userId },
        select: ['id', 'isDeleted'],
      });
      const currentlyLiked = !!existingLike && !existingLike.isDeleted;
      const shouldLike = dto.liked === undefined ? !currentlyLiked : dto.liked;

      if (shouldLike && !currentlyLiked) {
        if (!existingLike) {
          const like = likeRepo.create({
            postId,
            userId,
            isDeleted: false,
          });
          await likeRepo.save(like);
        } else {
          await likeRepo.update(existingLike.id, {
            isDeleted: false,
            canceledAt: () => 'NULL',
          });
        }

        await postRepo
          .createQueryBuilder()
          .update(TimelinePostEntity)
          .set({ likeCount: () => 'like_count + 1' })
          .where('id = :postId', { postId })
          .execute();
      }

      if (!shouldLike && currentlyLiked && existingLike) {
        await likeRepo.update(existingLike.id, {
          isDeleted: true,
          canceledAt: new Date(),
        });

        await postRepo
          .createQueryBuilder()
          .update(TimelinePostEntity)
          .set({ likeCount: () => 'GREATEST(like_count - 1, 0)' })
          .where('id = :postId', { postId })
          .execute();
      }

      const latest = await postRepo.findOne({
        where: { id: postId },
        select: ['id', 'likeCount'],
      });

      return {
        liked: shouldLike,
        likeCount: latest?.likeCount || 0,
      };
    });
  }

  private async collectFeedCandidates(
    userId: string,
    cursor: FeedCursor | undefined,
    sourceFetchSize: number,
    limitPlusOne: number,
  ): Promise<FeedCollectionResult> {
    let inboxCursor = cursor;
    let pullCursor = cursor;
    let inboxExhausted = false;
    let pullExhausted = false;
    const mergedByPostId = new Map<string, FeedCursor>();
    const postMap = new Map<string, TimelinePostEntity>();

    let mergedCandidates: FeedCursor[] = [];
    let visibleCandidates: FeedCursor[] = [];
    const roundProfiles: FeedScanRoundProfile[] = [];
    let roundsExecuted = 0;

    for (let round = 0; round < this.maxFeedScanRounds; round += 1) {
      if (inboxExhausted && pullExhausted) {
        break;
      }
      roundsExecuted += 1;

      const [inboxBatch, pullBatch] = await Promise.all([
        inboxExhausted
          ? Promise.resolve([] as FeedCursor[])
          : this.getInboxCandidates(userId, inboxCursor, sourceFetchSize),
        pullExhausted
          ? Promise.resolve([] as FeedCursor[])
          : this.getPullCandidates(userId, pullCursor, sourceFetchSize),
      ]);

      if (inboxBatch.length < sourceFetchSize) {
        inboxExhausted = true;
      }
      if (pullBatch.length < sourceFetchSize) {
        pullExhausted = true;
      }

      if (inboxBatch.length > 0) {
        inboxCursor = inboxBatch[inboxBatch.length - 1];
      }
      if (pullBatch.length > 0) {
        pullCursor = pullBatch[pullBatch.length - 1];
      }

      for (const candidate of inboxBatch) {
        this.mergeFeedCandidate(mergedByPostId, candidate);
      }
      for (const candidate of pullBatch) {
        this.mergeFeedCandidate(mergedByPostId, candidate);
      }

      if (mergedByPostId.size === 0) {
        roundProfiles.push({
          round: round + 1,
          inboxBatchSize: inboxBatch.length,
          pullBatchSize: pullBatch.length,
          mergedCandidates: 0,
          visibleCandidates: 0,
          inboxExhausted,
          pullExhausted,
        });
        continue;
      }

      mergedCandidates = Array.from(mergedByPostId.values())
        .sort((a, b) => this.compareFeedCursorDesc(a, b));
      await this.loadPostsForCandidates(mergedCandidates, postMap);
      visibleCandidates = await this.filterVisibleCandidates(
        userId,
        mergedCandidates,
        postMap,
        limitPlusOne,
      );
      roundProfiles.push({
        round: round + 1,
        inboxBatchSize: inboxBatch.length,
        pullBatchSize: pullBatch.length,
        mergedCandidates: mergedCandidates.length,
        visibleCandidates: visibleCandidates.length,
        inboxExhausted,
        pullExhausted,
      });

      if (visibleCandidates.length >= limitPlusOne) {
        break;
      }
    }

    const fullyScanned = inboxExhausted && pullExhausted;
    const profile: FeedCollectionProfile = {
      roundsExecuted,
      sourceFetchSize,
      limitPlusOne,
      mergedCandidates: mergedCandidates.length,
      visibleCandidates: visibleCandidates.length,
      postMapSize: postMap.size,
      fullyScanned,
      rounds: roundProfiles,
    };
    return {
      mergedCandidates,
      visibleCandidates,
      postMap,
      fullyScanned,
      profile,
    };
  }

  private async loadPostsForCandidates(
    candidates: FeedCursor[],
    postMap: Map<string, TimelinePostEntity>,
  ): Promise<void> {
    if (candidates.length === 0) {
      return;
    }

    const missingPostIds = [...new Set(
      candidates
        .map((item) => item.postId)
        .filter((postId) => !postMap.has(postId)),
    )];
    if (missingPostIds.length === 0) {
      return;
    }

    const posts = await this.postRepository.find({
      where: {
        id: In(missingPostIds),
        status: TimelinePostStatus.ACTIVE,
        isDeleted: false,
      },
    });
    for (const post of posts) {
      postMap.set(post.id, post);
    }
  }

  private async getInboxCandidates(
    userId: string,
    cursor: FeedCursor | undefined,
    fetchSize: number,
  ): Promise<FeedCursor[]> {
    const qb = this.feedItemRepository
      .createQueryBuilder('feed')
      .where('feed.user_id = :userId', { userId })
      .andWhere('feed.status = :status', { status: TimelineFeedItemStatus.ACTIVE })
      .andWhere('feed.is_deleted = false')
      .orderBy('feed.sort_score', 'DESC')
      .addOrderBy('feed.post_id', 'DESC')
      .take(fetchSize);

    if (cursor) {
      qb.andWhere(
        '(feed.sort_score < :score OR (feed.sort_score = :score AND feed.post_id < :postId))',
        {
          score: cursor.sortScore,
          postId: cursor.postId,
        },
      );
    }

    const feedItems = await qb.getMany();
    return feedItems.map((item) => ({
      sortScore: item.sortScore,
      postId: item.postId,
    }));
  }

  private async getPullCandidates(
    userId: string,
    cursor: FeedCursor | undefined,
    fetchSize: number,
  ): Promise<FeedCursor[]> {
    const qb = this.postRepository
      .createQueryBuilder('post')
      .where('post.status = :status', { status: TimelinePostStatus.ACTIVE })
      .andWhere('post.is_deleted = false')
      .andWhere('post.distribution_mode IN (:...modes)', {
        modes: [TimelineDistributionMode.PULL, TimelineDistributionMode.HYBRID],
      })
      .andWhere(
        `(
          post.author_id = :userId
          OR post.visibility = :publicVisibility
          OR (
            post.visibility = :friendsVisibility
            AND EXISTS (
              SELECT 1
              FROM chat_friends friend
              WHERE friend.user_id = post.author_id
                AND friend.friend_id = :userId
                AND friend.status = 'accepted'
                AND friend.is_deleted = false
            )
          )
          OR (
            post.visibility = :customVisibility
            AND post.custom_audience_ids IS NOT NULL
            AND :userId = ANY(post.custom_audience_ids)
          )
        )`,
        {
          userId,
          publicVisibility: TimelineVisibility.PUBLIC,
          friendsVisibility: TimelineVisibility.FRIENDS,
          customVisibility: TimelineVisibility.CUSTOM,
        },
      )
      .orderBy('post.published_at', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .take(fetchSize);

    if (cursor) {
      const cursorDate = new Date(Number(cursor.sortScore));
      if (!Number.isNaN(cursorDate.getTime())) {
        qb.andWhere(
          '(post.published_at < :cursorDate OR (post.published_at = :cursorDate AND post.id < :postId))',
          {
            cursorDate,
            postId: cursor.postId,
          },
        );
      }
    }

    const posts = await qb.getMany();
    return posts.map((post) => ({
      sortScore: post.publishedAt.getTime().toString(),
      postId: post.id,
    }));
  }

  private mergeFeedCandidates(
    inboxCandidates: FeedCursor[],
    pullCandidates: FeedCursor[],
  ): FeedCursor[] {
    const mergedByPostId = new Map<string, FeedCursor>();

    inboxCandidates.forEach((candidate) => this.mergeFeedCandidate(mergedByPostId, candidate));
    pullCandidates.forEach((candidate) => this.mergeFeedCandidate(mergedByPostId, candidate));

    return Array.from(mergedByPostId.values()).sort((a, b) => this.compareFeedCursorDesc(a, b));
  }

  private mergeFeedCandidate(
    mergedByPostId: Map<string, FeedCursor>,
    candidate: FeedCursor,
  ): void {
    const existing = mergedByPostId.get(candidate.postId);
    if (!existing) {
      mergedByPostId.set(candidate.postId, candidate);
      return;
    }

    if (this.compareFeedCursorDesc(candidate, existing) < 0) {
      mergedByPostId.set(candidate.postId, candidate);
    }
  }

  private async filterVisibleCandidates(
    userId: string,
    candidates: FeedCursor[],
    postMap: Map<string, TimelinePostEntity>,
    limitPlusOne: number,
  ): Promise<FeedCursor[]> {
    const friendOnlyAuthorIds = new Set<string>();
    for (const candidate of candidates) {
      const post = postMap.get(candidate.postId);
      if (!post) {
        continue;
      }
      if (post.visibility === TimelineVisibility.FRIENDS && post.authorId !== userId) {
        friendOnlyAuthorIds.add(post.authorId);
      }
    }

    const friendAuthorSet = await this.resolveFriendAuthorSet([...friendOnlyAuthorIds], userId);
    const visible: FeedCursor[] = [];

    for (const candidate of candidates) {
      const post = postMap.get(candidate.postId);
      if (!post) {
        continue;
      }
      if (!this.canViewPostWithFriendSet(userId, post, friendAuthorSet)) {
        continue;
      }
      visible.push(candidate);
      if (visible.length >= limitPlusOne) {
        break;
      }
    }

    return visible;
  }

  private compareFeedCursorDesc(a: FeedCursor, b: FeedCursor): number {
    const scoreA = this.safeBigInt(a.sortScore);
    const scoreB = this.safeBigInt(b.sortScore);
    if (scoreA !== scoreB) {
      return scoreA > scoreB ? -1 : 1;
    }

    const postA = this.safeBigInt(a.postId);
    const postB = this.safeBigInt(b.postId);
    if (postA === postB) {
      return 0;
    }
    return postA > postB ? -1 : 1;
  }

  private safeBigInt(value: string): bigint {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }

  private async fanoutPost(
    post: TimelinePostEntity,
    audienceIds: string[],
    feedRepo: Repository<TimelineFeedItemEntity>,
  ): Promise<void> {
    const uniqueAudience = [...new Set(audienceIds)];
    if (uniqueAudience.length === 0) {
      return;
    }

    const sortScore = post.publishedAt.getTime().toString();
    const feedItems = uniqueAudience.map((userId) =>
      feedRepo.create({
        userId,
        postId: post.id,
        authorId: post.authorId,
        visibility: post.visibility,
        sortScore,
        publishedAt: post.publishedAt,
        status: TimelineFeedItemStatus.ACTIVE,
      }),
    );

    for (let i = 0; i < feedItems.length; i += this.fanoutBatchSize) {
      const batch = feedItems.slice(i, i + this.fanoutBatchSize);
      await feedRepo
        .createQueryBuilder()
        .insert()
        .values(batch)
        .orIgnore()
        .execute();
    }
  }

  private async resolveAudience(
    authorId: string,
    visibility: TimelineVisibility,
    customAudienceIds: string[],
    friendRepo: Repository<Friend>,
  ): Promise<TimelineAudienceResolution> {
    if (visibility === TimelineVisibility.PRIVATE) {
      return {
        audience: [authorId],
        audienceCount: 1,
      };
    }

    if (visibility === TimelineVisibility.CUSTOM) {
      const normalizedRequested = this.normalizeUserIdList(customAudienceIds);
      const requestedWithoutAuthor = normalizedRequested.filter((userId) => userId !== authorId);
      const allowedFriends = requestedWithoutAuthor.length > 0
        ? await this.listAcceptedFriendIds(authorId, friendRepo, {
            filterUserIds: requestedWithoutAuthor,
            limit: requestedWithoutAuthor.length,
          })
        : [];
      const allowedSet = new Set(allowedFriends);
      const audience = [authorId];
      for (const userId of normalizedRequested) {
        if (userId === authorId || allowedSet.has(userId)) {
          audience.push(userId);
        }
      }
      const normalizedAudience = this.normalizeUserIdList(audience);
      return {
        audience: normalizedAudience,
        audienceCount: normalizedAudience.length,
      };
    }

    const friendCount = await friendRepo.count({
      where: {
        userId: authorId,
        status: 'accepted',
        isDeleted: false,
      },
    });
    const audienceCount = friendCount + 1;
    if (friendCount <= 0) {
      return {
        audience: [authorId],
        audienceCount,
      };
    }

    let fetchLimit: number | undefined;
    if (visibility === TimelineVisibility.PUBLIC) {
      fetchLimit = Math.max(this.hybridSeedCount - 1, 0);
    } else {
      const mode = this.resolveDistributionMode(visibility, audienceCount);
      if (mode === TimelineDistributionMode.HYBRID) {
        fetchLimit = Math.max(this.hybridSeedCount - 1, 0);
      }
    }

    if (fetchLimit === 0) {
      return {
        audience: [authorId],
        audienceCount,
      };
    }

    const friendIds = await this.listAcceptedFriendIds(authorId, friendRepo, {
      limit: fetchLimit,
    });
    return {
      audience: this.normalizeUserIdList([authorId, ...friendIds]),
      audienceCount,
    };
  }

  private normalizeCustomAudienceIds(
    authorId: string,
    visibility: TimelineVisibility,
    audience: string[],
  ): string[] | undefined {
    if (visibility !== TimelineVisibility.CUSTOM) {
      return undefined;
    }
    const normalizedAudience = [...new Set(audience.filter((userId) => userId !== authorId))];
    return normalizedAudience.length > 0 ? normalizedAudience : undefined;
  }

  private resolveDistributionMode(
    visibility: TimelineVisibility,
    audienceCount: number,
  ): TimelineDistributionMode {
    if (visibility === TimelineVisibility.PUBLIC) {
      return TimelineDistributionMode.HYBRID;
    }
    if (visibility === TimelineVisibility.PRIVATE) {
      return TimelineDistributionMode.PUSH;
    }
    if (audienceCount > this.fanoutThreshold) {
      return TimelineDistributionMode.HYBRID;
    }
    return TimelineDistributionMode.PUSH;
  }

  private resolveFanoutAudience(
    authorId: string,
    audience: string[],
    distributionMode: TimelineDistributionMode,
  ): string[] {
    const uniqueAudience = [...new Set(audience)];

    if (distributionMode === TimelineDistributionMode.PUSH) {
      return uniqueAudience;
    }

    if (distributionMode === TimelineDistributionMode.PULL) {
      return [authorId];
    }

    const others = uniqueAudience.filter((userId) => userId !== authorId);
    const seedCount = Math.max(this.hybridSeedCount - 1, 0);
    return [authorId, ...others.slice(0, seedCount)];
  }

  private normalizeUserIdList(userIds: string[]): string[] {
    const normalized = new Set<string>();
    for (const userId of userIds) {
      if (typeof userId !== 'string') {
        continue;
      }
      const value = userId.trim();
      if (value.length > 0) {
        normalized.add(value);
      }
    }
    return [...normalized];
  }

  private async listAcceptedFriendIds(
    authorId: string,
    friendRepo: Repository<Friend>,
    options?: {
      filterUserIds?: string[];
      limit?: number;
    },
  ): Promise<string[]> {
    const where: {
      userId: string;
      status: 'accepted';
      isDeleted: false;
      friendId?: ReturnType<typeof In>;
    } = {
      userId: authorId,
      status: 'accepted',
      isDeleted: false,
    };
    const normalizedFilter = this.normalizeUserIdList(options?.filterUserIds || []);
    if (normalizedFilter.length > 0) {
      where.friendId = In(normalizedFilter);
    }

    const take = options?.limit && Number.isFinite(options.limit)
      ? Math.max(1, Math.floor(options.limit))
      : undefined;
    const rows = await friendRepo.find({
      where,
      select: ['friendId'],
      order: { friendId: 'ASC' },
      ...(take ? { take } : {}),
    });
    return this.normalizeUserIdList(rows.map((item) => item.friendId));
  }

  private async resolveFriendAuthorSet(authorIds: string[], viewerId: string): Promise<Set<string>> {
    if (authorIds.length === 0) {
      return new Set<string>();
    }

    const relations = await this.friendRepository.find({
      where: {
        userId: In(authorIds),
        friendId: viewerId,
        status: 'accepted',
        isDeleted: false,
      },
      select: ['userId'],
    });
    return new Set(relations.map((item) => item.userId));
  }

  private canViewPostWithFriendSet(
    viewerId: string,
    post: Pick<TimelinePostEntity, 'authorId' | 'visibility' | 'customAudienceIds'>,
    friendAuthorSet: Set<string>,
  ): boolean {
    if (viewerId === post.authorId) {
      return true;
    }
    if (post.visibility === TimelineVisibility.PUBLIC) {
      return true;
    }
    if (post.visibility === TimelineVisibility.PRIVATE) {
      return false;
    }
    if (post.visibility === TimelineVisibility.CUSTOM) {
      return (post.customAudienceIds || []).includes(viewerId);
    }
    return friendAuthorSet.has(post.authorId);
  }

  private async canViewPost(viewerId: string, post: TimelinePostEntity): Promise<boolean> {
    const friendAuthorSet = post.visibility === TimelineVisibility.FRIENDS && viewerId !== post.authorId
      ? await this.resolveFriendAuthorSet([post.authorId], viewerId)
      : new Set<string>();
    return this.canViewPostWithFriendSet(viewerId, post, friendAuthorSet);
  }

  private async isFriend(authorId: string, viewerId: string): Promise<boolean> {
    const relation = await this.friendRepository.findOne({
      where: {
        userId: authorId,
        friendId: viewerId,
        status: 'accepted',
        isDeleted: false,
      },
      select: ['id'],
    });
    return !!relation;
  }

  private async acquireLikeLock(manager: EntityManager, postId: string, userId: string): Promise<void> {
    if (this.dataSource.options?.type !== 'postgres') {
      return;
    }
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));',
      [postId, userId],
    );
  }

  private toPostView(post: TimelinePostEntity, likedByMe: boolean): TimelinePostView {
    return {
      id: post.id,
      authorId: post.authorId,
      visibility: post.visibility,
      distributionMode: post.distributionMode,
      text: post.text,
      media: post.media,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      publishedAt: post.publishedAt,
      likedByMe,
      extra: post.extra,
    };
  }

  private encodeCursor(cursor: FeedCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(raw?: string): FeedCursor | undefined {
    if (!raw) {
      return undefined;
    }

    try {
      const normalized = raw.trim();
      if (normalized.length === 0 || normalized.length > 2048) {
        this.logger.warn(`Invalid feed cursor length: ${normalized.length}`);
        return undefined;
      }
      const legacyBase64 = normalized
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = JSON.parse(Buffer.from(legacyBase64, 'base64').toString('utf8')) as FeedCursor;
      if (
        !decoded.sortScore ||
        !decoded.postId ||
        !/^\d+$/.test(decoded.sortScore) ||
        !/^\d+$/.test(decoded.postId)
      ) {
        return undefined;
      }
      return decoded;
    } catch {
      this.logger.warn(`Invalid feed cursor format (len=${raw.length})`);
      return undefined;
    }
  }

  private logFeedProfile(payload: {
    userId: string;
    limit: number;
    sourceFetchSize: number;
    cursorProvided: boolean;
    durationMs: number;
    result: TimelineFeedPage;
    collectionProfile: FeedCollectionProfile;
  }): void {
    if (!this.feedProfilingEnabled) {
      return;
    }
    if (!this.shouldLogFeedProfile()) {
      return;
    }
    const message = {
      userId: payload.userId,
      limit: payload.limit,
      sourceFetchSize: payload.sourceFetchSize,
      cursorProvided: payload.cursorProvided,
      durationMs: payload.durationMs,
      returnedItems: payload.result.items.length,
      hasNextCursor: !!payload.result.nextCursor,
      roundsExecuted: payload.collectionProfile.roundsExecuted,
      mergedCandidates: payload.collectionProfile.mergedCandidates,
      visibleCandidates: payload.collectionProfile.visibleCandidates,
      postMapSize: payload.collectionProfile.postMapSize,
      fullyScanned: payload.collectionProfile.fullyScanned,
      rounds: payload.collectionProfile.rounds,
    };
    this.logger.debug(`timeline feed profile ${JSON.stringify(message)}`);
  }

  private shouldLogFeedProfile(): boolean {
    if (this.feedProfilingSampleRate <= 0) {
      return false;
    }
    if (this.feedProfilingSampleRate >= 1) {
      return true;
    }
    return Math.random() < this.feedProfilingSampleRate;
  }

  private readNumberConfig(
    key: string,
    fallback: number,
    minValue: number,
    maxValue: number,
  ): number {
    const rawValue = this.configService.get<string | number>(key);
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    if (parsed < minValue) {
      return minValue;
    }
    if (parsed > maxValue) {
      return maxValue;
    }
    return Math.floor(parsed);
  }

  private readBooleanConfig(key: string, fallback: boolean): boolean {
    const rawValue = this.configService.get<string | boolean | number>(key);
    if (typeof rawValue === 'boolean') {
      return rawValue;
    }
    if (typeof rawValue === 'number') {
      return rawValue !== 0;
    }
    if (typeof rawValue === 'string') {
      const normalized = rawValue.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }
    return fallback;
  }

  private readRatioConfig(key: string, fallback: number): number {
    const rawValue = this.configService.get<string | number>(key);
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, fallback));
    }
    return Math.max(0, Math.min(1, parsed));
  }
}
