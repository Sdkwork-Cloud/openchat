/**
 * 批量操作服务
 * 提供高效的批量数据处理能力
 *
 * @framework
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 批量操作选项
 */
export interface BatchOptions {
  /** 批次大小 */
  batchSize?: number;
  /** 并发数 */
  concurrency?: number;
  /** 遇到错误是否停止 */
  stopOnError?: boolean;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 进度回调 */
  onProgress?: (processed: number, total: number) => void;
  /** 错误回调 */
  onError?: (error: Error, item: any, index: number) => void | Promise<void>;
}

/**
 * 批量操作结果
 */
export interface BatchResult<T> {
  /** 成功的项目 */
  success: T[];
  /** 失败的项目 */
  failed: Array<{
    item: any;
    index: number;
    error: Error;
  }>;
  /** 处理的总数 */
  totalProcessed: number;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 处理时间（毫秒） */
  duration: number;
  /** 平均处理时间（毫秒/项） */
  avgProcessingTime: number;
}

/**
 * 批量操作统计
 */
export interface BatchStats {
  /** 总处理数 */
  totalProcessed: number;
  /** 总成功数 */
  totalSuccess: number;
  /** 总失败数 */
  totalFailed: number;
  /** 平均批次大小 */
  avgBatchSize: number;
  /** 平均处理时间 */
  avgProcessingTime: number;
}

/**
 * 批量操作服务
 */
@Injectable()
export class BatchOperationService {
  private readonly logger = new Logger(BatchOperationService.name);
  private readonly stats: BatchStats = {
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    avgBatchSize: 0,
    avgProcessingTime: 0,
  };
  private readonly processingTimes: number[] = [];

  /**
   * 批量处理（简单版本）
   */
  async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: BatchOptions = {},
  ): Promise<BatchResult<R>> {
    const {
      batchSize = 20,
      concurrency = 1,
      stopOnError = false,
      retries = 0,
      retryDelay = 1000,
      onProgress,
      onError,
    } = options;

    const startTime = Date.now();
    const success: R[] = [];
    const failed: Array<{ item: T; index: number; error: Error }> = [];

    // 分割成批次
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    let processedCount = 0;

    // 处理批次
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * batchSize;

      // 并发处理批次中的项目
      const promises = batch.map(async (item, itemIndex) => {
        const globalIndex = batchStartIndex + itemIndex;

        try {
          const result = await this.processWithRetry(
            item,
            globalIndex,
            processor,
            retries,
            retryDelay,
          );
          success.push(result);
        } catch (error) {
          const err = error as Error;

          // 错误回调
          if (onError) {
            await onError(err, item, globalIndex);
          }

          // 记录失败
          failed.push({
            item,
            index: globalIndex,
            error: err,
          });

          // 遇到错误是否停止
          if (stopOnError) {
            throw err;
          }
        }
      });

      // 等待批次完成
      await Promise.all(promises);

      // 更新进度
      processedCount += batch.length;
      if (onProgress) {
        onProgress(processedCount, items.length);
      }
    }

    const duration = Date.now() - startTime;
    const result: BatchResult<R> = {
      success,
      failed,
      totalProcessed: processedCount,
      successCount: success.length,
      failedCount: failed.length,
      duration,
      avgProcessingTime: duration / processedCount,
    };

    // 更新统计
    this.updateStats(result);

    return result;
  }

  /**
   * 批量处理（高并发版本）
   */
  async processBatchConcurrent<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: BatchOptions & { maxConcurrency?: number } = {},
  ): Promise<BatchResult<R>> {
    const {
      maxConcurrency = 10,
      batchSize = 20,
      retries = 0,
      retryDelay = 1000,
      onProgress,
      onError,
    } = options;

    const startTime = Date.now();
    const success: R[] = [];
    const failed: Array<{ item: T; index: number; error: Error }> = [];
    const results = new Array<R | null>(items.length);

    let processedCount = 0;
    let activeCount = 0;
    let nextIndex = 0;

    return new Promise((resolve, reject) => {
      const processNext = async () => {
        while (activeCount < maxConcurrency && nextIndex < items.length) {
          const currentIndex = nextIndex++;
          const item = items[currentIndex];
          activeCount++;

          this.processWithRetry(item, currentIndex, processor, retries, retryDelay)
            .then(result => {
              results[currentIndex] = result;
              success.push(result);
            })
            .catch(error => {
              const err = error as Error;

              if (onError) {
                onError(err, item, currentIndex);
              }

              failed.push({ item, index: currentIndex, error: err });
            })
            .finally(() => {
              activeCount--;
              processedCount++;

              if (onProgress) {
                onProgress(processedCount, items.length);
              }

              if (processedCount === items.length) {
                const duration = Date.now() - startTime;
                const validResults = results.filter((r): r is R => r !== null);

                const result: BatchResult<R> = {
                  success: validResults,
                  failed,
                  totalProcessed: processedCount,
                  successCount: success.length,
                  failedCount: failed.length,
                  duration,
                  avgProcessingTime: duration / processedCount,
                };

                this.updateStats(result);
                resolve(result);
              } else {
                processNext();
              }
            });
        }
      };

      processNext();
    });
  }

  /**
   * 批量创建
   */
  async bulkCreate<T, R>(
    items: T[],
    creator: (items: T[]) => Promise<R[]>,
    options: { batchSize?: number } = {},
  ): Promise<BatchResult<R>> {
    const { batchSize = 100 } = options;
    const startTime = Date.now();
    const success: R[] = [];
    const failed: Array<{ item: T; index: number; error: Error }> = [];

    try {
      // 分批创建
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await creator(batch);
        success.push(...results);
      }
    } catch (error) {
      // 如果批量失败，尝试单个处理
      this.logger.warn('Bulk operation failed, falling back to individual processing');

      for (let i = 0; i < items.length; i++) {
        try {
          const results = await creator([items[i]]);
          success.push(...results);
        } catch (err) {
          failed.push({
            item: items[i],
            index: i,
            error: err as Error,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      success,
      failed,
      totalProcessed: items.length,
      successCount: success.length,
      failedCount: failed.length,
      duration,
      avgProcessingTime: duration / items.length,
    };
  }

  /**
   * 批量更新
   */
  async bulkUpdate<T, R>(
    items: Array<{ id: string | number; data: T }>,
    updater: (id: string | number, data: T) => Promise<R>,
    options: BatchOptions = {},
  ): Promise<BatchResult<R>> {
    return this.processBatch(
      items,
      async (item) => updater(item.id, item.data),
      options,
    );
  }

  /**
   * 批量删除
   */
  async bulkDelete(
    ids: Array<string | number>,
    deleter: (id: string | number) => Promise<void>,
    options: BatchOptions = {},
  ): Promise<BatchResult<void>> {
    return this.processBatch(
      ids,
      async (id) => deleter(id),
      options,
    );
  }

  /**
   * 分块处理大数组
   */
  async processChunks<T, R>(
    items: T[],
    processor: (chunk: T[], startIndex: number) => Promise<R[]>,
    options: { chunkSize?: number } = {},
  ): Promise<R[]> {
    const { chunkSize = 100 } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk, i);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * 流式处理
   */
  async processStream<T, R>(
    items: AsyncIterable<T> | Iterable<T>,
    processor: (item: T, index: number) => Promise<R>,
    options: { concurrency?: number; onProgress?: (processed: number) => void } = {},
  ): Promise<R[]> {
    const { concurrency = 1, onProgress } = options;
    const results: R[] = [];
    let index = 0;

    // 处理同步可迭代
    if (!(Symbol.asyncIterator in items)) {
      for (const item of items as Iterable<T>) {
        const result = await processor(item, index++);
        results.push(result);

        if (onProgress) {
          onProgress(index);
        }
      }
      return results;
    }

    // 处理异步可迭代
    const activePromises: Promise<void>[] = [];

    for await (const item of items as AsyncIterable<T>) {
      const currentIndex = index++;

      const promise = processor(item, currentIndex)
        .then(result => {
          results[currentIndex] = result;
          if (onProgress) {
            onProgress(currentIndex + 1);
          }
        })
        .catch(error => {
          this.logger.error(`Error processing item ${currentIndex}:`, error);
          throw error;
        });

      activePromises.push(promise);

      if (activePromises.length >= concurrency) {
        await Promise.race(activePromises);
        const completedIndex = activePromises.findIndex(p =>
          p === Promise.race(activePromises),
        );
        if (completedIndex !== -1) {
          activePromises.splice(completedIndex, 1);
        }
      }
    }

    await Promise.all(activePromises);
    return results.filter(r => r !== undefined);
  }

  /**
   * 获取统计信息
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    Object.assign(this.stats, {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      avgBatchSize: 0,
      avgProcessingTime: 0,
    });
    this.processingTimes.length = 0;
  }

  /**
   * 带重试的处理
   */
  private async processWithRetry<T, R>(
    item: T,
    index: number,
    processor: (item: T, index: number) => Promise<R>,
    retries: number,
    retryDelay: number,
  ): Promise<R> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await processor(item, index);
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          this.logger.warn(
            `Retry ${attempt + 1}/${retries} for item at index ${index}: ${lastError.message}`,
          );
          await this.sleep(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 更新统计
   */
  private updateStats(result: BatchResult<any>): void {
    this.stats.totalProcessed += result.totalProcessed;
    this.stats.totalSuccess += result.successCount;
    this.stats.totalFailed += result.failedCount;

    this.processingTimes.push(result.avgProcessingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    const total = this.processingTimes.reduce((a, b) => a + b, 0);
    this.stats.avgProcessingTime = total / this.processingTimes.length;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
