import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository, ObjectLiteral, DeepPartial as TypeOrmDeepPartial } from 'typeorm';
import { ConfigService } from '@nestjs/config';

interface BatchInsertOptions {
  batchSize?: number;
  chunkSize?: number;
}

interface BatchUpdateOptions {
  batchSize?: number;
  whereField?: string;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

@Injectable()
export class BatchOperationService {
  private readonly logger = new Logger(BatchOperationService.name);
  private readonly defaultBatchSize: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.defaultBatchSize = this.configService.get('BATCH_SIZE', 100);
  }

  async batchInsert<T extends ObjectLiteral>(
    repository: Repository<T>,
    entities: TypeOrmDeepPartial<T>[],
    options: BatchInsertOptions = {},
  ): Promise<number> {
    const { batchSize = this.defaultBatchSize } = options;
    let insertedCount = 0;

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      try {
        await repository
          .createQueryBuilder()
          .insert()
          .values(batch as any)
          .execute();
        
        insertedCount += batch.length;
      } catch (error) {
        this.logger.error(`Batch insert failed at batch ${Math.floor(i / batchSize)}:`, error);
        for (const entity of batch) {
          try {
            await repository.save(entity as any);
            insertedCount++;
          } catch (singleError) {
            this.logger.error('Single insert failed:', singleError);
          }
        }
      }
    }

    return insertedCount;
  }

  async batchInsertWithTransaction<T extends ObjectLiteral>(
    repository: Repository<T>,
    entities: TypeOrmDeepPartial<T>[],
    options: BatchInsertOptions = {},
  ): Promise<number> {
    const { batchSize = this.defaultBatchSize } = options;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let insertedCount = 0;

    try {
      for (let i = 0; i < entities.length; i += batchSize) {
        const batch = entities.slice(i, i + batchSize);
        
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(repository.target as any)
          .values(batch as any)
          .execute();
        
        insertedCount += batch.length;
      }

      await queryRunner.commitTransaction();
      return insertedCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Batch insert with transaction failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async batchUpdate<T extends ObjectLiteral>(
    repository: Repository<T>,
    updates: Array<{ id: string; data: TypeOrmDeepPartial<T> }>,
    options: BatchUpdateOptions = {},
  ): Promise<number> {
    const { batchSize = this.defaultBatchSize } = options;
    let updatedCount = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const ids = batch.map(u => u.id);

      try {
        await repository
          .createQueryBuilder()
          .update()
          .where('id IN (:...ids)', { ids })
          .execute();
        
        updatedCount += batch.length;
      } catch (error) {
        this.logger.error(`Batch update failed at batch ${Math.floor(i / batchSize)}:`, error);
      }
    }

    return updatedCount;
  }

  async batchDelete<T extends ObjectLiteral>(
    repository: Repository<T>,
    ids: string[],
    options: { batchSize?: number } = {},
  ): Promise<number> {
    const { batchSize = this.defaultBatchSize } = options;
    let deletedCount = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      try {
        const result = await repository.delete(batch as any);
        deletedCount += result.affected || 0;
      } catch (error) {
        this.logger.error(`Batch delete failed at batch ${Math.floor(i / batchSize)}:`, error);
      }
    }

    return deletedCount;
  }

  async batchQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    ids: string[],
    options: { batchSize?: number; idField?: string } = {},
  ): Promise<T[]> {
    const { batchSize = this.defaultBatchSize, idField = 'id' } = options;
    const results: T[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      try {
        const entities = await repository
          .createQueryBuilder('entity')
          .where(`entity.${idField} IN (:...ids)`, { ids: batch })
          .getMany();
        
        results.push(...entities);
      } catch (error) {
        this.logger.error(`Batch query failed at batch ${Math.floor(i / batchSize)}:`, error);
      }
    }

    return results;
  }

  async batchUpsert<T extends ObjectLiteral>(
    repository: Repository<T>,
    entities: TypeOrmDeepPartial<T>[],
    conflictFields: string[],
    options: BatchInsertOptions = {},
  ): Promise<number> {
    const { batchSize = this.defaultBatchSize } = options;
    let upsertedCount = 0;

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      try {
        await repository
          .createQueryBuilder()
          .insert()
          .values(batch as any)
          .orUpdate(
            Object.keys(batch[0] || {}).filter(k => !conflictFields.includes(k)) as any,
            conflictFields,
          )
          .execute();
        
        upsertedCount += batch.length;
      } catch (error) {
        this.logger.error(`Batch upsert failed at batch ${Math.floor(i / batchSize)}:`, error);
      }
    }

    return upsertedCount;
  }
}
