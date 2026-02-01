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
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';

@Injectable()
export class MessageSequenceService {
  private readonly logger = new Logger(MessageSequenceService.name);
  private readonly SEQUENCE_KEY_PREFIX = 'msg:seq:';
  private readonly SEQUENCE_EXPIRE_DAYS = 30; // 序列号保留30天

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
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
    const pipeline = this.redis.pipeline();

    for (let i = 0; i < count; i++) {
      pipeline.incr(key);
    }

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Failed to execute pipeline');
    }

    const sequences = results.map(([err, val]) => {
      if (err) {
        throw err;
      }
      return val as number;
    });

    // 设置过期时间（第一次设置时）
    const firstSeq = sequences[0];
    if (firstSeq <= count) {
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
    return value ? parseInt(value, 10) : 0;
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
    // 这里需要配合消息存储来检查哪些序列号缺失
    // 简化实现：假设所有序列号都存在
    const currentSeq = await this.getCurrentSequence(conversationId);

    if (toSequence > currentSeq) {
      // 请求的序列号超出了当前范围
      return [];
    }

    // 实际实现中需要查询数据库
    return [];
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
}
