import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  DataSource,
  Repository,
  FindOptionsWhere,
  DeepPartial,
  ObjectLiteral,
  EntityManager,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { EventBusService, EventTypeConstants, EventPriority } from '../events/event-bus.service';
import { CacheService } from '../services/cache.service';
import { PaginationDto, CursorPaginationDto } from '../dto/pagination.dto';
import { PagedResponseDto, CursorResponseDto } from '../dto/response.dto';

export interface OwnedEntity {
  ownerId: string;
}

export interface OwnershipCheckOptions {
  allowAdmin?: boolean;
  allowRoles?: string[];
}

export interface FindOwnedOptions {
  ownerId: string;
  includeShared?: boolean;
}

@Injectable()
export abstract class OwnedEntityService<T extends BaseEntity & ObjectLiteral & OwnedEntity> {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;
  protected abstract readonly eventBus?: EventBusService;
  protected abstract readonly cacheService?: CacheService;
  protected readonly cacheTtl: number = 300;

  constructor(
    protected readonly dataSource: DataSource,
    protected readonly repository: Repository<T>,
  ) {}

  async create(dto: DeepPartial<T>, ownerId: string): Promise<T> {
    const entity = this.repository.create({ ...dto, ownerId });
    const saved = await this.repository.save(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.created`, saved);
    this.invalidateCache(saved.id);
    
    return saved;
  }

  async findOneById(id: string, options?: { relations?: string[] }): Promise<T | null> {
    const cacheKey = `${this.entityName.toLowerCase()}:${id}`;
    
    if (this.cacheService) {
      const cached = await this.cacheService.get<T>(cacheKey);
      if (cached) return cached;
    }

    const entity = await this.repository.findOne({
      where: { id, isDeleted: false } as FindOptionsWhere<T>,
      relations: options?.relations,
    });

    if (entity && this.cacheService) {
      await this.cacheService.set(cacheKey, entity, { ttl: this.cacheTtl });
    }

    return entity;
  }

  async findOneByIdOrFail(id: string, options?: { relations?: string[] }): Promise<T> {
    const entity = await this.findOneById(id, options);
    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with id: ${id}`,
      );
    }
    return entity;
  }

  async findOneByIdAndOwner(
    id: string,
    ownerId: string,
    options?: OwnershipCheckOptions,
  ): Promise<T> {
    const entity = await this.findOneByIdOrFail(id);
    
    if (entity.ownerId !== ownerId) {
      if (!options?.allowAdmin) {
        throw new ForbiddenException(`You don't have permission to access this ${this.entityName}`);
      }
    }
    
    return entity;
  }

  async findByOwner(
    ownerId: string,
    options?: { relations?: string[]; order?: any; limit?: number; offset?: number },
  ): Promise<T[]> {
    return this.repository.find({
      where: { ownerId, isDeleted: false } as FindOptionsWhere<T>,
      relations: options?.relations,
      order: options?.order || { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async findByOwnerWithPagination(
    ownerId: string,
    pagination: PaginationDto,
    options?: { relations?: string[]; order?: any },
  ): Promise<PagedResponseDto<T>> {
    const [list, total] = await this.repository.findAndCount({
      where: { ownerId, isDeleted: false } as FindOptionsWhere<T>,
      relations: options?.relations,
      order: options?.order || { createdAt: 'DESC' },
      skip: pagination.offset,
      take: pagination.limit,
    });

    return PagedResponseDto.create(list, { page: pagination.page, pageSize: pagination.pageSize, total });
  }

  async update(
    id: string,
    ownerId: string,
    dto: DeepPartial<T>,
    options?: OwnershipCheckOptions,
  ): Promise<T> {
    const entity = await this.findOneByIdAndOwner(id, ownerId, options);
    const previousValues = { ...entity };
    
    Object.assign(entity, dto);
    const updated = await this.repository.save(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.updated`, {
      entity: updated,
      changes: dto,
      previousValues,
    });
    this.invalidateCache(id);
    
    return updated;
  }

  async delete(
    id: string,
    ownerId: string,
    options?: OwnershipCheckOptions & { permanent?: boolean },
  ): Promise<void> {
    const entity = await this.findOneByIdAndOwner(id, ownerId, options);
    
    if (options?.permanent) {
      await this.repository.remove(entity);
    } else {
      await this.repository.update(id, { isDeleted: true } as any);
    }
    
    this.emitEvent(`${this.entityName.toLowerCase()}.deleted`, { entity });
    this.invalidateCache(id);
  }

  async restore(id: string, ownerId: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, ownerId, isDeleted: true } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found or not deleted`,
      );
    }

    await this.repository.update(id, { isDeleted: false } as any);
    const restored = await this.findOneByIdOrFail(id);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.restored`, { entity: restored });
    this.invalidateCache(id);
    
    return restored;
  }

  async countByOwner(ownerId: string): Promise<number> {
    return this.repository.count({
      where: { ownerId, isDeleted: false } as FindOptionsWhere<T>,
    });
  }

  async existsByOwner(ownerId: string, additionalWhere?: FindOptionsWhere<T>): Promise<boolean> {
    const where = { ownerId, isDeleted: false, ...additionalWhere } as FindOptionsWhere<T>;
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async transferOwnership(
    id: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<T> {
    const entity = await this.findOneByIdAndOwner(id, currentOwnerId);
    
    entity.ownerId = newOwnerId;
    const updated = await this.repository.save(entity);
    
    this.emitEvent(`${this.entityName.toLowerCase()}.ownership_transferred`, {
      entity: updated,
      previousOwnerId: currentOwnerId,
      newOwnerId,
    });
    this.invalidateCache(id);
    
    return updated;
  }

  async transaction<R>(callback: (manager: EntityManager) => Promise<R>): Promise<R> {
    return this.dataSource.transaction(callback);
  }

  protected emitEvent(type: string, payload: any): void {
    if (this.eventBus) {
      this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, { ...payload, type }, {
        priority: EventPriority.MEDIUM,
        source: this.entityName,
      });
    }
  }

  protected async invalidateCache(id: string): Promise<void> {
    if (this.cacheService) {
      const cacheKey = `${this.entityName.toLowerCase()}:${id}`;
      await this.cacheService.delete(cacheKey).catch(err => {
        this.logger.warn(`Failed to invalidate cache: ${err.message}`);
      });
    }
  }
}
