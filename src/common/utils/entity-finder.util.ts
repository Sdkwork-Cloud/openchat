import { Injectable, Logger } from '@nestjs/common';
import { Repository, FindOptionsWhere, DeepPartial, FindManyOptions, ObjectLiteral } from 'typeorm';

export interface FindResult<T> {
  entity: T | null;
  found: boolean;
}

@Injectable()
export class EntityFinder {
  private readonly logger = new Logger(EntityFinder.name);

  async findOneOrThrow<T extends ObjectLiteral>(
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

  async findOneOrNull<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<T | null> {
    return repository.findOne({ where });
  }

  async findMany<T extends ObjectLiteral>(
    repository: Repository<T>,
    options: FindManyOptions<T>,
  ): Promise<T[]> {
    return repository.find(options);
  }

  async exists<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<boolean> {
    const count = await repository.count({ where });
    return count > 0;
  }

  async findOrCreate<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
    createData: DeepPartial<T>,
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await repository.findOne({ where });
    if (existing) {
      return { entity: existing, created: false };
    }
    const newEntity = repository.create(createData);
    const saved = await repository.save(newEntity);
    return { entity: saved, created: true };
  }

  async findAndUpdate<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
    updateData: DeepPartial<T>,
  ): Promise<T | null> {
    const entity = await repository.findOne({ where });
    if (!entity) {
      return null;
    }
    Object.assign(entity, updateData);
    return repository.save(entity);
  }

  async findAndDelete<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
  ): Promise<boolean> {
    const result = await repository.delete(where as any);
    return (result.affected || 0) > 0;
  }

  async batchFind<T extends ObjectLiteral>(
    repository: Repository<T>,
    ids: string[],
    idField: string = 'id',
  ): Promise<Map<string, T>> {
    const entities = await repository.find({
      where: ids.map(id => ({ [idField]: id })) as any,
    });
    return new Map(entities.map(e => [(e as any)[idField], e]));
  }
}
