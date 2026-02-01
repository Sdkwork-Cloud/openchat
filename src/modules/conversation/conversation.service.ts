import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  ConversationQueryParams,
  ConversationManager,
  ConversationType,
} from './conversation.interface';

@Injectable()
export class ConversationService implements ConversationManager {
  constructor(
    @InjectRepository(ConversationEntity)
    private conversationRepository: Repository<ConversationEntity>,
  ) {}

  /**
   * 创建会话
   */
  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    // 检查是否已存在相同会话
    const existingConversation = await this.getConversationByTarget(
      request.userId,
      request.targetId,
      request.type,
    );

    if (existingConversation) {
      throw new ConflictException('会话已存在');
    }

    const conversation = this.conversationRepository.create({
      type: request.type,
      userId: request.userId,
      targetId: request.targetId,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
    });

    const savedConversation = await this.conversationRepository.save(conversation);
    return this.mapToConversation(savedConversation);
  }

  /**
   * 获取会话详情
   */
  async getConversationById(id: string): Promise<Conversation | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
    });

    if (!conversation) {
      return null;
    }

    return this.mapToConversation(conversation);
  }

  /**
   * 获取用户的会话列表
   */
  async getConversationsByUserId(params: ConversationQueryParams): Promise<Conversation[]> {
    const { userId, type, isPinned, limit = 50, offset = 0 } = params;

    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (isPinned !== undefined) {
      where.isPinned = isPinned;
    }

    const conversations = await this.conversationRepository.find({
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

  /**
   * 获取用户与特定目标的会话
   */
  async getConversationByTarget(
    userId: string,
    targetId: string,
    type: ConversationType,
  ): Promise<Conversation | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { userId, targetId, type },
    });

    if (!conversation) {
      return null;
    }

    return this.mapToConversation(conversation);
  }

  /**
   * 更新会话
   */
  async updateConversation(
    id: string,
    request: UpdateConversationRequest,
  ): Promise<Conversation | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
    });

    if (!conversation) {
      return null;
    }

    if (request.isPinned !== undefined) {
      conversation.isPinned = request.isPinned;
    }

    if (request.isMuted !== undefined) {
      conversation.isMuted = request.isMuted;
    }

    const updatedConversation = await this.conversationRepository.save(conversation);
    return this.mapToConversation(updatedConversation);
  }

  /**
   * 删除会话
   */
  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.conversationRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * 更新会话最后消息
   */
  async updateLastMessage(
    conversationId: string,
    messageId: string,
    content: string,
    messageTime: Date,
  ): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      return false;
    }

    conversation.lastMessageId = messageId;
    conversation.lastMessageContent = content;
    conversation.lastMessageTime = messageTime;

    await this.conversationRepository.save(conversation);
    return true;
  }

  /**
   * 增加未读消息数
   */
  async incrementUnreadCount(conversationId: string): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      return false;
    }

    conversation.unreadCount += 1;
    await this.conversationRepository.save(conversation);
    return true;
  }

  /**
   * 清空未读消息数
   */
  async clearUnreadCount(conversationId: string): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      return false;
    }

    conversation.unreadCount = 0;
    await this.conversationRepository.save(conversation);
    return true;
  }

  /**
   * 置顶/取消置顶会话
   */
  async pinConversation(id: string, isPinned: boolean): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
    });

    if (!conversation) {
      return false;
    }

    conversation.isPinned = isPinned;
    await this.conversationRepository.save(conversation);
    return true;
  }

  /**
   * 设置免打扰
   */
  async muteConversation(id: string, isMuted: boolean): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
    });

    if (!conversation) {
      return false;
    }

    conversation.isMuted = isMuted;
    await this.conversationRepository.save(conversation);
    return true;
  }

  /**
   * 映射实体到接口
   */
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
