import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';

interface DecodedJwtPayload {
  exp?: number;
  userId?: string;
  deviceId?: string;
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly REDIS_KEY_PREFIX = 'openchat:';
  private readonly BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly USER_TOKENS_PREFIX = 'token:user:';
  private readonly USER_DEVICE_TOKENS_PREFIX = 'token:user-device:';
  private readonly USER_DEVICE_INDEX_PREFIX = 'token:user-devices:';

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async addToBlacklist(token: string, reason: string = 'logout'): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as DecodedJwtPayload | null;

      const userId = decoded?.userId;
      const deviceId = this.normalizeDeviceId(decoded?.deviceId);
      if (userId) {
        await this.removeUserTokenReference(userId, token);
        if (deviceId) {
          await this.removeUserDeviceTokenReference(userId, deviceId, token);
        }
      }

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
        userId,
      }), ttl);

      this.logger.debug(`Token blacklisted: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to add token to blacklist:', error);
    }
  }

  async registerIssuedToken(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as DecodedJwtPayload | null;
      if (!decoded?.userId || !decoded.exp) {
        return;
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) {
        return;
      }

      await this.addUserToken(decoded.userId, token, ttl);

      const deviceId = this.normalizeDeviceId(decoded.deviceId);
      if (deviceId) {
        await this.addUserDeviceToken(decoded.userId, deviceId, token, ttl);
      }
    } catch (error) {
      this.logger.error('Failed to register issued token:', error);
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
        const tokenList = this.parseTokenList(tokens);
        for (const token of tokenList) {
          await this.addToBlacklist(token, reason);
        }
      }

      await this.redisService.del(userTokensKey);
      await this.deleteAllUserDeviceBuckets(userId);
      this.logger.log(`All tokens blacklisted for user ${userId}: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to blacklist all user tokens:', error);
    }
  }

  async getUserDeviceTokenStats(
    userId: string,
    limit: number = 100,
  ): Promise<Array<{ deviceId: string; tokenCount: number }>> {
    if (!userId) {
      return [];
    }

    const safeLimit = this.normalizeLimit(limit, 100, 1, 200);
    const deviceIds = await this.getIndexedUserDeviceIds(userId, safeLimit);
    if (deviceIds.length === 0) {
      return [];
    }

    const redisClient = this.redisService.getClient();
    const pipeline = redisClient.pipeline();
    deviceIds.forEach((deviceId) => pipeline.get(this.getDeviceBucketKey(userId, deviceId)));
    const rows = await pipeline.exec();

    const result: Array<{ deviceId: string; tokenCount: number }> = [];
    for (let index = 0; index < deviceIds.length; index += 1) {
      const deviceId = deviceIds[index];
      const row = rows?.[index];
      const rawValue = row && !row[0] ? (row[1] as string | null) : null;
      if (!rawValue) {
        await this.removeUserDeviceFromIndex(userId, deviceId);
        continue;
      }

      const tokenCount = new Set(this.parseTokenList(rawValue)).size;
      result.push({
        deviceId,
        tokenCount,
      });
    }

    return result;
  }

  async blacklistUserTokensByDevice(
    userId: string,
    deviceId: string,
    reason: string = 'logout_device',
  ): Promise<string[]> {
    const normalizedDeviceId = this.normalizeDeviceId(deviceId);
    if (!normalizedDeviceId) {
      return [];
    }

    try {
      const userDeviceTokensKey = `${this.USER_DEVICE_TOKENS_PREFIX}${userId}:${normalizedDeviceId}`;
      const tokensRaw = await this.redisService.get(userDeviceTokensKey);
      const tokensFromDeviceBucket = tokensRaw ? this.parseTokenList(tokensRaw) : [];

      const tokensToBlacklist = new Set<string>(tokensFromDeviceBucket);
      if (tokensToBlacklist.size === 0) {
        const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
        const allTokensRaw = await this.redisService.get(userTokensKey);
        if (allTokensRaw) {
          const allTokens = this.parseTokenList(allTokensRaw);
          for (const token of allTokens) {
            const decoded = this.jwtService.decode(token) as DecodedJwtPayload | null;
            if (!decoded || decoded.userId !== userId) {
              continue;
            }
            const tokenDeviceId = this.normalizeDeviceId(decoded.deviceId);
            if (tokenDeviceId === normalizedDeviceId) {
              tokensToBlacklist.add(token);
            }
          }
        }
      }

      for (const token of tokensToBlacklist) {
        await this.addToBlacklist(token, reason);
      }

      await this.redisService.del(userDeviceTokensKey);
      await this.removeUserDeviceFromIndex(userId, normalizedDeviceId);
      return Array.from(tokensToBlacklist);
    } catch (error) {
      this.logger.error(
        `Failed to blacklist tokens by device for user ${userId}, device ${normalizedDeviceId}:`,
        error,
      );
      return [];
    }
  }

  async blacklistUserTokensExceptDevice(
    userId: string,
    keepDeviceId: string,
    reason: string = 'logout_others',
  ): Promise<string[]> {
    const normalizedKeepDeviceId = this.normalizeDeviceId(keepDeviceId);
    if (!userId || !normalizedKeepDeviceId) {
      return [];
    }

    const revoked = new Set<string>();
    const deviceIds = await this.getIndexedUserDeviceIds(userId, 200);
    for (const deviceId of deviceIds) {
      if (deviceId === normalizedKeepDeviceId) {
        continue;
      }
      const revokedByDevice = await this.blacklistUserTokensByDevice(userId, deviceId, reason);
      revokedByDevice.forEach((token) => revoked.add(token));
    }

    const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
    const allTokensRaw = await this.redisService.get(userTokensKey);
    if (allTokensRaw) {
      const allTokens = this.parseTokenList(allTokensRaw);
      for (const token of allTokens) {
        if (revoked.has(token)) {
          continue;
        }
        const decoded = this.jwtService.decode(token) as DecodedJwtPayload | null;
        if (!decoded || decoded.userId !== userId) {
          continue;
        }

        const tokenDeviceId = this.normalizeDeviceId(decoded.deviceId);
        if (tokenDeviceId !== normalizedKeepDeviceId) {
          await this.addToBlacklist(token, reason);
          revoked.add(token);
        }
      }
    }

    return Array.from(revoked);
  }

  private async addUserToken(userId: string, token: string, ttl: number): Promise<void> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const existing = await this.redisService.get(userTokensKey);
      const tokenList: string[] = existing ? this.parseTokenList(existing) : [];
      
      if (!tokenList.includes(token)) {
        tokenList.push(token);
        await this.redisService.set(userTokensKey, JSON.stringify(tokenList), ttl);
      }
    } catch (error) {
      this.logger.error('Failed to add user token:', error);
    }
  }

  private async removeUserTokenReference(userId: string, token: string): Promise<void> {
    const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
    const existing = await this.redisService.get(userTokensKey);
    if (!existing) {
      return;
    }

    const tokenList = this.parseTokenList(existing);
    if (tokenList.length === 0 || !tokenList.includes(token)) {
      return;
    }

    const filtered = tokenList.filter((item) => item !== token);
    await this.persistTokenListWithExistingTtl(userTokensKey, filtered);
  }

  private async addUserDeviceToken(
    userId: string,
    deviceId: string,
    token: string,
    ttl: number,
  ): Promise<void> {
    try {
      const key = `${this.USER_DEVICE_TOKENS_PREFIX}${userId}:${deviceId}`;
      const existing = await this.redisService.get(key);
      const tokenList: string[] = existing ? this.parseTokenList(existing) : [];
      if (!tokenList.includes(token)) {
        tokenList.push(token);
        await this.redisService.set(key, JSON.stringify(tokenList), ttl);
      }
      await this.addUserDeviceToIndex(userId, deviceId, ttl);
    } catch (error) {
      this.logger.error('Failed to add user device token:', error);
    }
  }

  private async removeUserDeviceTokenReference(
    userId: string,
    deviceId: string,
    token: string,
  ): Promise<void> {
    const deviceBucketKey = `${this.USER_DEVICE_TOKENS_PREFIX}${userId}:${deviceId}`;
    const existing = await this.redisService.get(deviceBucketKey);
    if (!existing) {
      await this.removeUserDeviceFromIndex(userId, deviceId);
      return;
    }

    const tokenList = this.parseTokenList(existing);
    if (tokenList.length === 0) {
      await this.redisService.del(deviceBucketKey);
      await this.removeUserDeviceFromIndex(userId, deviceId);
      return;
    }

    if (!tokenList.includes(token)) {
      return;
    }

    const filtered = tokenList.filter((item) => item !== token);
    await this.persistTokenListWithExistingTtl(deviceBucketKey, filtered);
    if (filtered.length === 0) {
      await this.removeUserDeviceFromIndex(userId, deviceId);
    }
  }

  private async addUserDeviceToIndex(
    userId: string,
    deviceId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const redisClient = this.redisService.getClient();
    const key = this.getDeviceIndexKey(userId);
    await redisClient.sadd(key, deviceId);
    if (ttlSeconds > 0) {
      const currentTtl = await redisClient.ttl(key);
      if (currentTtl < 0 || ttlSeconds > currentTtl) {
        await redisClient.expire(key, ttlSeconds);
      }
    }
  }

  private async removeUserDeviceFromIndex(userId: string, deviceId: string): Promise<void> {
    const redisClient = this.redisService.getClient();
    const key = this.getDeviceIndexKey(userId);
    await redisClient.srem(key, deviceId);
  }

  private async deleteAllUserDeviceBuckets(userId: string): Promise<void> {
    const deviceIds = await this.getIndexedUserDeviceIds(userId, 10000);
    for (const deviceId of deviceIds) {
      await this.redisService.del(`${this.USER_DEVICE_TOKENS_PREFIX}${userId}:${deviceId}`);
    }
    await this.redisService.del(`${this.USER_DEVICE_INDEX_PREFIX}${userId}`);
  }

  private async persistTokenListWithExistingTtl(key: string, tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      await this.redisService.del(key);
      return;
    }

    const redisClient = this.redisService.getClient();
    const ttl = await redisClient.ttl(this.toPrefixedKey(key));
    if (ttl > 0) {
      await this.redisService.set(key, JSON.stringify(tokens), ttl);
      return;
    }

    await this.redisService.set(key, JSON.stringify(tokens));
  }

  private async getIndexedUserDeviceIds(userId: string, limit: number): Promise<string[]> {
    const safeLimit = this.normalizeLimit(limit, 100, 1, 10000);
    const redisClient = this.redisService.getClient();
    const indexKey = this.getDeviceIndexKey(userId);
    const indexedDeviceIdsRaw = await redisClient.smembers(indexKey);

    const indexedDeviceIds = indexedDeviceIdsRaw
      .map((deviceId) => this.normalizeDeviceId(deviceId))
      .filter((deviceId): deviceId is string => !!deviceId);

    if (indexedDeviceIds.length > 0) {
      return indexedDeviceIds.slice(0, safeLimit);
    }

    const scanned = await this.scanUserDeviceIds(userId, safeLimit);
    for (const deviceId of scanned) {
      await this.addUserDeviceToIndex(userId, deviceId, 86400);
    }
    return scanned;
  }

  private async scanUserDeviceIds(userId: string, limit: number): Promise<string[]> {
    const redisClient = this.redisService.getClient();
    const fullPrefix = `openchat:${this.USER_DEVICE_TOKENS_PREFIX}${userId}:`;
    const pattern = `${fullPrefix}*`;

    const discovered = new Set<string>();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      for (const key of keys) {
        const rawDeviceId = key.slice(fullPrefix.length);
        const normalizedDeviceId = this.normalizeDeviceId(rawDeviceId);
        if (!normalizedDeviceId) {
          continue;
        }
        discovered.add(normalizedDeviceId);
        if (discovered.size >= limit) {
          break;
        }
      }
      if (discovered.size >= limit) {
        break;
      }
    } while (cursor !== '0');

    return Array.from(discovered);
  }

  private getDeviceBucketKey(userId: string, deviceId: string): string {
    return this.toPrefixedKey(`${this.USER_DEVICE_TOKENS_PREFIX}${userId}:${deviceId}`);
  }

  private getDeviceIndexKey(userId: string): string {
    return this.toPrefixedKey(`${this.USER_DEVICE_INDEX_PREFIX}${userId}`);
  }

  private toPrefixedKey(key: string): string {
    return `${this.REDIS_KEY_PREFIX}${key}`;
  }

  private parseTokenList(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    } catch {
      return [];
    }
  }

  private normalizeDeviceId(deviceId?: string): string | undefined {
    if (!deviceId || typeof deviceId !== 'string') {
      return undefined;
    }
    const normalized = deviceId.trim();
    if (!normalized) {
      return undefined;
    }
    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return undefined;
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
