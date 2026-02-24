import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere, DeepPartial, ObjectLiteral } from 'typeorm';

export interface TransactionCallback<T> {
  (queryRunner: any): Promise<T>;
}

@Injectable()
export abstract class BaseService {
  protected abstract readonly logger: Logger;

  constructor(protected readonly dataSource: DataSource) {}

  protected async withTransaction<T>(
    callback: TransactionCallback<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackError) {
        this.logger.error('Failed to rollback transaction:', rollbackError);
      }
      throw error;
    } finally {
      try {
        await queryRunner.release();
      } catch (releaseError) {
        this.logger.error('Failed to release query runner:', releaseError);
      }
    }
  }

  protected async findOrThrow<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    errorMessage: string,
  ): Promise<T> {
    const entity = await repository.findOne({ where });
    if (!entity) {
      throw new Error(errorMessage);
    }
    return entity;
  }

  protected async findOrCreate<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
    createData: DeepPartial<T>,
  ): Promise<T> {
    const entity = await repository.findOne({ where });
    if (entity) {
      return entity;
    }
    const newEntity = repository.create(createData);
    return repository.save(newEntity);
  }

  protected async batchProcess<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>,
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }
    return results;
  }

  protected logError(method: string, error: any, context?: Record<string, any>): void {
    this.logger.error(
      `${method} failed: ${error.message}`,
      JSON.stringify({ ...context, stack: error.stack }),
    );
  }

  protected logWarn(method: string, message: string, context?: Record<string, any>): void {
    this.logger.warn(
      `${method}: ${message}`,
      context ? JSON.stringify(context) : undefined,
    );
  }

  protected logInfo(method: string, message: string, context?: Record<string, any>): void {
    this.logger.log(
      `${method}: ${message}`,
      context ? JSON.stringify(context) : undefined,
    );
  }
}
