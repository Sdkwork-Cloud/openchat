import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';

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
  private readonly CONFIRMED_SET_KEY_PREFIX = 'message:confirmed:set';

  // 客户端序列号过期时间（24小时）
  private readonly CLIENT_SEQ_TTL = 86400;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
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
    const exists = await this.redis.sismember(this.getConfirmedSetKey(userId), String(clientSeq));
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
      }
    }

    const pendingConfirmedChecks = clientSeqs.filter((seq) => !results.has(seq));
    if (pendingConfirmedChecks.length > 0) {
      const confirmPipeline = this.redis.pipeline();
      const confirmedSetKey = this.getConfirmedSetKey(userId);
      pendingConfirmedChecks.forEach((seq) => {
        confirmPipeline.sismember(confirmedSetKey, String(seq));
      });
      const confirmedResults = await confirmPipeline.exec();

      if (confirmedResults) {
        pendingConfirmedChecks.forEach((seq, index) => {
          const [error, exists] = confirmedResults[index];
          results.set(seq, !error && exists === 1);
        });
      } else {
        pendingConfirmedChecks.forEach((seq) => results.set(seq, false));
      }
    }

    return results;
  }

  /**
   * 标记消息已处理
   */
  async markAsProcessed(clientSeq: number, userId: string): Promise<void> {
    const messageId = this.generateMessageId(clientSeq, userId);
    const confirmedSetKey = this.getConfirmedSetKey(userId);

    // 1. 添加到 Bloom Filter
    await this.bloomFilterAdd(messageId);

    // 2. 添加到确认集合（带过期时间）
    await this.redis.sadd(confirmedSetKey, String(clientSeq));
    await this.redis.expire(confirmedSetKey, this.CLIENT_SEQ_TTL);
  }

  /**
   * 批量标记消息已处理
   * 使用 Pipeline 提高性能
   */
  async markAsProcessedBatch(clientSeqs: number[], userId: string): Promise<void> {
    if (clientSeqs.length === 0) return;

    const pipeline = this.redis.pipeline();
    const confirmedSetKey = this.getConfirmedSetKey(userId);

    for (const clientSeq of clientSeqs) {
      const messageId = this.generateMessageId(clientSeq, userId);

      // 添加到 Bloom Filter
      const positions = this.getHashPositions(messageId);
      for (const pos of positions) {
        pipeline.setbit(this.BLOOM_FILTER_KEY, pos, 1);
      }

      // 添加到确认集合
      pipeline.sadd(confirmedSetKey, String(clientSeq));
    }

    // 更新过期时间
    pipeline.expire(confirmedSetKey, this.CLIENT_SEQ_TTL);

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
    const confirmedSetKey = this.getConfirmedSetKey(userId);

    // 1. 记录到事务临时集合
    await this.redis.sadd(txKey, messageId);
    await this.redis.expire(txKey, 300); // 5分钟过期

    // 2. 添加到 Bloom Filter
    await this.bloomFilterAdd(messageId);

    // 3. 添加到确认集合
    await this.redis.sadd(confirmedSetKey, String(clientSeq));
    await this.redis.expire(confirmedSetKey, this.CLIENT_SEQ_TTL);
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
      const groupedClientSeqs = new Map<string, string[]>();
      messageIds.forEach((messageId) => {
        const parsed = this.parseMessageId(messageId);
        if (!parsed) {
          return;
        }
        const key = this.getConfirmedSetKey(parsed.userId);
        const existing = groupedClientSeqs.get(key) || [];
        existing.push(parsed.clientSeq);
        groupedClientSeqs.set(key, existing);
      });

      if (groupedClientSeqs.size > 0) {
        const pipeline = this.redis.pipeline();
        groupedClientSeqs.forEach((clientSeqs, key) => {
          pipeline.srem(key, ...clientSeqs);
        });
        await pipeline.exec();
      }
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
    const confirmedCount = await this.countConfirmedMembers();
    if (confirmedCount === 0) {
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

    const confirmedSetKeys = await this.scanConfirmedSetKeys();
    for (const confirmedSetKey of confirmedSetKeys) {
      const userId = this.resolveUserIdFromConfirmedSetKey(confirmedSetKey);
      if (!userId) {
        continue;
      }

      let cursor = '0';
      do {
        const [nextCursor, members] = await this.redis.sscan(confirmedSetKey, cursor, 'COUNT', 1000);
        cursor = nextCursor;
        if (members.length === 0) {
          continue;
        }

        await this.bloomFilterAddBatch(members.map((member) => `${userId}:${member}`));
      } while (cursor !== '0');
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
    const confirmedCount = await this.countConfirmedMembers();

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

  private getConfirmedSetKey(userId: string): string {
    return `${this.CONFIRMED_SET_KEY_PREFIX}:${userId}`;
  }

  private parseMessageId(messageId: string): { userId: string; clientSeq: string } | null {
    const delimiterIndex = messageId.lastIndexOf(':');
    if (delimiterIndex <= 0 || delimiterIndex >= messageId.length - 1) {
      return null;
    }

    return {
      userId: messageId.slice(0, delimiterIndex),
      clientSeq: messageId.slice(delimiterIndex + 1),
    };
  }

  private resolveUserIdFromConfirmedSetKey(confirmedSetKey: string): string | null {
    const prefix = `${this.CONFIRMED_SET_KEY_PREFIX}:`;
    if (!confirmedSetKey.startsWith(prefix) || confirmedSetKey.length <= prefix.length) {
      return null;
    }
    return confirmedSetKey.slice(prefix.length);
  }

  private async scanConfirmedSetKeys(): Promise<string[]> {
    const pattern = `${this.CONFIRMED_SET_KEY_PREFIX}:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batchKeys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      if (batchKeys.length > 0) {
        keys.push(...batchKeys);
      }
    } while (cursor !== '0');

    return keys;
  }

  private async countConfirmedMembers(): Promise<number> {
    const confirmedSetKeys = await this.scanConfirmedSetKeys();
    if (confirmedSetKeys.length === 0) {
      return 0;
    }

    const pipeline = this.redis.pipeline();
    confirmedSetKeys.forEach((key) => pipeline.scard(key));
    const results = await pipeline.exec();
    if (!results) {
      return 0;
    }

    let total = 0;
    results.forEach(([error, count]) => {
      if (!error) {
        total += Number(count) || 0;
      }
    });
    return total;
  }

  private async bloomFilterAddBatch(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();
    messageIds.forEach((messageId) => {
      const positions = this.getHashPositions(messageId);
      positions.forEach((pos) => {
        pipeline.setbit(this.BLOOM_FILTER_KEY, pos, 1);
      });
    });
    await pipeline.exec();
  }
}
