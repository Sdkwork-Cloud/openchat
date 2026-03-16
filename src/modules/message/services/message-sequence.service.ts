/**
 * 消息序列号服务
 *
 * 功能：
 * 1. 生成全局唯一消息序列号
 * 2. 使用 Redis 原子操作保证顺序
 * 3. 支持批量获取序列号
 * 4. 支持序列号回退检查
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import { Brackets, Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { Message } from '../message.entity';

export interface MissingSequenceScanResult {
  missingSequences: number[];
  scanFrom: number;
  scanTo: number;
  requestedTo: number;
  truncated: boolean;
}

@Injectable()
export class MessageSequenceService {
  private readonly logger = new Logger(MessageSequenceService.name);
  private readonly SEQUENCE_KEY_PREFIX = 'msg:seq:';
  private readonly SEQUENCE_EXPIRE_DAYS = 30; // 序列号保留30天
  private readonly MISSING_SEQUENCE_SCAN_MAX_WINDOW = 20000;

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
  ) {}

  /**
   * 获取下一个消息序列号
   * 使用 Redis INCR 原子操作保证顺序
   *
   * @param conversationId 会话ID
   * @returns 序列号
   */
  async getNextSequence(conversationId: string): Promise<number> {
    const key = this.getSequenceKey(conversationId);
    const sequence = await this.redis.incr(key);

    // 设置过期时间（第一次设置时）
    if (sequence === 1) {
      await this.redis.expire(key, this.SEQUENCE_EXPIRE_DAYS * 24 * 60 * 60);
    }

    this.logger.debug(`Generated sequence ${sequence} for conversation ${conversationId}`);
    return sequence;
  }

  /**
   * 批量获取序列号
   *
   * @param conversationId 会话ID
   * @param count 数量
   * @returns 序列号数组
   */
  async getNextSequences(conversationId: string, count: number): Promise<number[]> {
    if (count <= 0) {
      return [];
    }

    const key = this.getSequenceKey(conversationId);
    const endSequence = await this.redis.incrby(key, count);
    if (!Number.isFinite(endSequence) || endSequence < count) {
      throw new Error(`Invalid sequence range generated for ${conversationId}`);
    }

    const startSequence = endSequence - count + 1;
    const sequences = Array.from({ length: count }, (_, index) => startSequence + index);

    // 设置过期时间（第一次设置时）
    if (endSequence === count) {
      await this.redis.expire(key, this.SEQUENCE_EXPIRE_DAYS * 24 * 60 * 60);
    }

    this.logger.debug(`Generated ${count} sequences for conversation ${conversationId}`);
    return sequences;
  }

  /**
   * 获取当前序列号
   *
   * @param conversationId 会话ID
   * @returns 当前序列号，如果不存在返回0
   */
  async getCurrentSequence(conversationId: string): Promise<number> {
    const key = this.getSequenceKey(conversationId);
    const value = await this.redis.get(key);
    if (value) {
      const parsed = parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const dbMaxSeq = await this.getConversationMaxSeq(conversationId);
    return dbMaxSeq > 0 ? dbMaxSeq : 0;
  }

  /**
   * 重置序列号
   * 慎用：仅在特殊情况下使用
   *
   * @param conversationId 会话ID
   * @param sequence 序列号
   */
  async resetSequence(conversationId: string, sequence: number): Promise<void> {
    const key = this.getSequenceKey(conversationId);
    await this.redis.set(key, sequence.toString());
    await this.redis.expire(key, this.SEQUENCE_EXPIRE_DAYS * 24 * 60 * 60);

    this.logger.warn(`Reset sequence for conversation ${conversationId} to ${sequence}`);
  }

  /**
   * 检查序列号是否连续
   *
   * @param conversationId 会话ID
   * @param sequence 序列号
   * @returns 是否连续
   */
  async isSequenceContinuous(conversationId: string, sequence: number): Promise<boolean> {
    const currentSeq = await this.getCurrentSequence(conversationId);
    return sequence === currentSeq + 1;
  }

  /**
   * 获取缺失的序列号范围
   *
   * @param conversationId 会话ID
   * @param fromSequence 起始序列号
   * @param toSequence 结束序列号
   * @returns 缺失的序列号数组
   */
  async getMissingSequences(
    conversationId: string,
    fromSequence: number,
    toSequence: number,
  ): Promise<number[]> {
    const result = await this.getMissingSequencesWithMeta(conversationId, fromSequence, toSequence);
    return result.missingSequences;
  }

  async getMissingSequencesWithMeta(
    conversationId: string,
    fromSequence: number,
    toSequence: number,
  ): Promise<MissingSequenceScanResult> {
    const normalizedFrom = Math.max(1, Math.floor(fromSequence));
    const normalizedTo = Math.max(0, Math.floor(toSequence));
    if (!Number.isFinite(normalizedFrom) || !Number.isFinite(normalizedTo) || normalizedTo < normalizedFrom) {
      return {
        missingSequences: [],
        scanFrom: normalizedFrom,
        scanTo: normalizedFrom - 1,
        requestedTo: normalizedTo,
        truncated: false,
      };
    }

    const currentSeq = await this.getCurrentSequence(conversationId);
    if (currentSeq <= 0) {
      return {
        missingSequences: [],
        scanFrom: normalizedFrom,
        scanTo: normalizedFrom - 1,
        requestedTo: normalizedTo,
        truncated: false,
      };
    }

    const effectiveTo = Math.min(normalizedTo, currentSeq);
    if (effectiveTo < normalizedFrom) {
      return {
        missingSequences: [],
        scanFrom: normalizedFrom,
        scanTo: normalizedFrom - 1,
        requestedTo: effectiveTo,
        truncated: false,
      };
    }

    const maxWindowTo = normalizedFrom + this.MISSING_SEQUENCE_SCAN_MAX_WINDOW - 1;
    const scanTo = Math.min(effectiveTo, maxWindowTo);
    const truncated = scanTo < effectiveTo;
    if (truncated) {
      this.logger.warn(
        `Missing sequence scan window truncated for ${conversationId}: requested [${normalizedFrom}, ${effectiveTo}], scanned to ${scanTo}`,
      );
    }

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .select('message.seq', 'seq')
      .where('message.isDeleted = false')
      .andWhere('message.seq IS NOT NULL')
      .andWhere('message.seq >= :fromSeq', { fromSeq: normalizedFrom })
      .andWhere('message.seq <= :toSeq', { toSeq: scanTo });

    if (!this.applyConversationFilter(queryBuilder, conversationId)) {
      this.logger.warn(`Invalid conversation sequence key: ${conversationId}`);
      return {
        missingSequences: [],
        scanFrom: normalizedFrom,
        scanTo,
        requestedTo: effectiveTo,
        truncated,
      };
    }

    const rows = await queryBuilder.getRawMany<{ seq?: string | number | null }>();
    const existingSequences = new Set<number>();
    rows.forEach((row) => {
      const value = row?.seq;
      const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
      if (Number.isFinite(parsed) && parsed >= normalizedFrom && parsed <= scanTo) {
        existingSequences.add(parsed);
      }
    });

    const missing: number[] = [];
    for (let seq = normalizedFrom; seq <= scanTo; seq += 1) {
      if (!existingSequences.has(seq)) {
        missing.push(seq);
      }
    }

    return {
      missingSequences: missing,
      scanFrom: normalizedFrom,
      scanTo,
      requestedTo: effectiveTo,
      truncated,
    };
  }

  /**
   * 删除会话的序列号
   *
   * @param conversationId 会话ID
   */
  async deleteSequence(conversationId: string): Promise<void> {
    const key = this.getSequenceKey(conversationId);
    await this.redis.del(key);

    this.logger.debug(`Deleted sequence for conversation ${conversationId}`);
  }

  private getSequenceKey(conversationId: string): string {
    return `${this.SEQUENCE_KEY_PREFIX}${conversationId}`;
  }

  private async getConversationMaxSeq(conversationId: string): Promise<number> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .select('MAX(message.seq)', 'maxSeq')
      .where('message.isDeleted = false')
      .andWhere('message.seq IS NOT NULL');

    if (!this.applyConversationFilter(queryBuilder, conversationId)) {
      return 0;
    }

    const raw = await queryBuilder.getRawOne<{ maxSeq?: string | number | null }>();
    const maxSeq = typeof raw?.maxSeq === 'string' ? parseInt(raw.maxSeq, 10) : Number(raw?.maxSeq || 0);
    return Number.isFinite(maxSeq) && maxSeq > 0 ? maxSeq : 0;
  }

  private applyConversationFilter(
    queryBuilder: ReturnType<Repository<Message>['createQueryBuilder']>,
    conversationId: string,
  ): boolean {
    if (!conversationId || typeof conversationId !== 'string') {
      return false;
    }

    if (conversationId.startsWith('group:')) {
      const groupId = conversationId.slice('group:'.length);
      if (!groupId) {
        return false;
      }
      queryBuilder.andWhere('message.groupId = :groupId', { groupId });
      return true;
    }

    if (conversationId.startsWith('single:')) {
      const payload = conversationId.slice('single:'.length);
      const delimiterIndex = payload.indexOf(':');
      if (delimiterIndex <= 0 || delimiterIndex >= payload.length - 1) {
        return false;
      }
      const userA = payload.slice(0, delimiterIndex);
      const userB = payload.slice(delimiterIndex + 1);
      if (!userA || !userB) {
        return false;
      }

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('(message.fromUserId = :userA AND message.toUserId = :userB)', { userA, userB })
            .orWhere('(message.fromUserId = :userB AND message.toUserId = :userA)', { userA, userB });
        }),
      );
      return true;
    }

    return false;
  }
}
