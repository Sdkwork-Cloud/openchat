import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConversationEntity } from '../conversation/conversation.entity';
import { GroupMember } from './group-member.entity';
import { RedisService } from '../../common/redis/redis.service';

/**
 * 批量操作结果
 */
interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

/**
 * 群聊消息批处理服务
 * 使用 Pipeline 和批量 INSERT 优化性能
 */
@Injectable()
export class GroupMessageBatchService {
  private readonly logger = new Logger(GroupMessageBatchService.name);

  // 批处理配置
  private readonly BATCH_SIZE = 100; // 每批处理数量
  private readonly CONCURRENCY = 5; // 并发数

  constructor(
    @InjectRepository(ConversationEntity)
    private conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 批量更新群成员会话（优化版）
   * 使用数据库批量 INSERT + ON CONFLICT UPDATE
   */
  async batchUpdateConversations(
    groupId: string,
    senderId: string,
    messageId: string,
    content: string,
    messageTime: Date,
  ): Promise<BatchResult> {
    const startTime = Date.now();

    try {
      // 1. 获取所有群成员（批量查询）
      const members = await this.groupMemberRepository.find({
        where: { groupId, status: 'joined' },
        select: ['userId'],
      });

      // 排除发送者
      const targetMembers = members.filter((m) => m.userId !== senderId);

      if (targetMembers.length === 0) {
        return { success: true, processed: 0, failed: 0 };
      }

      // 2. 使用数据库原生批量操作
      await this.bulkUpsertConversations(
        targetMembers.map((m) => m.userId),
        groupId,
        'group',
        messageId,
        content,
        messageTime,
      );

      // 3. 批量更新 Redis 未读数（Pipeline）
      await this.batchUpdateUnreadCount(groupId, targetMembers.map((m) => m.userId));

      const duration = Date.now() - startTime;
      this.logger.log(
        `Batch updated ${targetMembers.length} conversations in ${duration}ms`,
      );

      return {
        success: true,
        processed: targetMembers.length,
        failed: 0,
      };
    } catch (error) {
      this.logger.error('Failed to batch update conversations', error);
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * 批量 Upsert 会话（使用 PostgreSQL 原生语法）
   */
  private async bulkUpsertConversations(
    userIds: string[],
    targetId: string,
    type: 'group',
    messageId: string,
    content: string,
    messageTime: Date,
  ): Promise<void> {
    // 分批处理避免 SQL 过长
    const batches = this.chunkArray(userIds, this.BATCH_SIZE);

    for (const batch of batches) {
      // 构建批量 INSERT ... ON CONFLICT 语句
      const values = batch
        .map((userId, index) => {
          const id = `${userId}_${targetId}_${type}`;
          return `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`;
        })
        .join(',');

      const params: any[] = [];
      batch.forEach((userId) => {
        params.push(
          `${userId}_${targetId}_${type}`, // id
          userId,
          targetId,
          type,
          messageId,
          content,
          messageTime,
        );
      });

      const query = `
        INSERT INTO chat_conversations 
          (id, user_id, target_id, type, last_message_id, last_message_content, last_message_time, unread_count, created_at, updated_at)
        VALUES 
          ${values}
        ON CONFLICT (id) 
        DO UPDATE SET
          last_message_id = EXCLUDED.last_message_id,
          last_message_content = EXCLUDED.last_message_content,
          last_message_time = EXCLUDED.last_message_time,
          unread_count = chat_conversations.unread_count + 1,
          updated_at = NOW()
      `;

      await this.dataSource.query(query, params);
    }
  }

  /**
   * 批量更新 Redis 未读数（Pipeline 优化）
   */
  private async batchUpdateUnreadCount(
    groupId: string,
    userIds: string[],
  ): Promise<void> {
    const pipeline = this.redisService.getClient().pipeline();

    userIds.forEach((userId) => {
      const key = `openchat:unread:${userId}:${groupId}`;
      pipeline.incr(key);
      pipeline.expire(key, 86400); // 24小时过期
    });

    await pipeline.exec();
  }

  /**
   * 批量获取用户会话（Pipeline 优化）
   */
  async batchGetConversations(
    userId: string,
    conversationIds: string[],
  ): Promise<Map<string, any>> {
    const pipeline = this.redisService.getClient().pipeline();
    const resultMap = new Map<string, any>();

    conversationIds.forEach((id) => {
      pipeline.hgetall(`openchat:conversation:${userId}:${id}`);
    });

    const results = await pipeline.exec();

    results?.forEach((result, index) => {
      const [err, data] = result;
      if (!err && data) {
        resultMap.set(conversationIds[index], data);
      }
    });

    return resultMap;
  }

  /**
   * 批量标记消息已读（批量 UPDATE）
   */
  async batchMarkAsRead(
    userId: string,
    groupIds: string[],
  ): Promise<BatchResult> {
    try {
      // 1. 批量更新数据库
      await this.conversationRepository
        .createQueryBuilder()
        .update()
        .set({ unreadCount: 0 })
        .where('user_id = :userId', { userId })
        .andWhere('type = :type', { type: 'group' })
        .andWhere('target_id IN (:...groupIds)', { groupIds })
        .execute();

      // 2. 批量清理 Redis 未读数（Pipeline）
      const pipeline = this.redisService.getClient().pipeline();
      groupIds.forEach((groupId) => {
        pipeline.del(`openchat:unread:${userId}:${groupId}`);
      });
      await pipeline.exec();

      return {
        success: true,
        processed: groupIds.length,
        failed: 0,
      };
    } catch (error) {
      this.logger.error('Failed to batch mark as read', error);
      return {
        success: false,
        processed: 0,
        failed: groupIds.length,
        errors: [error.message],
      };
    }
  }

  /**
   * 批量获取群成员信息（Pipeline 优化）
   */
  async batchGetGroupMembers(
    groupIds: string[],
  ): Promise<Map<string, string[]>> {
    const resultMap = new Map<string, string[]>();

    // 使用 Redis Pipeline 批量获取
    const pipeline = this.redisService.getClient().pipeline();

    groupIds.forEach((groupId) => {
      pipeline.smembers(`openchat:ws:room:${groupId}`);
    });

    const results = await pipeline.exec();

    results?.forEach((result, index) => {
      const [err, members] = result;
      if (!err && members) {
        resultMap.set(groupIds[index], members as string[]);
      }
    });

    // 对于缓存未命中的，从数据库查询并回填
    const missingGroupIds = groupIds.filter((id) => !resultMap.has(id));
    if (missingGroupIds.length > 0) {
      const membersFromDb = await this.groupMemberRepository.find({
        where: missingGroupIds.map((id) => ({ groupId: id, status: 'joined' })),
        select: ['groupId', 'userId'],
      });

      // 按 groupId 分组
      const grouped = this.groupBy(membersFromDb, 'groupId');
      grouped.forEach((members, groupId) => {
        const userIds = members.map((m) => m.userId);
        resultMap.set(groupId, userIds);

        // 回填 Redis（异步，不阻塞）
        this.redisService.getClient().sadd(
          `openchat:ws:room:${groupId}`,
          ...userIds,
        );
      });
    }

    return resultMap;
  }

  /**
   * 批量发送消息通知（WebSocket）
   * 使用分批并发处理避免阻塞
   */
  async batchSendNotifications(
    userIds: string[],
    event: string,
    data: any,
    notifyFunction: (userId: string, event: string, data: any) => Promise<void>,
  ): Promise<BatchResult> {
    const batches = this.chunkArray(userIds, this.BATCH_SIZE);
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      // 并发处理
      const promises = batch.map(async (userId) => {
        try {
          await notifyFunction(userId, event, data);
          processed++;
        } catch (error) {
          failed++;
          errors.push(`User ${userId}: ${error.message}`);
        }
      });

      // 等待当前批次完成
      await Promise.all(promises);
    }

    return {
      success: failed === 0,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 按 key 分组
   */
  private groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
    const map = new Map<string, T[]>();
    array.forEach((item) => {
      const groupKey = String(item[key]);
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(item);
    });
    return map;
  }
}
