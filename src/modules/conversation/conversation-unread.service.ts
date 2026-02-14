import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConversationService } from './conversation.service';

/**
 * 会话未读数服务
 * 使用Redis计数器管理会话未读数，提高性能并减少数据库操作
 */
@Injectable()
export class ConversationUnreadService {
  private readonly logger = new Logger(ConversationUnreadService.name);

  // Redis键前缀
  private readonly REDIS_KEY_PREFIX = 'conversation:unread:';

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * 生成会话未读数的Redis键
   */
  private getRedisKey(conversationId: string): string {
    return `${this.REDIS_KEY_PREFIX}${conversationId}`;
  }

  /**
   * 增加会话未读数
   * @param conversationId 会话ID
   * @param increment 增加的数量，默认1
   */
  async incrementUnreadCount(conversationId: string, increment: number = 1): Promise<number> {
    try {
      const key = this.getRedisKey(conversationId);
      
      // 使用Redis的INCRBY命令增加计数器
      const newCount = await this.redis.incrby(key, increment);
      
      // 异步同步到数据库（不阻塞响应）
      this.syncToDatabase(conversationId, newCount).catch(error => {
        this.logger.error(`Failed to sync unread count to database:`, error);
      });
      
      return newCount;
    } catch (error) {
      this.logger.error(`Failed to increment unread count:`, error);
      
      // 降级：使用数据库操作
      await this.conversationService.incrementUnreadCount(conversationId);
      return 1; // 默认返回1，实际值可能不同
    }
  }

  /**
   * 清空会话未读数
   * @param conversationId 会话ID
   */
  async clearUnreadCount(conversationId: string): Promise<boolean> {
    try {
      const key = this.getRedisKey(conversationId);
      
      // 删除Redis计数器
      await this.redis.del(key);
      
      // 异步同步到数据库（不阻塞响应）
      this.conversationService.clearUnreadCount(conversationId).catch(error => {
        this.logger.error(`Failed to clear unread count in database:`, error);
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to clear unread count:`, error);
      
      // 降级：使用数据库操作
      return await this.conversationService.clearUnreadCount(conversationId);
    }
  }

  /**
   * 获取会话未读数
   * @param conversationId 会话ID
   */
  async getUnreadCount(conversationId: string): Promise<number> {
    try {
      const key = this.getRedisKey(conversationId);
      
      // 从Redis获取未读数
      const count = await this.redis.get(key);
      if (count !== null) {
        return parseInt(count, 10);
      }
      
      // 如果Redis中不存在，从数据库获取并同步到Redis
      const conversation = await this.conversationService.getConversationById(conversationId);
      if (conversation) {
        const unreadCount = conversation.unreadCount || 0;
        await this.redis.set(key, unreadCount);
        return unreadCount;
      }
      
      return 0;
    } catch (error) {
      this.logger.error(`Failed to get unread count:`, error);
      
      // 降级：从数据库获取
      const conversation = await this.conversationService.getConversationById(conversationId);
      return conversation?.unreadCount || 0;
    }
  }

  /**
   * 批量获取会话未读数
   * @param conversationIds 会话ID列表
   */
  async getUnreadCountsBatch(conversationIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    
    try {
      if (conversationIds.length === 0) {
        return result;
      }
      
      // 构建Redis键列表
      const keys = conversationIds.map(id => this.getRedisKey(id));
      
      // 批量获取Redis中的未读数
      const values = await this.redis.mget(...keys);
      
      // 处理结果
      conversationIds.forEach((id, index) => {
        const value = values[index];
        if (value !== null) {
          result.set(id, parseInt(value, 10));
        }
      });
      
      const missingIds = conversationIds.filter(id => !result.has(id));
      if (missingIds.length > 0) {
        const conversations = await this.conversationService['conversationRepository']
          .createQueryBuilder('conversation')
          .select(['conversation.id', 'conversation.unreadCount'])
          .where('conversation.id IN (:...ids)', { ids: missingIds })
          .getMany();

        for (const conv of conversations) {
          result.set(conv.id, conv.unreadCount || 0);
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to get unread counts batch:`, error);
      
      // 降级：逐个从数据库获取
      for (const id of conversationIds) {
        const conversation = await this.conversationService.getConversationById(id);
        result.set(id, conversation?.unreadCount || 0);
      }
    }
    
    return result;
  }

  /**
   * 同步未读数到数据库
   * @param conversationId 会话ID
   * @param count 未读数
   */
  private async syncToDatabase(conversationId: string, count: number): Promise<void> {
    try {
      // 这里可以实现批量同步或定时同步，避免频繁数据库操作
      // 简化实现：直接更新数据库
      const conversation = await this.conversationService.getConversationById(conversationId);
      if (conversation && conversation.unreadCount !== count) {
        // 这里需要修改ConversationService，添加更新未读数的方法
        // 暂时使用现有的方法，通过获取实体后更新
        const entity = await this.conversationService['conversationRepository'].findOne({
          where: { id: conversationId },
        });
        if (entity) {
          entity.unreadCount = count;
          await this.conversationService['conversationRepository'].save(entity);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync unread count to database:`, error);
    }
  }

  /**
   * 初始化会话未读数
   * @param conversationId 会话ID
   * @param initialCount 初始未读数，默认0
   */
  async initializeUnreadCount(conversationId: string, initialCount: number = 0): Promise<void> {
    try {
      const key = this.getRedisKey(conversationId);
      await this.redis.set(key, initialCount);
    } catch (error) {
      this.logger.error(`Failed to initialize unread count:`, error);
    }
  }

  /**
   * 删除会话未读数
   * @param conversationId 会话ID
   */
  async deleteUnreadCount(conversationId: string): Promise<void> {
    try {
      const key = this.getRedisKey(conversationId);
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete unread count:`, error);
    }
  }
}
