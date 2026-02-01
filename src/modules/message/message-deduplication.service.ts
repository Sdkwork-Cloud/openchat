import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * 消息去重服务
 * 使用 Bloom Filter + Redis 实现高效消息去重
 */
@Injectable()
export class MessageDeduplicationService {
  // Bloom Filter 参数
  private readonly BLOOM_FILTER_SIZE = 1000000; // 100万bit
  private readonly BLOOM_FILTER_HASHES = 7; // 7个哈希函数
  private readonly BLOOM_FILTER_KEY = 'message:bloom:filter';

  // 已确认消息集合（处理 Bloom Filter 误判）
  private readonly CONFIRMED_SET_KEY = 'message:confirmed:set';

  // 客户端序列号过期时间（24小时）
  private readonly CLIENT_SEQ_TTL = 86400;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * 生成消息唯一标识
   * 基于客户端序列号和用户ID
   */
  generateMessageId(clientSeq: number, userId: string): string {
    return `${userId}:${clientSeq}`;
  }

  /**
   * 检查消息是否重复
   * 使用 Bloom Filter 快速判断 + Redis 二次确认
   */
  async isDuplicate(clientSeq: number, userId: string): Promise<boolean> {
    const messageId = this.generateMessageId(clientSeq, userId);

    // 1. 使用 Bloom Filter 快速判断
    const mightExist = await this.bloomFilterTest(messageId);

    if (!mightExist) {
      // 肯定不存在，直接返回 false
      return false;
    }

    // 2. 可能存在（Bloom Filter 误判），二次确认
    const exists = await this.redis.sismember(this.CONFIRMED_SET_KEY, messageId);
    return exists === 1;
  }

  /**
   * 批量检查消息是否重复
   * 用于批量消息处理场景
   */
  async isDuplicateBatch(clientSeqs: number[], userId: string): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();

    // 批量生成消息ID
    const messageIds = clientSeqs.map(seq => this.generateMessageId(seq, userId));

    // 批量检查 Bloom Filter
    const pipeline = this.redis.pipeline();
    for (const messageId of messageIds) {
      const positions = this.getHashPositions(messageId);
      for (const pos of positions) {
        pipeline.getbit(this.BLOOM_FILTER_KEY, pos);
      }
    }

    const pipelineResults = await pipeline.exec();
    if (!pipelineResults) {
      clientSeqs.forEach(seq => results.set(seq, false));
      return results;
    }

    // 解析结果
    let resultIndex = 0;
    for (let i = 0; i < clientSeqs.length; i++) {
      const seq = clientSeqs[i];
      let mightExist = true;

      // 检查所有位是否都是1
      for (let j = 0; j < this.BLOOM_FILTER_HASHES; j++) {
        const [err, bit] = pipelineResults[resultIndex++];
        if (err || bit === 0) {
          mightExist = false;
          break;
        }
      }

      if (!mightExist) {
        results.set(seq, false);
      } else {
        // 需要二次确认
        const messageId = this.generateMessageId(seq, userId);
        const exists = await this.redis.sismember(this.CONFIRMED_SET_KEY, messageId);
        results.set(seq, exists === 1);
      }
    }

    return results;
  }

  /**
   * 标记消息已处理
   */
  async markAsProcessed(clientSeq: number, userId: string): Promise<void> {
    const messageId = this.generateMessageId(clientSeq, userId);

    // 1. 添加到 Bloom Filter
    await this.bloomFilterAdd(messageId);

    // 2. 添加到确认集合（带过期时间）
    await this.redis.sadd(this.CONFIRMED_SET_KEY, messageId);
    await this.redis.expire(this.CONFIRMED_SET_KEY, this.CLIENT_SEQ_TTL);
  }

  /**
   * 批量标记消息已处理
   * 使用 Pipeline 提高性能
   */
  async markAsProcessedBatch(clientSeqs: number[], userId: string): Promise<void> {
    if (clientSeqs.length === 0) return;

    const pipeline = this.redis.pipeline();

    for (const clientSeq of clientSeqs) {
      const messageId = this.generateMessageId(clientSeq, userId);

      // 添加到 Bloom Filter
      const positions = this.getHashPositions(messageId);
      for (const pos of positions) {
        pipeline.setbit(this.BLOOM_FILTER_KEY, pos, 1);
      }

      // 添加到确认集合
      pipeline.sadd(this.CONFIRMED_SET_KEY, messageId);
    }

    // 更新过期时间
    pipeline.expire(this.CONFIRMED_SET_KEY, this.CLIENT_SEQ_TTL);

    await pipeline.exec();
  }

  /**
   * 标记消息已处理（事务性版本）
   * 用于数据库事务中，支持回滚
   */
  async markAsProcessedTransactional(
    clientSeq: number,
    userId: string,
    transactionId: string
  ): Promise<void> {
    const messageId = this.generateMessageId(clientSeq, userId);
    const txKey = `message:tx:${transactionId}`;

    // 1. 记录到事务临时集合
    await this.redis.sadd(txKey, messageId);
    await this.redis.expire(txKey, 300); // 5分钟过期

    // 2. 添加到 Bloom Filter
    await this.bloomFilterAdd(messageId);

    // 3. 添加到确认集合
    await this.redis.sadd(this.CONFIRMED_SET_KEY, messageId);
    await this.redis.expire(this.CONFIRMED_SET_KEY, this.CLIENT_SEQ_TTL);
  }

  /**
   * 回滚事务性标记
   * 当数据库事务失败时调用
   */
  async rollbackTransactionalMark(transactionId: string): Promise<void> {
    const txKey = `message:tx:${transactionId}`;

    // 获取事务中标记的所有消息
    const messageIds = await this.redis.smembers(txKey);

    if (messageIds.length > 0) {
      // 从确认集合中移除
      await this.redis.srem(this.CONFIRMED_SET_KEY, ...messageIds);
    }

    // 删除事务记录
    await this.redis.del(txKey);
  }

  /**
   * 提交事务性标记
   * 当数据库事务成功时调用（清理临时数据）
   */
  async commitTransactionalMark(transactionId: string): Promise<void> {
    const txKey = `message:tx:${transactionId}`;
    await this.redis.del(txKey);
  }

  /**
   * Bloom Filter - 添加元素
   * 使用多个哈希函数计算位置
   */
  private async bloomFilterAdd(messageId: string): Promise<void> {
    const positions = this.getHashPositions(messageId);
    const pipeline = this.redis.pipeline();

    for (const pos of positions) {
      pipeline.setbit(this.BLOOM_FILTER_KEY, pos, 1);
    }

    await pipeline.exec();
  }

  /**
   * Bloom Filter - 测试元素
   * 如果所有位都是1，可能存在；如果有任何一位是0，肯定不存在
   */
  private async bloomFilterTest(messageId: string): Promise<boolean> {
    const positions = this.getHashPositions(messageId);
    const pipeline = this.redis.pipeline();

    for (const pos of positions) {
      pipeline.getbit(this.BLOOM_FILTER_KEY, pos);
    }

    const results = await pipeline.exec();

    if (!results) return false;

    // 检查所有位是否都是1
    for (const result of results) {
      const [err, bit] = result;
      if (err) throw err;
      if (bit === 0) return false; // 肯定不存在
    }

    return true; // 可能存在
  }

  /**
   * 计算哈希位置（使用 FNV-1a 哈希算法）
   */
  private getHashPositions(messageId: string): number[] {
    const positions: number[] = [];

    for (let i = 0; i < this.BLOOM_FILTER_HASHES; i++) {
      const hash = this.fnv1aHash(messageId, i);
      const position = hash % this.BLOOM_FILTER_SIZE;
      positions.push(position);
    }

    return positions;
  }

  /**
   * FNV-1a 哈希算法实现
   */
  private fnv1aHash(str: string, seed: number): number {
    const FNV_PRIME = 16777619;
    const FNV_OFFSET_BASIS = 2166136261;

    let hash = FNV_OFFSET_BASIS + seed;

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, FNV_PRIME);
    }

    return Math.abs(hash);
  }

  /**
   * 清理过期的去重数据
   * 定期调用以释放内存
   */
  async cleanup(): Promise<void> {
    // 清理确认集合中的过期成员
    // Bloom Filter 不支持删除，需要定期重建
    const members = await this.redis.smembers(this.CONFIRMED_SET_KEY);

    if (members.length === 0) {
      // 如果确认集合为空，可以重建 Bloom Filter
      await this.rebuildBloomFilter();
    }
  }

  /**
   * 重建 Bloom Filter
   * 当误判率过高时调用
   */
  private async rebuildBloomFilter(): Promise<void> {
    // 删除旧的 Bloom Filter
    await this.redis.del(this.BLOOM_FILTER_KEY);

    // 重新添加所有已确认的消息
    const members = await this.redis.smembers(this.CONFIRMED_SET_KEY);

    for (const member of members) {
      await this.bloomFilterAdd(member);
    }
  }

  /**
   * 获取去重统计信息
   */
  async getStats(): Promise<{
    bloomFilterSize: number;
    confirmedCount: number;
    estimatedFalsePositiveRate: number;
  }> {
    const confirmedCount = await this.redis.scard(this.CONFIRMED_SET_KEY);

    // 计算估计的误判率
    // P ≈ (1 - e^(-kn/m))^k
    // k = 哈希函数数量, n = 元素数量, m = 位数组大小
    const k = this.BLOOM_FILTER_HASHES;
    const n = confirmedCount;
    const m = this.BLOOM_FILTER_SIZE;
    const estimatedFalsePositiveRate = Math.pow(
      1 - Math.exp((-k * n) / m),
      k
    );

    return {
      bloomFilterSize: this.BLOOM_FILTER_SIZE,
      confirmedCount,
      estimatedFalsePositiveRate,
    };
  }
}
