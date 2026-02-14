import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { UserService } from '../../modules/user/services/user.service';
import { ConversationService } from '../../modules/conversation/conversation.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name);
  private isWarmingUp = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly conversationService: ConversationService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.configService.get('CACHE_WARMUP_ON_START') === 'true') {
      await this.warmupOnStartup();
    }
  }

  private async warmupOnStartup(): Promise<void> {
    this.logger.log('Starting cache warmup on startup...');
    const startTime = Date.now();

    try {
      await Promise.all([
        this.warmupOnlineUsers(),
        this.warmupHotConversations(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warmup completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warmup failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async warmupPeriodically(): Promise<void> {
    if (this.isWarmingUp) {
      this.logger.debug('Cache warmup already in progress, skipping');
      return;
    }

    this.isWarmingUp = true;
    try {
      await this.warmupHotConversations();
      this.logger.log('Periodic cache warmup completed');
    } catch (error) {
      this.logger.error('Periodic cache warmup failed:', error);
    } finally {
      this.isWarmingUp = false;
    }
  }

  private async warmupOnlineUsers(): Promise<void> {
    try {
      const onlineUsers = await this.redisService.getOnlineUsers(1000);
      this.logger.log(`Warmed up ${onlineUsers.length} online users`);
    } catch (error) {
      this.logger.error('Failed to warmup online users:', error);
    }
  }

  private async warmupHotConversations(): Promise<void> {
    try {
      const hotUserIds = await this.redisService.getOnlineUsers(100);
      
      for (const userId of hotUserIds) {
        const conversations = await this.conversationService.getConversationsByUserId({
          userId,
          limit: 20,
        });

        for (const conv of conversations) {
          const cacheKey = `conversation:${conv.id}`;
          await this.redisService.set(cacheKey, JSON.stringify(conv), 3600);
        }
      }

      this.logger.log(`Warmed up conversations for ${hotUserIds.length} users`);
    } catch (error) {
      this.logger.error('Failed to warmup hot conversations:', error);
    }
  }

  async warmupUser(userId: string): Promise<void> {
    try {
      const user = await this.userService.getUserById(userId);
      if (user) {
        await this.redisService.set(`user:${userId}`, JSON.stringify(user), 3600);
      }

      const conversations = await this.conversationService.getConversationsByUserId({
        userId,
        limit: 10,
      });

      for (const conv of conversations) {
        await this.redisService.set(`conversation:${conv.id}`, JSON.stringify(conv), 3600);
      }

      this.logger.debug(`Warmed up cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to warmup user ${userId}:`, error);
    }
  }
}
