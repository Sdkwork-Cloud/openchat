import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

export interface BatchOperationOptions {
  batchSize: number;
  concurrency: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  continueOnError: boolean;
  transactional: boolean;
}

export interface BatchOperationResult<T, R> {
  success: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    item: T;
    success: boolean;
    result?: R;
    error?: string;
  }>;
  errors: Array<{
    item: T;
    error: string;
  }>;
  duration: number;
}

export interface BatchProcessor<T, R> {
  process(item: T, manager?: EntityManager): Promise<R>;
  validate?(item: T): Promise<boolean>;
  beforeBatch?(items: T[]): Promise<void>;
  afterBatch?(items: T[], results: BatchOperationResult<T, R>): Promise<void>;
}

const DEFAULT_OPTIONS: BatchOperationOptions = {
  batchSize: 100,
  concurrency: 5,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  continueOnError: true,
  transactional: false,
};

@Injectable()
export class BatchOperationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BatchOperationService.name);
  private readonly activeOperations = new Map<string, AbortController>();

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.logger.log('BatchOperationService initialized');
  }

  onModuleDestroy() {
    for (const [id, controller] of this.activeOperations) {
      controller.abort();
      this.logger.debug(`Aborted operation: ${id}`);
    }
  }

  async execute<T, R>(
    items: T[],
    processor: BatchProcessor<T, R>,
    options?: Partial<BatchOperationOptions>,
    operationId?: string,
  ): Promise<BatchOperationResult<T, R>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const id = operationId || this.generateOperationId();
    const startTime = Date.now();

    const abortController = new AbortController();
    this.activeOperations.set(id, abortController);

    const result: BatchOperationResult<T, R> = {
      success: true,
      total: items.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      errors: [],
      duration: 0,
    };

    try {
      if (processor.beforeBatch) {
        await processor.beforeBatch(items);
      }

      const batches = this.chunkArray(items, opts.batchSize);

      for (const batch of batches) {
        if (abortController.signal.aborted) {
          this.logger.warn(`Operation ${id} was aborted`);
          break;
        }

        const batchResults = await this.processBatch(batch, processor, opts);
        
        for (const batchResult of batchResults) {
          result.results.push(batchResult);
          result.processed++;

          if (batchResult.success) {
            result.succeeded++;
          } else {
            result.failed++;
            result.errors.push({
              item: batchResult.item,
              error: batchResult.error || 'Unknown error',
            });
          }
        }
      }

      if (processor.afterBatch) {
        await processor.afterBatch(items, result);
      }

      result.success = result.failed === 0;
      result.duration = Date.now() - startTime;

      this.logger.log(
        `Batch operation ${id} completed: ${result.succeeded}/${result.total} succeeded in ${result.duration}ms`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Batch operation ${id} failed:`, error);
      result.success = false;
      result.duration = Date.now() - startTime;
      return result;
    } finally {
      this.activeOperations.delete(id);
    }
  }

  async executeTransactional<T, R>(
    items: T[],
    processor: BatchProcessor<T, R>,
    options?: Partial<BatchOperationOptions>,
  ): Promise<BatchOperationResult<T, R>> {
    const opts = { ...DEFAULT_OPTIONS, ...options, transactional: true };
    return this.execute(items, processor, opts);
  }

  async executeParallel<T, R>(
    items: T[],
    processor: BatchProcessor<T, R>,
    options?: Partial<BatchOperationOptions>,
  ): Promise<BatchOperationResult<T, R>> {
    const opts = { ...DEFAULT_OPTIONS, ...options, concurrency: 10 };
    return this.execute(items, processor, opts);
  }

  abort(operationId: string): boolean {
    const controller = this.activeOperations.get(operationId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }

  private async processBatch<T, R>(
    batch: T[],
    processor: BatchProcessor<T, R>,
    options: BatchOperationOptions,
  ): Promise<Array<{ item: T; success: boolean; result?: R; error?: string }>> {
    const results: Array<{ item: T; success: boolean; result?: R; error?: string }> = [];

    if (options.transactional) {
      return this.processBatchTransactional(batch, processor, options);
    }

    const chunks = this.chunkArray(batch, options.concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item) => this.processItem(item, processor, options)),
      );
      results.push(...chunkResults);
    }

    return results;
  }

  private async processBatchTransactional<T, R>(
    batch: T[],
    processor: BatchProcessor<T, R>,
    options: BatchOperationOptions,
  ): Promise<Array<{ item: T; success: boolean; result?: R; error?: string }>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const results: Array<{ item: T; success: boolean; result?: R; error?: string }> = [];

    try {
      for (const item of batch) {
        const result = await this.processItem(item, processor, options, queryRunner.manager);
        results.push(result);

        if (!result.success && !options.continueOnError) {
          throw new Error(`Processing failed: ${result.error}`);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back:', error);

      for (const result of results) {
        if (result.success) {
          result.success = false;
          result.error = 'Transaction rolled back';
        }
      }
    } finally {
      await queryRunner.release();
    }

    return results;
  }

  private async processItem<T, R>(
    item: T,
    processor: BatchProcessor<T, R>,
    options: BatchOperationOptions,
    manager?: EntityManager,
  ): Promise<{ item: T; success: boolean; result?: R; error?: string }> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= options.retryAttempts; attempt++) {
      try {
        if (processor.validate) {
          const valid = await processor.validate(item);
          if (!valid) {
            return {
              item,
              success: false,
              error: 'Validation failed',
            };
          }
        }

        const result = await processor.process(item, manager);

        return {
          item,
          success: true,
          result,
        };
      } catch (error: any) {
        lastError = error;

        if (attempt < options.retryAttempts) {
          await this.sleep(options.retryDelay * Math.pow(2, attempt));
          this.logger.debug(`Retrying item (attempt ${attempt + 1}): ${error.message}`);
        }
      }
    }

    return {
      item,
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateOperationId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createBatchProcessor<T, R>(
  processFn: (item: T, manager?: EntityManager) => Promise<R>,
  options?: {
    validate?: (item: T) => Promise<boolean>;
    beforeBatch?: (items: T[]) => Promise<void>;
    afterBatch?: (items: T[], results: BatchOperationResult<T, R>) => Promise<void>;
  },
): BatchProcessor<T, R> {
  return {
    process: processFn,
    validate: options?.validate,
    beforeBatch: options?.beforeBatch,
    afterBatch: options?.afterBatch,
  };
}
