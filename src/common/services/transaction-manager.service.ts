import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';

export type IsolationLevel = 
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  timeout?: number;
  readOnly?: boolean;
  name?: string;
}

export interface TransactionContext {
  id: string;
  name?: string;
  startTime: number;
  queryRunner: QueryRunner;
  manager: EntityManager;
}

export interface TransactionResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
}

export type TransactionCallback<T> = (manager: EntityManager, context: TransactionContext) => Promise<T>;

@Injectable()
export class TransactionManager implements OnModuleDestroy {
  private readonly logger = new Logger(TransactionManager.name);
  private readonly activeTransactions = new Map<string, TransactionContext>();
  private readonly defaultTimeout: number;
  private readonly defaultIsolationLevel: IsolationLevel;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.defaultTimeout = this.configService.get<number>('TRANSACTION_TIMEOUT', 30000);
    this.defaultIsolationLevel = this.configService.get<IsolationLevel>(
      'TRANSACTION_ISOLATION_LEVEL',
      'READ COMMITTED',
    );
  }

  async onModuleDestroy() {
    this.logger.log('Cleaning up active transactions...');

    for (const [id, context] of this.activeTransactions) {
      try {
        if (context.queryRunner.isTransactionActive) {
          await context.queryRunner.rollbackTransaction();
          this.logger.warn(`Rolled back transaction: ${id}`);
        }
        await context.queryRunner.release();
      } catch (error) {
        this.logger.error(`Failed to cleanup transaction ${id}:`, error);
      }
    }

    this.activeTransactions.clear();
  }

  async execute<T>(
    callback: TransactionCallback<T>,
    options?: TransactionOptions,
  ): Promise<TransactionResult<T>> {
    const context = await this.createContext(options);

    try {
      await context.queryRunner.startTransaction(options?.isolationLevel || this.defaultIsolationLevel);

      const timeout = options?.timeout || this.defaultTimeout;
      const result = await this.executeWithTimeout(
        callback(context.manager, context),
        timeout,
        context.id,
      );

      await context.queryRunner.commitTransaction();

      const duration = Date.now() - context.startTime;
      this.logger.debug(`Transaction ${context.id} committed in ${duration}ms`);

      return {
        success: true,
        result,
        duration,
      };
    } catch (error: any) {
      await context.queryRunner.rollbackTransaction();

      const duration = Date.now() - context.startTime;
      this.logger.error(`Transaction ${context.id} rolled back after ${duration}ms:`, error);

      return {
        success: false,
        error,
        duration,
      };
    } finally {
      await this.releaseContext(context);
    }
  }

  async executeWithRetry<T>(
    callback: TransactionCallback<T>,
    options?: TransactionOptions & { maxRetries?: number; retryDelay?: number },
  ): Promise<TransactionResult<T>> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 100;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.execute(callback, options);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (this.isRetryableError(result.error)) {
        this.logger.debug(`Retrying transaction (attempt ${attempt + 1}/${maxRetries})`);
        await this.sleep(retryDelay * Math.pow(2, attempt));
      } else {
        break;
      }
    }

    return {
      success: false,
      error: lastError,
      duration: 0,
    };
  }

  async executeNested<T>(
    parentContext: TransactionContext,
    callback: TransactionCallback<T>,
    options?: TransactionOptions,
  ): Promise<TransactionResult<T>> {
    const savepointName = `savepoint_${Date.now()}`;

    try {
      await parentContext.queryRunner.query(`SAVEPOINT ${savepointName}`);

      const result = await callback(parentContext.manager, parentContext);

      await parentContext.queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);

      return {
        success: true,
        result,
        duration: 0,
      };
    } catch (error: any) {
      await parentContext.queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);

      return {
        success: false,
        error,
        duration: 0,
      };
    }
  }

  async executeParallel<T>(
    callbacks: Array<{ callback: TransactionCallback<T>; options?: TransactionOptions }>,
  ): Promise<TransactionResult<T>[]> {
    return Promise.all(
      callbacks.map(({ callback, options }) => this.execute(callback, options)),
    );
  }

  async executeSequential<T>(
    callbacks: Array<{ callback: TransactionCallback<T>; options?: TransactionOptions }>,
  ): Promise<TransactionResult<T>[]> {
    const results: TransactionResult<T>[] = [];

    for (const { callback, options } of callbacks) {
      const result = await this.execute(callback, options);
      results.push(result);

      if (!result.success) {
        break;
      }
    }

    return results;
  }

  getActiveTransactions(): Array<{ id: string; name?: string; duration: number }> {
    return Array.from(this.activeTransactions.values()).map((ctx) => ({
      id: ctx.id,
      name: ctx.name,
      duration: Date.now() - ctx.startTime,
    }));
  }

  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  private async createContext(options?: TransactionOptions): Promise<TransactionContext> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    const context: TransactionContext = {
      id: this.generateTransactionId(),
      name: options?.name,
      startTime: Date.now(),
      queryRunner,
      manager: queryRunner.manager,
    };

    this.activeTransactions.set(context.id, context);
    return context;
  }

  private async releaseContext(context: TransactionContext): Promise<void> {
    this.activeTransactions.delete(context.id);

    if (!context.queryRunner.isReleased) {
      await context.queryRunner.release();
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    transactionId: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Transaction ${transactionId} timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private isRetryableError(error: Error | undefined): boolean {
    if (!error) return false;

    const retryableMessages = [
      'deadlock',
      'lock wait timeout',
      'connection lost',
      'connection timeout',
      'SERIALIZATION_FAILURE',
    ];

    const message = error.message.toLowerCase();
    return retryableMessages.some((msg) => message.includes(msg.toLowerCase()));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function Transactional(options?: TransactionOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const transactionManager = (this as any).transactionManager as TransactionManager;

      if (!transactionManager) {
        return originalMethod.apply(this, args);
      }

      const result = await transactionManager.execute(
        async (manager) => {
          return originalMethod.apply(this, [...args, manager]);
        },
        options,
      );

      if (!result.success) {
        throw result.error;
      }

      return result.result;
    };

    return descriptor;
  };
}
