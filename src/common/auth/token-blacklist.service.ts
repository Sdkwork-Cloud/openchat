import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly USER_TOKENS_PREFIX = 'token:user:';

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async addToBlacklist(token: string, reason: string = 'logout'): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return;
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) {
        return;
      }

      const tokenKey = `${this.BLACKLIST_PREFIX}${this.hashToken(token)}`;
      await this.redisService.set(tokenKey, JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString(),
        userId: decoded.sub,
      }), ttl);

      if (decoded.sub) {
        await this.addUserToken(decoded.sub, token, ttl);
      }

      this.logger.debug(`Token blacklisted: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to add token to blacklist:', error);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenKey = `${this.BLACKLIST_PREFIX}${this.hashToken(token)}`;
      const result = await this.redisService.get(tokenKey);
      return result !== null;
    } catch (error) {
      this.logger.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  async blacklistAllUserTokens(userId: string, reason: string = 'security'): Promise<void> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const tokens = await this.redisService.get(userTokensKey);
      
      if (tokens) {
        const tokenList = JSON.parse(tokens) as string[];
        for (const token of tokenList) {
          await this.addToBlacklist(token, reason);
        }
      }

      await this.redisService.del(userTokensKey);
      this.logger.log(`All tokens blacklisted for user ${userId}: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to blacklist all user tokens:', error);
    }
  }

  private async addUserToken(userId: string, token: string, ttl: number): Promise<void> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const existing = await this.redisService.get(userTokensKey);
      const tokenList: string[] = existing ? JSON.parse(existing) : [];
      
      const hashedToken = this.hashToken(token);
      if (!tokenList.includes(hashedToken)) {
        tokenList.push(hashedToken);
        await this.redisService.set(userTokensKey, JSON.stringify(tokenList), ttl);
      }
    } catch (error) {
      this.logger.error('Failed to add user token:', error);
    }
  }

  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    oldestEntry: Date | null;
  }> {
    return {
      totalBlacklisted: 0,
      oldestEntry: null,
    };
  }
}
