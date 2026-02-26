import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  ConversationQueryParams,
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

    const updatedConversation = await this.repository.save(conversation);
    return this.mapToConversation(updatedConversation);
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.repository.update(id, { isDeleted: true });
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

  async pinConversation(id: string, isPinned: boolean): Promise<boolean> {
    const result = await this.repository.update(id, { isPinned });
    return (result.affected || 0) > 0;
  }

  async muteConversation(id: string, isMuted: boolean): Promise<boolean> {
    const result = await this.repository.update(id, { isMuted });
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
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
