import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository, FindOptionsWhere } from 'typeorm';
import { EventBusService, EventType } from '../events/event-bus.service';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { buildCacheKey, CacheTTL } from '../decorators/cache.decorator';

export interface DomainEvent {
  type: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface DomainEntity {
  id: string;
  uuid?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Specification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(entity: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }
}

class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }
}

class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(entity: T): boolean {
    return !this.spec.isSatisfiedBy(entity);
  }
}

@Injectable()
export abstract class DomainService<T extends DomainEntity> implements OnModuleInit {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;
  protected abstract readonly cachePrefix: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly dataSource: DataSource,
    protected readonly repository: Repository<T>,
    protected readonly eventBus: EventBusService,
    protected readonly cacheService: CacheService,
    protected readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  onModuleInit() {
    this.logger.debug(`${this.entityName} DomainService initialized`);
  }

  protected async findById(id: string, useCache: boolean = true): Promise<T | null> {
    if (useCache) {
      const cacheKey = buildCacheKey(this.cachePrefix, id);
      const cached = await this.cacheService.get<T>(cacheKey);
      if (cached) return cached;
    }

    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });

    if (entity && useCache) {
      await this.cacheService.set(
        buildCacheKey(this.cachePrefix, id),
        entity,
        { ttl: CacheTTL.MEDIUM },
      );
    }

    return entity;
  }

  protected async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found: ${id}`,
      );
    }
    return entity;
  }

  protected async save(entity: T, manager?: EntityManager): Promise<T> {
    const repo = manager ? manager.getRepository(this.repository.target) : this.repository;
    const saved = await repo.save(entity);

    await this.emitDomainEvent('saved', saved);

    await this.invalidateCache(saved.id);

    return saved;
  }

  protected async remove(id: string, manager?: EntityManager): Promise<void> {
    const entity = await this.findByIdOrFail(id);
    const repo = manager ? manager.getRepository(this.repository.target) : this.repository;

    await repo.remove(entity);

    await this.emitDomainEvent('removed', entity);

    await this.invalidateCache(id);
  }

  protected async emitDomainEvent(
    action: string,
    entity: T,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const event: DomainEvent = {
      type: `${this.entityName.toLowerCase()}.${action}`,
      aggregateId: entity.id,
      aggregateType: this.entityName,
      payload: entity,
      metadata,
      timestamp: Date.now(),
    };

    await this.eventBus.publish(EventType.CUSTOM_EVENT, event);
  }

  protected async invalidateCache(id: string): Promise<void> {
    await this.cacheInvalidationService.invalidate({
      entityType: this.cachePrefix,
      entityId: id,
      operation: 'update',
    });
  }

  protected async withTransaction<R>(
    work: (manager: EntityManager) => Promise<R>,
  ): Promise<R> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  protected async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  protected async count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where });
  }

  protected validateSpecification(entity: T, spec: Specification<T>): boolean {
    return spec.isSatisfiedBy(entity);
  }

  protected validateSpecificationOrFail(entity: T, spec: Specification<T>, message?: string): void {
    if (!spec.isSatisfiedBy(entity)) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_FAILED,
        message || 'Specification not satisfied',
      );
    }
  }
}

export interface RepositoryInterface<T> {
  findById(id: string): Promise<T | null>;
  findByIds(ids: string[]): Promise<T[]>;
  save(entity: Partial<T>): Promise<T>;
  saveMany(entities: Partial<T>[]): Promise<T[]>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(filter?: any): Promise<number>;
}

export abstract class BaseRepository<T extends DomainEntity> implements RepositoryInterface<T> {
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly cacheService: CacheService,
    protected readonly cachePrefix: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async findById(id: string): Promise<T | null> {
    const cacheKey = buildCacheKey(this.cachePrefix, id);
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });

    if (entity) {
      await this.cacheService.set(cacheKey, entity, { ttl: CacheTTL.MEDIUM });
    }

    return entity;
  }

  async findByIds(ids: string[]): Promise<T[]> {
    const entities: T[] = [];
    const missingIds: string[] = [];

    for (const id of ids) {
      const cached = await this.cacheService.get<T>(buildCacheKey(this.cachePrefix, id));
      if (cached) {
        entities.push(cached);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      const found = await this.repository.findByIds(missingIds);
      entities.push(...found);

      for (const entity of found) {
        await this.cacheService.set(
          buildCacheKey(this.cachePrefix, entity.id),
          entity,
          { ttl: CacheTTL.MEDIUM },
        );
      }
    }

    return entities;
  }

  async save(entity: Partial<T>): Promise<T> {
    const saved = await this.repository.save(entity as any);
    await this.cacheService.set(
      buildCacheKey(this.cachePrefix, saved.id),
      saved,
      { ttl: CacheTTL.MEDIUM },
    );
    return saved;
  }

  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    const saved = await this.repository.save(entities as any[]);
    await Promise.all(
      saved.map((entity) =>
        this.cacheService.set(
          buildCacheKey(this.cachePrefix, entity.id),
          entity,
          { ttl: CacheTTL.MEDIUM },
        ),
      ),
    );
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await this.cacheService.delete(buildCacheKey(this.cachePrefix, id));
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.repository.delete(ids);
    await Promise.all(
      ids.map((id) => this.cacheService.delete(buildCacheKey(this.cachePrefix, id))),
    );
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id } as FindOptionsWhere<T>,
    });
    return count > 0;
  }

  async count(filter?: any): Promise<number> {
    return this.repository.count({ where: filter });
  }
}

export function createSpecification<T>(
  predicate: (entity: T) => boolean,
): Specification<T> {
  return new (class extends BaseSpecification<T> {
    isSatisfiedBy(entity: T): boolean {
      return predicate(entity);
    }
  })();
}
