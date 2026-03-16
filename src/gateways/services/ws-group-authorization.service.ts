import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { MessageService } from '../../modules/message/message.service';

@Injectable()
export class WsGroupAuthorizationService {
  private readonly logger = new Logger(WsGroupAuthorizationService.name);
  private readonly MEMBER_CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly redisService: RedisService,
    private readonly messageService: MessageService,
  ) {}

  async isUserGroupMember(userId: string, groupId: string): Promise<boolean> {
    const cacheKey = this.buildMemberCacheKey(groupId, userId);
    const cached = await this.redisService.get(cacheKey);

    try {
      const isMember = await this.messageService.isUserInGroup(groupId, userId);
      if (isMember) {
        await this.redisService.set(cacheKey, 'true', this.MEMBER_CACHE_TTL_SECONDS);
        return true;
      }

      if (cached === 'true') {
        await this.redisService.del(cacheKey);
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to check group membership for user ${userId} in group ${groupId}:`, error);
      return false;
    }
  }

  private buildMemberCacheKey(groupId: string, userId: string): string {
    return `group:member:${groupId}:${userId}`;
  }
}
