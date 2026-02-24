import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  DataSource,
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  DeepPartial,
  ObjectLiteral,
  SelectQueryBuilder,
  FindOptionsOrder,
  In,
  EntityManager,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { EventBusService, EventTypeConstants, EventPriority } from '../events/event-bus.service';
import { CacheService } from '../services/cache.service';
import { PaginationDto, CursorPaginationDto, CursorResponseDto } from '../dto/pagination.dto';
import { PagedResponseDto } from '../dto/response.dto';

export interface FindAllOptions<T> {
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  relations?: string[];
  order?: FindOptionsOrder<T>;
  select?: (keyof T)[];
}

export interface BulkOperationResult<T> {
  success: T[];
  failed: Array<{ data: DeepPartial<T>; error: string }>;
  totalProcessed: number;
}

export interface ServiceOptions {
  enableAudit?: boolean;
  enableCache?: boolean;
  cacheTtl?: number;
  softDelete?: boolean;
  maxBatchSize?: number;
  enableEvents?: boolean;
}

@Injectable()
export abstract class BaseEntityService<T extends BaseEntity & ObjectLiteral> {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;
  protected readonly options: ServiceOptions = {
    enableAudit: false,
    enableCache: false,
    cacheTtl: 300,
    softDelete: true,
    maxBatchSize: 100,
    enableEvents: true,
  };

  protected readonly eventBus?: EventBusService;
  protected readonly cacheService?: CacheService;

  constructor(
    protected readonly dataSource: DataSource,
    protected readonly repository: Repository<T>,
    eventBus?: EventBusService,
    cacheService?: CacheService,
  ) {
    this.eventBus = eventBus;
    this.cacheService = cacheService;
  }

  async create(dto: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(dto);
    const saved = await this.repository.save(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.created`, { entity: saved });
    await this.invalidateCache(saved.id);
    
    return saved;
  }

  async createMany(dtos: DeepPartial<T>[]): Promise<BulkOperationResult<T>> {
    const batchSize = this.options.maxBatchSize || 100;
    const success: T[] = [];
    const failed: Array<{ data: DeepPartial<T>; error: string }> = [];

    for (let i = 0; i < dtos.length; i += batchSize) {
      const batch = dtos.slice(i, i + batchSize);
      
      try {
        const entities = this.repository.create(batch);
        const saved = await this.repository.save(entities);
        success.push(...saved);
      } catch (error) {
        for (const dto of batch) {
          try {
            const entity = this.repository.create(dto);
            const saved = await this.repository.save(entity);
            success.push(saved);
          } catch (err) {
            failed.push({ data: dto, error: (err as Error).message });
          }
        }
      }
    }

    return {
      success,
      failed,
      totalProcessed: success.length + failed.length,
    };
  }

  async findOne(id: string, options?: { relations?: string[] }): Promise<T | null> {
    const cacheKey = `${this.entityName.toLowerCase()}:${id}`;
    
    if (this.options.enableCache && this.cacheService) {
      const cached = await this.cacheService.get<T>(cacheKey);
      if (cached) return cached;
    }

    const where = { id } as FindOptionsWhere<T>;
    
    if (this.options.softDelete) {
      (where as any).isDeleted = false;
    }

    const entity = await this.repository.findOne({
      where,
      relations: options?.relations,
    });

    if (entity && this.options.enableCache && this.cacheService) {
      await this.cacheService.set(cacheKey, entity, { ttl: this.options.cacheTtl });
    }

    return entity;
  }

  async findOneOrFail(id: string, options?: { relations?: string[] }): Promise<T> {
    const entity = await this.findOne(id, options);
    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with id: ${id}`,
      );
    }
    return entity;
  }

  async findOneByUuid(uuid: string, options?: { relations?: string[] }): Promise<T | null> {
    const where = { uuid } as FindOptionsWhere<T>;
    
    if (this.options.softDelete) {
      (where as any).isDeleted = false;
    }

    return this.repository.findOne({
      where,
      relations: options?.relations,
    });
  }

  async findOneByUuidOrFail(uuid: string, options?: { relations?: string[] }): Promise<T> {
    const entity = await this.findOneByUuid(uuid, options);
    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with uuid: ${uuid}`,
      );
    }
    return entity;
  }

  async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[], options?: { relations?: string[] }): Promise<T | null> {
    if (this.options.softDelete && !this.hasIsDeletedCondition(where)) {
      where = this.addIsDeletedCondition(where);
    }

    return this.repository.findOne({
      where,
      relations: options?.relations,
    });
  }

  async findAll(options?: FindAllOptions<T>): Promise<T[]> {
    const findOptions: FindManyOptions<T> = {};
    
    if (options?.where) {
      findOptions.where = this.options.softDelete 
        ? this.addIsDeletedCondition(options.where)
        : options.where;
    } else if (this.options.softDelete) {
      findOptions.where = { isDeleted: false } as FindOptionsWhere<T>;
    }
    
    if (options?.relations) findOptions.relations = options.relations;
    if (options?.order) findOptions.order = options.order as any;
    if (options?.select) findOptions.select = options.select as any;

    return this.repository.find(findOptions);
  }

  async findWithPagination(
    pagination: PaginationDto,
    options?: FindAllOptions<T>,
  ): Promise<PagedResponseDto<T>> {
    const where = this.options.softDelete && options?.where
      ? this.addIsDeletedCondition(options.where)
      : this.options.softDelete
        ? { isDeleted: false } as FindOptionsWhere<T>
        : options?.where;

    const [list, total] = await this.repository.findAndCount({
      where,
      relations: options?.relations,
      order: options?.order as any,
      skip: pagination.offset,
      take: pagination.limit,
    });

    return PagedResponseDto.create(list, { page: pagination.page, pageSize: pagination.pageSize, total });
  }

  async findWithCursor(
    pagination: CursorPaginationDto,
    cursorField: string = 'id',
    options?: FindAllOptions<T>,
  ): Promise<CursorResponseDto<T>> {
    const qb = this.repository.createQueryBuilder('entity');

    if (this.options.softDelete) {
      qb.where('entity.isDeleted = :isDeleted', { isDeleted: false });
    }

    if (options?.where) {
      if (this.options.softDelete) {
        qb.andWhere(options.where as any);
      } else {
        qb.where(options.where as any);
      }
    }
    
    if (options?.relations) {
      options.relations.forEach(relation => {
        qb.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    if (pagination.cursor) {
      qb.andWhere(`entity.${cursorField} > :cursor`, { cursor: pagination.cursor });
    }

    qb.orderBy(`entity.${cursorField}`, 'ASC')
      .take(pagination.limit + 1);

    const entities = await qb.getMany();
    const hasMore = entities.length > pagination.limit;
    const list = hasMore ? entities.slice(0, -1) : entities;
    const nextCursor = hasMore ? (list[list.length - 1]?.[cursorField as keyof T] as string) : undefined;

    return CursorResponseDto.create(list, nextCursor);
  }

  async update(id: string, dto: DeepPartial<T>): Promise<T> {
    const entity = await this.findOneOrFail(id);
    const previousValues = { ...entity };
    
    Object.assign(entity, dto);
    const updated = await this.repository.save(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.updated`, {
      entity: updated,
      changes: dto,
      previousValues,
    });
    await this.invalidateCache(id);
    
    return updated;
  }

  async updateMany(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    dto: DeepPartial<T>,
  ): Promise<number> {
    const result = await this.repository.update(where as any, dto as any);
    return result.affected || 0;
  }

  async upsert(
    where: FindOptionsWhere<T>,
    dto: DeepPartial<T>,
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.findOneBy(where);
    
    if (existing) {
      Object.assign(existing, dto);
      const updated = await this.repository.save(existing);
      
      this.emitEvent(`${this.entityName.toLowerCase()}.updated`, {
        entity: updated,
        changes: dto,
      });
      await this.invalidateCache(existing.id);
      
      return { entity: updated, created: false };
    }

    const entity = this.repository.create({ ...where, ...dto } as DeepPartial<T>);
    const created = await this.repository.save(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.created`, { entity: created });
    await this.invalidateCache(created.id);
    
    return { entity: created, created: true };
  }

  async remove(id: string): Promise<void> {
    if (this.options.softDelete) {
      await this.softRemove(id);
    } else {
      const entity = await this.findOneOrFail(id);
      await this.repository.remove(entity);
      
      this.emitEvent(`${this.entityName.toLowerCase()}.deleted`, { entity });
      await this.invalidateCache(id);
    }
  }

  async softRemove(id: string): Promise<void> {
    const result = await this.repository.update(id as any, { isDeleted: true } as any);
    if (result.affected === 0) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with id: ${id}`,
      );
    }
    
    this.emitEvent(`${this.entityName.toLowerCase()}.soft_deleted`, { id });
    await this.invalidateCache(id);
  }

  async restore(id: string): Promise<T> {
    const result = await this.repository.update(id as any, { isDeleted: false } as any);
    if (result.affected === 0) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with id: ${id}`,
      );
    }
    
    const restored = await this.findOneOrFail(id);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.restored`, { entity: restored });
    await this.invalidateCache(id);
    
    return restored;
  }

  async permanentRemove(id: string): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      withDeleted: true,
    });
    
    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with id: ${id}`,
      );
    }
    
    await this.repository.remove(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.permanently_deleted`, { entity });
    await this.invalidateCache(id);
  }

  async exists(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<boolean> {
    const queryWhere = this.options.softDelete 
      ? this.addIsDeletedCondition(where)
      : where;
    const count = await this.repository.count({ where: queryWhere });
    return count > 0;
  }

  async count(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<number> {
    const queryWhere = this.options.softDelete && where
      ? this.addIsDeletedCondition(where)
      : this.options.softDelete
        ? { isDeleted: false } as FindOptionsWhere<T>
        : where;
    return this.repository.count({ where: queryWhere });
  }

  async findByIds(ids: string[], options?: { relations?: string[] }): Promise<T[]> {
    if (ids.length === 0) return [];
    
    const where: any = { id: In(ids) };
    if (this.options.softDelete) {
      where.isDeleted = false;
    }

    return this.repository.find({
      where,
      relations: options?.relations,
    });
  }

  async transaction<R>(callback: (manager: EntityManager) => Promise<R>): Promise<R> {
    return this.dataSource.transaction(callback);
  }

  protected async withTransaction<R>(
    callback: (manager: EntityManager) => Promise<R>,
  ): Promise<R> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  protected createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository.createQueryBuilder(alias);
  }

  protected emitEvent(type: string, payload: any): void {
    if (this.options.enableEvents && this.eventBus) {
      this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, { ...payload, type }, {
        priority: EventPriority.MEDIUM,
        source: this.entityName,
      });
    }
  }

  protected async invalidateCache(id: string): Promise<void> {
    if (this.options.enableCache && this.cacheService) {
      const cacheKey = `${this.entityName.toLowerCase()}:${id}`;
      await this.cacheService.delete(cacheKey).catch(err => {
        this.logger.warn(`Failed to invalidate cache: ${err.message}`);
      });
    }
  }

  private hasIsDeletedCondition(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): boolean {
    if (Array.isArray(where)) {
      return where.some(w => 'isDeleted' in w);
    }
    return 'isDeleted' in where;
  }

  private addIsDeletedCondition(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (Array.isArray(where)) {
      return where.map(w => ({ ...w, isDeleted: false } as FindOptionsWhere<T>));
    }
    return { ...where, isDeleted: false } as FindOptionsWhere<T>;
  }
}
