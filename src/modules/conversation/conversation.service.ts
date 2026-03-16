import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import { ConversationReadCursorEntity } from './conversation-read-cursor.entity';
import {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  ConversationQueryParams,
  ConversationSyncTarget,
  ConversationSyncStateBatchResult,
  ConversationSyncState,
  ConversationSyncStateOptions,
  DeviceReadCursorSummaryResult,
  ConversationManager,
  ConversationType,
} from './conversation.interface';
import { BaseEntityService } from '../../common/base/entity.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class ConversationService extends BaseEntityService<ConversationEntity> implements ConversationManager {
  protected readonly logger = new Logger(ConversationService.name);
  protected readonly entityName = 'Conversation';

  constructor(
    protected readonly dataSource: DataSource,
    @InjectRepository(ConversationEntity)
    protected readonly repository: Repository<ConversationEntity>,
    @InjectRepository(ConversationReadCursorEntity)
    private readonly readCursorRepository: Repository<ConversationReadCursorEntity>,
    eventBus: EventBusService,
    cacheService: CacheService,
  ) {
    super(dataSource, repository, eventBus, cacheService);
  }

  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    const existingConversation = await this.getConversationByTarget(
      request.userId,
      request.targetId,
      request.type,
    );

    if (existingConversation) {
      throw new ConflictException('会话已存在');
    }

    const conversation = this.repository.create({
      type: request.type,
      userId: request.userId,
      targetId: request.targetId,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
    });

    const savedConversation = await this.repository.save(conversation);
    return this.mapToConversation(savedConversation);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const conversation = await this.findOne(id);
    return conversation ? this.mapToConversation(conversation) : null;
  }

  async getConversationByIdForUser(id: string, userId: string): Promise<Conversation | null> {
    const conversation = await this.repository.findOne({
      where: { id, userId, isDeleted: false },
    });
    return conversation ? this.mapToConversation(conversation) : null;
  }

  async getConversationsByUserId(params: ConversationQueryParams): Promise<Conversation[]> {
    const { userId, type, isPinned, limit = 50, offset = 0 } = params;

    const where: any = { userId, isDeleted: false };

    if (type) where.type = type;
    if (isPinned !== undefined) where.isPinned = isPinned;

    const conversations = await this.repository.find({
      where,
      order: {
        isPinned: 'DESC',
        lastMessageTime: 'DESC',
        updatedAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    return conversations.map((conversation) => this.mapToConversation(conversation));
  }

  async getConversationByTarget(
    userId: string,
    targetId: string,
    type: ConversationType,
  ): Promise<Conversation | null> {
    const conversation = await this.repository.findOne({
      where: { userId, targetId, type, isDeleted: false },
    });

    return conversation ? this.mapToConversation(conversation) : null;
  }

  async updateConversation(
    id: string,
    request: UpdateConversationRequest,
  ): Promise<Conversation | null> {
    const conversation = await this.findOne(id);
    if (!conversation) return null;

    if (request.isPinned !== undefined) conversation.isPinned = request.isPinned;
    if (request.isMuted !== undefined) conversation.isMuted = request.isMuted;
    this.applyConversationDraftUpdate(conversation, request);

    const updatedConversation = await this.repository.save(conversation);
    return this.mapToConversation(updatedConversation);
  }

  async updateConversationForUser(
    id: string,
    userId: string,
    request: UpdateConversationRequest,
  ): Promise<Conversation | null> {
    const conversation = await this.repository.findOne({
      where: { id, userId, isDeleted: false },
    });
    if (!conversation) return null;

    if (request.isPinned !== undefined) conversation.isPinned = request.isPinned;
    if (request.isMuted !== undefined) conversation.isMuted = request.isMuted;
    this.applyConversationDraftUpdate(conversation, request);

    const updatedConversation = await this.repository.save(conversation);
    return this.mapToConversation(updatedConversation);
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.repository.update(id, { isDeleted: true });
    return (result.affected || 0) > 0;
  }

  async deleteConversationForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, userId, isDeleted: false },
      { isDeleted: true },
    );
    return (result.affected || 0) > 0;
  }

  async updateLastMessage(
    conversationId: string,
    messageId: string,
    content: string,
    messageTime: Date,
  ): Promise<boolean> {
    const result = await this.repository.update(conversationId, {
      lastMessageId: messageId,
      lastMessageContent: content,
      lastMessageTime: messageTime,
    });

    return (result.affected || 0) > 0;
  }

  async incrementUnreadCount(conversationId: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(ConversationEntity)
      .set({
        unreadCount: () => 'unread_count + 1',
      })
      .where('id = :id', { id: conversationId })
      .execute();

    return (result.affected || 0) > 0;
  }

  async clearUnreadCount(conversationId: string): Promise<boolean> {
    const result = await this.repository.update(conversationId, { unreadCount: 0 });
    return (result.affected || 0) > 0;
  }

  async setUnreadCount(conversationId: string, count: number): Promise<boolean> {
    if (!Number.isFinite(count) || count < 0) {
      return false;
    }

    const normalizedCount = Math.floor(count);
    const result = await this.repository.update(
      { id: conversationId, isDeleted: false },
      { unreadCount: normalizedCount },
    );
    return (result.affected || 0) > 0;
  }

  async getUnreadCountsByConversationIds(conversationIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const uniqueIds = [...new Set(conversationIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return result;
    }

    const conversations = await this.repository.find({
      where: { id: In(uniqueIds), isDeleted: false },
      select: ['id', 'unreadCount'],
    });
    conversations.forEach((conversation) => {
      result.set(conversation.id, conversation.unreadCount || 0);
    });

    return result;
  }

  async clearUnreadCountForUser(conversationId: string, userId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id: conversationId, userId, isDeleted: false },
      { unreadCount: 0 },
    );
    return (result.affected || 0) > 0;
  }

  async pinConversation(id: string, isPinned: boolean): Promise<boolean> {
    const result = await this.repository.update(id, { isPinned });
    return (result.affected || 0) > 0;
  }

  async pinConversationForUser(id: string, userId: string, isPinned: boolean): Promise<boolean> {
    const result = await this.repository.update(
      { id, userId, isDeleted: false },
      { isPinned },
    );
    return (result.affected || 0) > 0;
  }

  async muteConversation(id: string, isMuted: boolean): Promise<boolean> {
    const result = await this.repository.update(id, { isMuted });
    return (result.affected || 0) > 0;
  }

  async muteConversationForUser(id: string, userId: string, isMuted: boolean): Promise<boolean> {
    const result = await this.repository.update(
      { id, userId, isDeleted: false },
      { isMuted },
    );
    return (result.affected || 0) > 0;
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('conversation')
      .select('SUM(conversation.unreadCount)', 'total')
      .where('conversation.userId = :userId', { userId })
      .andWhere('conversation.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    const total = parseInt(result?.total || '0', 10);
    return isNaN(total) ? 0 : total;
  }

  async batchDeleteConversationsForUser(ids: string[], userId: string): Promise<number> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return 0;
    }

    const result = await this.repository.update(
      { id: In(uniqueIds), userId, isDeleted: false },
      { isDeleted: true },
    );
    return result.affected || 0;
  }

  async advanceLastReadSeq(
    userId: string,
    targetId: string,
    type: ConversationType,
    seq: number,
  ): Promise<boolean> {
    if (!userId || !targetId || !Number.isFinite(seq) || seq <= 0) {
      return false;
    }

    // 原子条件更新，防止并发请求导致 lastReadSeq 回退
    const updateResult = await this.repository
      .createQueryBuilder()
      .update(ConversationEntity)
      .set({ lastReadSeq: seq })
      .where('user_id = :userId', { userId })
      .andWhere('target_id = :targetId', { targetId })
      .andWhere('type = :type', { type })
      .andWhere('is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('(last_read_seq IS NULL OR last_read_seq < :seq)', { seq })
      .execute();

    if ((updateResult.affected || 0) > 0) {
      return true;
    }

    const existingConversation = await this.repository.findOne({
      where: {
        userId,
        targetId,
        type,
        isDeleted: false,
      },
      select: ['id'],
    });

    return !!existingConversation;
  }

  async advanceDeviceLastReadSeq(
    userId: string,
    deviceId: string,
    targetId: string,
    type: ConversationType,
    seq: number,
  ): Promise<boolean> {
    const normalizedDeviceId = this.normalizeDeviceId(deviceId);
    if (!userId || !normalizedDeviceId || !targetId || !Number.isFinite(seq) || seq <= 0) {
      return false;
    }

    const conversation = await this.repository.findOne({
      where: {
        userId,
        targetId,
        type,
        isDeleted: false,
      },
      select: ['id'],
    });
    if (!conversation) {
      return false;
    }

    const updateResult = await this.readCursorRepository
      .createQueryBuilder()
      .update(ConversationReadCursorEntity)
      .set({ lastReadSeq: seq })
      .where('user_id = :userId', { userId })
      .andWhere('device_id = :deviceId', { deviceId: normalizedDeviceId })
      .andWhere('target_id = :targetId', { targetId })
      .andWhere('type = :type', { type })
      .andWhere('is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('(last_read_seq IS NULL OR last_read_seq < :seq)', { seq })
      .execute();

    if ((updateResult.affected || 0) > 0) {
      return true;
    }

    const existingCursor = await this.readCursorRepository.findOne({
      where: {
        userId,
        deviceId: normalizedDeviceId,
        targetId,
        type,
        isDeleted: false,
      },
      select: ['id'],
    });
    if (existingCursor) {
      return true;
    }

    try {
      const cursor = this.readCursorRepository.create({
        userId,
        deviceId: normalizedDeviceId,
        targetId,
        type,
        lastReadSeq: seq,
      });
      await this.readCursorRepository.save(cursor);
      return true;
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        this.logger.error(
          `Failed to create conversation read cursor for user ${userId}, device ${normalizedDeviceId}`,
          error as Error,
        );
        return false;
      }
    }

    const racedUpdateResult = await this.readCursorRepository
      .createQueryBuilder()
      .update(ConversationReadCursorEntity)
      .set({ lastReadSeq: seq })
      .where('user_id = :userId', { userId })
      .andWhere('device_id = :deviceId', { deviceId: normalizedDeviceId })
      .andWhere('target_id = :targetId', { targetId })
      .andWhere('type = :type', { type })
      .andWhere('is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('(last_read_seq IS NULL OR last_read_seq < :seq)', { seq })
      .execute();

    if ((racedUpdateResult.affected || 0) > 0) {
      return true;
    }

    const cursorAfterRace = await this.readCursorRepository.findOne({
      where: {
        userId,
        deviceId: normalizedDeviceId,
        targetId,
        type,
        isDeleted: false,
      },
      select: ['id'],
    });
    return !!cursorAfterRace;
  }

  async deleteDeviceReadCursorsForUser(userId: string, deviceId: string): Promise<number> {
    const normalizedDeviceId = this.normalizeDeviceId(deviceId);
    if (!userId || !normalizedDeviceId) {
      return 0;
    }

    const result = await this.readCursorRepository.update(
      { userId, deviceId: normalizedDeviceId, isDeleted: false },
      { isDeleted: true },
    );
    return result.affected || 0;
  }

  async deleteDeviceReadCursorsForUserExcept(
    userId: string,
    keepDeviceId: string,
  ): Promise<number> {
    const normalizedKeepDeviceId = this.normalizeDeviceId(keepDeviceId);
    if (!userId || !normalizedKeepDeviceId) {
      return 0;
    }

    const result = await this.readCursorRepository
      .createQueryBuilder()
      .update(ConversationReadCursorEntity)
      .set({ isDeleted: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('device_id != :keepDeviceId', { keepDeviceId: normalizedKeepDeviceId })
      .execute();
    return result.affected || 0;
  }

  async getDeviceReadCursorSummariesForUser(
    userId: string,
    limit: number = 100,
  ): Promise<DeviceReadCursorSummaryResult> {
    if (!userId) {
      return { total: 0, items: [] };
    }

    const safeLimit = this.normalizeLimit(limit, 100, 1, 200);
    const baseQuery = this.readCursorRepository
      .createQueryBuilder('cursor')
      .where('cursor.userId = :userId', { userId })
      .andWhere('cursor.isDeleted = false');

    const totalRaw = await baseQuery
      .clone()
      .select('COUNT(DISTINCT cursor.deviceId)', 'total')
      .getRawOne<{ total?: string | number }>();

    const rows = await baseQuery
      .clone()
      .select('cursor.deviceId', 'deviceId')
      .addSelect('COUNT(*)', 'conversationCount')
      .addSelect('MAX(cursor.updatedAt)', 'lastActiveAt')
      .groupBy('cursor.deviceId')
      .orderBy('MAX(cursor.updatedAt)', 'DESC')
      .limit(safeLimit)
      .getRawMany<{
        deviceId: string;
        conversationCount?: string | number;
        lastActiveAt?: string | Date;
      }>();

    const items = rows
      .filter((row) => row.deviceId)
      .map((row) => ({
        deviceId: row.deviceId,
        conversationCount: Number.parseInt(String(row.conversationCount || 0), 10) || 0,
        lastActiveAt:
          row.lastActiveAt instanceof Date
            ? row.lastActiveAt.toISOString()
            : row.lastActiveAt
              ? new Date(row.lastActiveAt).toISOString()
              : new Date(0).toISOString(),
      }));

    return {
      total: Number.parseInt(String(totalRaw?.total || 0), 10) || 0,
      items,
    };
  }

  async deleteStaleDeviceReadCursorsForUser(
    userId: string,
    inactiveDays: number = 90,
  ): Promise<number> {
    if (!userId) {
      return 0;
    }

    const safeDays = Number.isFinite(inactiveDays)
      ? Math.min(Math.max(Math.floor(inactiveDays), 1), 3650)
      : 90;
    const cutoffTime = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const result = await this.readCursorRepository
      .createQueryBuilder()
      .update(ConversationReadCursorEntity)
      .set({ isDeleted: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_deleted = :isDeleted', { isDeleted: false })
      .andWhere('updated_at < :cutoffTime', { cutoffTime })
      .execute();

    return result.affected || 0;
  }

  async getConversationSyncStateForUser(
    userId: string,
    targetId: string,
    type: ConversationType,
    options?: ConversationSyncStateOptions,
  ): Promise<ConversationSyncState | null> {
    const conversation = await this.repository.findOne({
      where: {
        userId,
        targetId,
        type,
        isDeleted: false,
      },
    });
    if (!conversation) {
      return null;
    }

    const queryBuilder = this.repository.manager
      .createQueryBuilder()
      .from('chat_messages', 'message')
      .select('MAX(message.seq)', 'maxSeq')
      .where('message.is_deleted = false')
      .andWhere('message.seq IS NOT NULL');

    if (type === 'single') {
      queryBuilder.andWhere(
        '((message.from_user_id = :userId AND message.to_user_id = :targetId) OR (message.from_user_id = :targetId AND message.to_user_id = :userId))',
        { userId, targetId },
      );
    } else {
      queryBuilder.andWhere('message.group_id = :targetId', { targetId });
    }

    const raw = await queryBuilder.getRawOne<{ maxSeq?: string | number }>();

    const maxSeq = this.normalizeSequence(raw?.maxSeq);
    const userLastReadSeq = this.normalizeSequence(conversation.lastReadSeq);
    const normalizedDeviceId = this.normalizeDeviceId(options?.deviceId);

    let deviceLastReadSeq: number | undefined;
    let effectiveLastReadSeq = userLastReadSeq;
    if (normalizedDeviceId) {
      const cursor = await this.readCursorRepository.findOne({
        where: {
          userId,
          deviceId: normalizedDeviceId,
          targetId,
          type,
          isDeleted: false,
        },
        select: ['lastReadSeq'],
      });

      if (cursor) {
        deviceLastReadSeq = this.normalizeSequence(cursor.lastReadSeq);
        effectiveLastReadSeq = deviceLastReadSeq;
      }
    }

    const pendingSeq = Math.max(maxSeq - effectiveLastReadSeq, 0);

    return {
      targetId,
      type,
      unreadCount: conversation.unreadCount || 0,
      lastReadSeq: effectiveLastReadSeq,
      userLastReadSeq,
      ...(normalizedDeviceId ? { deviceId: normalizedDeviceId } : {}),
      ...(normalizedDeviceId && deviceLastReadSeq !== undefined ? { deviceLastReadSeq } : {}),
      syncScope: normalizedDeviceId ? 'device' : 'user',
      maxSeq,
      pendingSeq,
      isCaughtUp: pendingSeq === 0,
      serverTime: new Date().toISOString(),
    };
  }

  async getConversationSyncStatesForUser(
    userId: string,
    targets: ConversationSyncTarget[],
    options?: ConversationSyncStateOptions,
  ): Promise<ConversationSyncStateBatchResult> {
    const normalizedTargets = this.normalizeSyncTargets(targets);
    if (normalizedTargets.length === 0) {
      return {
        total: 0,
        found: 0,
        missing: [],
        items: [],
      };
    }

    const singleTargets = normalizedTargets
      .filter((target) => target.type === 'single')
      .map((target) => target.targetId);
    const groupTargets = normalizedTargets
      .filter((target) => target.type === 'group')
      .map((target) => target.targetId);

    const conversationsQuery = this.repository
      .createQueryBuilder('conversation')
      .where('conversation.userId = :userId', { userId })
      .andWhere('conversation.isDeleted = false')
      .andWhere(
        new Brackets((queryBuilder) => {
          if (singleTargets.length > 0) {
            queryBuilder.orWhere(
              '(conversation.type = :singleType AND conversation.targetId IN (:...singleTargets))',
              { singleType: 'single', singleTargets },
            );
          }
          if (groupTargets.length > 0) {
            queryBuilder.orWhere(
              '(conversation.type = :groupType AND conversation.targetId IN (:...groupTargets))',
              { groupType: 'group', groupTargets },
            );
          }
        }),
      );

    const conversations = await conversationsQuery.getMany();
    const conversationMap = new Map(
      conversations.map((conversation) => [
        this.getConversationStateKey(conversation.type, conversation.targetId),
        conversation,
      ]),
    );

    const seqMap = new Map<string, number>();

    if (groupTargets.length > 0) {
      const groupSeqRows = await this.repository.manager
        .createQueryBuilder()
        .from('chat_messages', 'message')
        .select('message.group_id', 'targetId')
        .addSelect('MAX(message.seq)', 'maxSeq')
        .where('message.is_deleted = false')
        .andWhere('message.seq IS NOT NULL')
        .andWhere('message.group_id IN (:...groupTargets)', { groupTargets })
        .groupBy('message.group_id')
        .getRawMany<{ targetId: string; maxSeq?: string | number }>();

      groupSeqRows.forEach((row) => {
        seqMap.set(
          this.getConversationStateKey('group', row.targetId),
          this.normalizeSequence(row.maxSeq),
        );
      });
    }

    if (singleTargets.length > 0) {
      const singleSeqRows = await this.repository.manager
        .createQueryBuilder()
        .from('chat_messages', 'message')
        .select(
          'CASE WHEN message.from_user_id = :userId THEN message.to_user_id ELSE message.from_user_id END',
          'targetId',
        )
        .addSelect('MAX(message.seq)', 'maxSeq')
        .where('message.is_deleted = false')
        .andWhere('message.seq IS NOT NULL')
        .andWhere(
          '((message.from_user_id = :userId AND message.to_user_id IN (:...singleTargets)) OR (message.to_user_id = :userId AND message.from_user_id IN (:...singleTargets)))',
          { userId, singleTargets },
        )
        .groupBy(
          'CASE WHEN message.from_user_id = :userId THEN message.to_user_id ELSE message.from_user_id END',
        )
        .setParameter('userId', userId)
        .getRawMany<{ targetId: string; maxSeq?: string | number }>();

      singleSeqRows.forEach((row) => {
        seqMap.set(
          this.getConversationStateKey('single', row.targetId),
          this.normalizeSequence(row.maxSeq),
        );
      });
    }

    const normalizedDeviceId = this.normalizeDeviceId(options?.deviceId);
    const deviceCursorMap = new Map<string, number>();

    if (normalizedDeviceId) {
      const deviceCursorQuery = this.readCursorRepository
        .createQueryBuilder('cursor')
        .where('cursor.userId = :userId', { userId })
        .andWhere('cursor.deviceId = :deviceId', { deviceId: normalizedDeviceId })
        .andWhere('cursor.isDeleted = false')
        .andWhere(
          new Brackets((queryBuilder) => {
            if (singleTargets.length > 0) {
              queryBuilder.orWhere(
                '(cursor.type = :singleType AND cursor.targetId IN (:...singleTargets))',
                { singleType: 'single', singleTargets },
              );
            }

            if (groupTargets.length > 0) {
              queryBuilder.orWhere(
                '(cursor.type = :groupType AND cursor.targetId IN (:...groupTargets))',
                { groupType: 'group', groupTargets },
              );
            }
          }),
        );

      const cursorRows = await deviceCursorQuery.getMany();
      cursorRows.forEach((cursor) => {
        const key = this.getConversationStateKey(cursor.type, cursor.targetId);
        deviceCursorMap.set(key, this.normalizeSequence(cursor.lastReadSeq));
      });
    }

    const serverTime = new Date().toISOString();
    const missing: ConversationSyncTarget[] = [];
    const items: ConversationSyncState[] = [];

    normalizedTargets.forEach((target) => {
      const key = this.getConversationStateKey(target.type, target.targetId);
      const conversation = conversationMap.get(key);
      if (!conversation) {
        missing.push(target);
        return;
      }

      const maxSeq = seqMap.get(key) || 0;
      const userLastReadSeq = this.normalizeSequence(conversation.lastReadSeq);
      const deviceLastReadSeq = normalizedDeviceId ? deviceCursorMap.get(key) : undefined;
      const effectiveLastReadSeq = deviceLastReadSeq !== undefined ? deviceLastReadSeq : userLastReadSeq;
      const pendingSeq = Math.max(maxSeq - effectiveLastReadSeq, 0);

      items.push({
        targetId: target.targetId,
        type: target.type,
        unreadCount: conversation.unreadCount || 0,
        lastReadSeq: effectiveLastReadSeq,
        userLastReadSeq,
        ...(normalizedDeviceId ? { deviceId: normalizedDeviceId } : {}),
        ...(normalizedDeviceId && deviceLastReadSeq !== undefined ? { deviceLastReadSeq } : {}),
        syncScope: normalizedDeviceId ? 'device' : 'user',
        maxSeq,
        pendingSeq,
        isCaughtUp: pendingSeq === 0,
        serverTime,
      });
    });

    return {
      total: normalizedTargets.length,
      found: items.length,
      missing,
      items,
    };
  }

  private normalizeSequence(seq?: number | string | null): number {
    if (seq === null || seq === undefined) {
      return 0;
    }

    const normalized = typeof seq === 'string' ? parseInt(seq, 10) : Number(seq);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return 0;
    }

    return Math.floor(normalized);
  }

  private normalizeDeviceId(deviceId?: string | null): string | null {
    if (!deviceId || typeof deviceId !== 'string') {
      return null;
    }

    const normalized = deviceId.trim();
    if (!normalized) {
      return null;
    }

    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private normalizeLimit(
    value: number,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const numericValue = Number(value);
    const resolved = Number.isFinite(numericValue) ? Math.floor(numericValue) : fallback;
    return Math.min(Math.max(resolved, min), max);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as { code?: string; message?: string };
    if (maybeError.code === '23505') {
      return true;
    }

    if (typeof maybeError.message === 'string' && maybeError.message.includes('duplicate key')) {
      return true;
    }

    return false;
  }

  private normalizeSyncTargets(targets: ConversationSyncTarget[]): ConversationSyncTarget[] {
    if (!Array.isArray(targets) || targets.length === 0) {
      return [];
    }

    const deduplicated = new Map<string, ConversationSyncTarget>();
    targets.forEach((target) => {
      if (!target || !target.targetId || (target.type !== 'single' && target.type !== 'group')) {
        return;
      }

      const normalized: ConversationSyncTarget = {
        targetId: target.targetId.trim(),
        type: target.type,
      };
      if (!normalized.targetId) {
        return;
      }

      deduplicated.set(
        this.getConversationStateKey(normalized.type, normalized.targetId),
        normalized,
      );
    });

    return [...deduplicated.values()].slice(0, 200);
  }

  private getConversationStateKey(type: ConversationType, targetId: string): string {
    return `${type}:${targetId}`;
  }

  private applyConversationDraftUpdate(
    conversation: ConversationEntity,
    request: UpdateConversationRequest,
  ): void {
    if (!Object.prototype.hasOwnProperty.call(request, 'draft')) {
      return;
    }

    const normalizedDraft = typeof request.draft === 'string'
      ? request.draft.trim()
      : '';

    if (normalizedDraft) {
      conversation.draft = normalizedDraft;
      conversation.draftUpdatedAt = new Date();
      return;
    }

    conversation.draft = null as unknown as string;
    conversation.draftUpdatedAt = null as unknown as Date;
  }

  private mapToConversation(entity: ConversationEntity): Conversation {
    return {
      id: entity.id,
      uuid: entity.uuid,
      type: entity.type,
      userId: entity.userId,
      targetId: entity.targetId,
      targetName: entity.targetName,
      targetAvatar: entity.targetAvatar,
      lastMessageId: entity.lastMessageId,
      lastMessageContent: entity.lastMessageContent,
      lastMessageTime: entity.lastMessageTime,
      unreadCount: entity.unreadCount,
      isPinned: entity.isPinned,
      isMuted: entity.isMuted,
      draft: entity.draft || undefined,
      draftUpdatedAt: entity.draftUpdatedAt,
      lastReadSeq: entity.lastReadSeq,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
