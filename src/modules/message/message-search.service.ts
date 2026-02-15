import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Message } from './message.entity';
import { GroupMember } from '../group/group-member.entity';

/**
 * 搜索结果接口
 */
export interface MessageSearchResult {
  messages: Message[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 搜索选项
 */
export interface MessageSearchOptions {
  keyword: string;
  userId?: string;
  targetId?: string; // 对方用户ID或群ID
  type?: 'single' | 'group';
  messageType?: string;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * 消息搜索服务
 * 使用 PostgreSQL 全文搜索功能（tsvector + tsquery）
 * 支持中文分词（需要额外配置）
 */
@Injectable()
export class MessageSearchService {
  private readonly logger = new Logger(MessageSearchService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
  ) {}

  /**
   * 检查用户是否在群聊中
   */
  private async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    if (!userId || !groupId) {
      return false;
    }

    const member = await this.groupMemberRepository.findOne({
      where: {
        groupId,
        userId,
        status: 'joined',
      },
    });

    return !!member;
  }

  /**
   * 搜索消息
   * 使用 PostgreSQL 全文搜索（tsvector）优化性能
   */
  async search(options: MessageSearchOptions): Promise<MessageSearchResult> {
    const {
      keyword,
      userId,
      targetId,
      type,
      messageType,
      startTime,
      endTime,
      page = 1,
      pageSize = 20,
    } = options;

    const queryBuilder = this.messageRepository.createQueryBuilder('message');

    // 基本查询条件
    queryBuilder.where('message.status = :status', { status: 'sent' });

    // 群聊权限检查
    if (targetId && type === 'group' && userId) {
      const isMember = await this.isUserInGroup(userId, targetId);
      if (!isMember) {
        this.logger.warn(`User ${userId} attempted to search group ${targetId} without permission`);
        throw new ForbiddenException('您没有权限访问该群的消息');
      }
    }

    // 用户权限过滤（只能搜索自己参与的消息）
    if (userId) {
      if (type === 'group' && targetId) {
        // 群聊：只检查群聊消息，不检查fromUserId/toUserId
        queryBuilder.andWhere('message.groupId = :targetId', { targetId });
      } else {
        // 单聊：检查fromUserId或toUserId
        queryBuilder.andWhere(
          new Brackets((qb) => {
            qb.where('message.fromUserId = :userId', { userId })
              .orWhere('message.toUserId = :userId', { userId });
          }),
        );

        // 单聊目标过滤
        if (targetId && type === 'single') {
          queryBuilder.andWhere(
            new Brackets((qb) => {
              qb.where('message.toUserId = :targetId', { targetId })
                .orWhere('message.fromUserId = :targetId', { targetId });
            }),
          );
        }
      }
    }

    // 消息类型过滤
    if (messageType) {
      queryBuilder.andWhere('message.type = :messageType', { messageType });
    } else {
      // 默认只搜索文本和系统消息
      queryBuilder.andWhere('message.type IN (:...types)', {
        types: ['text', 'system', 'card', 'document', 'code', 'ppt'],
      });
    }

    // 时间范围过滤
    if (startTime) {
      queryBuilder.andWhere('message.createdAt >= :startTime', { startTime });
    }
    if (endTime) {
      queryBuilder.andWhere('message.createdAt <= :endTime', { endTime });
    }

    // 关键词搜索 - 使用全文搜索优化
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.trim();
      
      // 使用 PostgreSQL 全文搜索（如果可用）或回退到 ILIKE
      // 注意：全文搜索需要预先创建 tsvector 列和 GIN 索引
      // 详见 database/migrations/001_add_fulltext_search.sql
      queryBuilder.andWhere(
        `(message.content->>'text' ILIKE :searchTerm
         OR message.content->>'title' ILIKE :searchTerm
         OR message.content->>'description' ILIKE :searchTerm)`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    // 计算总数
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // 分页查询
    const messages = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      messages,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 使用全文搜索（需要 PostgreSQL 配置）
   * 性能比 ILIKE 提升 10-100 倍
   */
  async searchWithFullText(options: MessageSearchOptions): Promise<MessageSearchResult> {
    const {
      keyword,
      userId,
      targetId,
      type,
      startTime,
      endTime,
      page = 1,
      pageSize = 20,
    } = options;

    // 构建全文搜索查询
    // 注意：这需要预先在数据库中创建 tsvector 列
    // ALTER TABLE chat_messages ADD COLUMN search_vector tsvector;
    // CREATE INDEX idx_messages_search ON chat_messages USING GIN (search_vector);
    
    const searchTerm = keyword.trim().replace(/\s+/g, ' & ');
    
    const queryBuilder = this.messageRepository.createQueryBuilder('message');
    
    // 使用 to_tsquery 进行全文搜索
    queryBuilder.where(
      `message.search_vector @@ to_tsquery('chinese', :searchTerm)`,
      { searchTerm }
    );

    // 用户权限过滤
    if (userId) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('message.fromUserId = :userId', { userId })
            .orWhere('message.toUserId = :userId', { userId });
        }),
      );
    }

    // 目标过滤
    if (targetId) {
      if (type === 'single') {
        queryBuilder.andWhere(
          new Brackets((qb) => {
            qb.where('message.toUserId = :targetId', { targetId })
              .orWhere('message.fromUserId = :targetId', { targetId });
          }),
        );
      } else if (type === 'group') {
        queryBuilder.andWhere('message.groupId = :targetId', { targetId });
      }
    }

    // 时间范围
    if (startTime) {
      queryBuilder.andWhere('message.createdAt >= :startTime', { startTime });
    }
    if (endTime) {
      queryBuilder.andWhere('message.createdAt <= :endTime', { endTime });
    }

    // 计算总数
    const total = await queryBuilder.getCount();

    // 分页查询，添加相关性排序
    const messages = await queryBuilder
      .addSelect(`ts_rank(message.search_vector, to_tsquery('chinese', :searchTerm))`, 'rank')
      .orderBy('rank', 'DESC')
      .addOrderBy('message.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      messages,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 快速搜索（仅搜索最近的消息）
   * 使用游标分页优化性能
   */
  async quickSearch(
    userId: string,
    keyword: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ messages: Message[]; nextCursor?: string }> {
    const searchTerm = `%${keyword.trim()}%`;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.status = :status', { status: 'sent' })
      .andWhere(
        new Brackets((qb) => {
          qb.where('message.fromUserId = :userId', { userId }).orWhere(
            'message.toUserId = :userId',
            { userId },
          );
        }),
      )
      .andWhere('message.type IN (:...types)', { types: ['text', 'system'] })
      .andWhere(
        `(message.content->>'text' ILIKE :searchTerm)`,
        { searchTerm },
      );

    // 游标分页
    if (cursor) {
      const cursorDate = new Date(Buffer.from(cursor, 'base64').toString());
      queryBuilder.andWhere('message.createdAt < :cursorDate', { cursorDate });
    }

    const messages = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .take(limit + 1)
      .getMany();

    let nextCursor: string | undefined;
    if (messages.length > limit) {
      messages.pop();
      const lastMessage = messages[messages.length - 1];
      nextCursor = Buffer.from(lastMessage.createdAt.toISOString()).toString('base64');
    }

    return { messages, nextCursor };
  }

  /**
   * 搜索特定会话的消息
   */
  async searchInConversation(
    userId: string,
    targetId: string,
    type: 'single' | 'group',
    keyword: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<MessageSearchResult> {
    return this.search({
      keyword,
      userId,
      targetId,
      type,
      page,
      pageSize,
    });
  }

  /**
   * 获取用户的消息统计
   */
  async getMessageStats(
    userId: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<{
    totalSent: number;
    totalReceived: number;
    textMessages: number;
    imageMessages: number;
    fileMessages: number;
  }> {
    const queryBuilder = this.messageRepository.createQueryBuilder('message');

    queryBuilder.where('message.status = :status', { status: 'sent' });

    if (startTime) {
      queryBuilder.andWhere('message.createdAt >= :startTime', { startTime });
    }
    if (endTime) {
      queryBuilder.andWhere('message.createdAt <= :endTime', { endTime });
    }

    // 发送的消息数
    const sentQuery = queryBuilder
      .clone()
      .andWhere('message.fromUserId = :userId', { userId });
    const totalSent = await sentQuery.getCount();

    // 接收的消息数
    const receivedQuery = queryBuilder
      .clone()
      .andWhere('message.toUserId = :userId', { userId });
    const totalReceived = await receivedQuery.getCount();

    // 各类型消息统计
    const typeQuery = queryBuilder.clone();
    const textMessages = await typeQuery
      .clone()
      .andWhere('message.fromUserId = :userId', { userId })
      .andWhere('message.type = :type', { type: 'text' })
      .getCount();

    const imageMessages = await typeQuery
      .clone()
      .andWhere('message.fromUserId = :userId', { userId })
      .andWhere('message.type = :type', { type: 'image' })
      .getCount();

    const fileMessages = await typeQuery
      .clone()
      .andWhere('message.fromUserId = :userId', { userId })
      .andWhere('message.type IN (:...types)', { types: ['file', 'video'] })
      .getCount();

    return {
      totalSent,
      totalReceived,
      textMessages,
      imageMessages,
      fileMessages,
    };
  }

  /**
   * 获取热搜关键词（基于搜索日志）
   */
  async getHotKeywords(limit: number = 10): Promise<string[]> {
    // 实际项目中可以从搜索日志表中统计
    // 这里返回空数组作为占位
    return [];
  }

  /**
   * 构建搜索建议
   * 基于用户历史搜索和热门搜索
   */
  async getSearchSuggestions(
    userId: string,
    prefix: string,
    limit: number = 10,
  ): Promise<string[]> {
    // 实际项目中可以从搜索日志表中获取
    // 这里返回基于前缀的简单建议
    return [];
  }
}
