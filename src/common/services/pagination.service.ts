import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder, Repository, ObjectLiteral } from 'typeorm';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    field: string;
    start?: Date;
    end?: Date;
  };
  includeDeleted?: boolean;
  relations?: string[];
  select?: string[];
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startItem: number;
    endItem: number;
  };
  links?: {
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cursorField?: string;
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
  includeDeleted?: boolean;
  relations?: string[];
}

export interface CursorPaginationResult<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
    limit: number;
  };
}

export interface PaginationConfig {
  maxLimit?: number;
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);
  private readonly defaultConfig: Required<PaginationConfig> = {
    maxLimit: 1000,
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'DESC',
  };

  constructor() {}

  async paginate<T extends ObjectLiteral>(
    repository: Repository<T>,
    params: PaginationParams,
    config?: PaginationConfig,
  ): Promise<PaginationResult<T>> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(
      Math.max(1, params.limit || mergedConfig.defaultLimit),
      mergedConfig.maxLimit,
    );

    const queryBuilder = repository.createQueryBuilder('entity');

    this.applyRelations(queryBuilder, params.relations);
    this.applySelect(queryBuilder, params.select);
    this.applySearch(queryBuilder, params.search, params.searchFields);
    this.applyFilters(queryBuilder, params.filters);
    this.applyDateRange(queryBuilder, params.dateRange);
    this.applySorting(queryBuilder, params.sortBy || mergedConfig.defaultSortBy, params.sortOrder || mergedConfig.defaultSortOrder);

    if (!params.includeDeleted) {
      this.applySoftDeleteFilter(queryBuilder);
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const startItem = totalItems > 0 ? skip + 1 : 0;
    const endItem = Math.min(skip + limit, totalItems);

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startItem,
        endItem,
      },
    };
  }

  async paginateQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    params: PaginationParams,
    config?: PaginationConfig,
  ): Promise<PaginationResult<T>> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(
      Math.max(1, params.limit || mergedConfig.defaultLimit),
      mergedConfig.maxLimit,
    );

    this.applySearch(queryBuilder, params.search, params.searchFields);
    this.applyFilters(queryBuilder, params.filters);
    this.applyDateRange(queryBuilder, params.dateRange);
    this.applySorting(queryBuilder, params.sortBy || mergedConfig.defaultSortBy, params.sortOrder || mergedConfig.defaultSortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const startItem = totalItems > 0 ? skip + 1 : 0;
    const endItem = Math.min(skip + limit, totalItems);

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startItem,
        endItem,
      },
    };
  }

  async cursorPaginate<T extends ObjectLiteral>(
    repository: Repository<T>,
    params: CursorPaginationParams,
    config?: PaginationConfig,
  ): Promise<CursorPaginationResult<T>> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const limit = Math.min(
      Math.max(1, params.limit || mergedConfig.defaultLimit),
      mergedConfig.maxLimit,
    );
    const cursorField = params.cursorField || 'id';
    const sortBy = params.sortBy || cursorField;
    const sortOrder = params.sortOrder || 'DESC';

    const queryBuilder = repository.createQueryBuilder('entity');

    this.applyRelations(queryBuilder, params.relations);
    this.applySearch(queryBuilder, params.search, params.searchFields);
    this.applyFilters(queryBuilder, params.filters);

    if (!params.includeDeleted) {
      this.applySoftDeleteFilter(queryBuilder);
    }

    if (params.cursor) {
      const cursorValue = this.decodeCursor(params.cursor);
      if (cursorValue) {
        if (sortOrder === 'DESC') {
          queryBuilder.andWhere(`entity.${sortBy} < :cursorValue`, { cursorValue });
        } else {
          queryBuilder.andWhere(`entity.${sortBy} > :cursorValue`, { cursorValue });
        }
      }
    }

    queryBuilder.orderBy(`entity.${sortBy}`, sortOrder);
    queryBuilder.take(limit + 1);

    const results = await queryBuilder.getMany();
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    const startCursor = data.length > 0 ? this.encodeCursor((data[0] as any)[cursorField]) : null;
    const endCursor = data.length > 0 ? this.encodeCursor((data[data.length - 1] as any)[cursorField]) : null;

    return {
      data,
      meta: {
        hasNextPage,
        hasPrevPage: !!params.cursor,
        startCursor,
        endCursor,
        limit,
      },
    };
  }

  async paginateWithAggregates<T extends ObjectLiteral>(
    repository: Repository<T>,
    params: PaginationParams,
    aggregates: {
      field: string;
      operation: 'sum' | 'avg' | 'min' | 'max' | 'count';
      alias?: string;
    }[],
    config?: PaginationConfig,
  ): Promise<PaginationResult<T> & { aggregates: Record<string, number> }> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(
      Math.max(1, params.limit || mergedConfig.defaultLimit),
      mergedConfig.maxLimit,
    );

    const queryBuilder = repository.createQueryBuilder('entity');

    this.applyRelations(queryBuilder, params.relations);
    this.applySearch(queryBuilder, params.search, params.searchFields);
    this.applyFilters(queryBuilder, params.filters);
    this.applyDateRange(queryBuilder, params.dateRange);
    this.applySorting(queryBuilder, params.sortBy || mergedConfig.defaultSortBy, params.sortOrder || mergedConfig.defaultSortOrder);

    if (!params.includeDeleted) {
      this.applySoftDeleteFilter(queryBuilder);
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, totalItems] = await queryBuilder.getManyAndCount();

    const aggregateResults: Record<string, number> = {};
    for (const agg of aggregates) {
      const alias = agg.alias || `${agg.operation}_${agg.field}`;
      const aggQuery = repository.createQueryBuilder('entity');

      this.applySearch(aggQuery, params.search, params.searchFields);
      this.applyFilters(aggQuery, params.filters);
      this.applyDateRange(aggQuery, params.dateRange);

      if (!params.includeDeleted) {
        this.applySoftDeleteFilter(aggQuery);
      }

      const result = await aggQuery
        .select(`${agg.operation}(entity.${agg.field})`, 'value')
        .getRawOne();

      aggregateResults[alias] = result?.value || 0;
    }

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const startItem = totalItems > 0 ? skip + 1 : 0;
    const endItem = Math.min(skip + limit, totalItems);

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        startItem,
        endItem,
      },
      aggregates: aggregateResults,
    };
  }

  buildLinks(baseUrl: string, params: PaginationParams, totalPages: number): {
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  } {
    const { page, limit } = params;
    const queryParams = new URLSearchParams();

    queryParams.set('page', '1');
    queryParams.set('limit', String(limit));
    const first = `${baseUrl}?${queryParams.toString()}`;

    queryParams.set('page', String(totalPages));
    const last = `${baseUrl}?${queryParams.toString()}`;

    let next: string | null = null;
    if (page < totalPages) {
      queryParams.set('page', String(page + 1));
      next = `${baseUrl}?${queryParams.toString()}`;
    }

    let prev: string | null = null;
    if (page > 1) {
      queryParams.set('page', String(page - 1));
      prev = `${baseUrl}?${queryParams.toString()}`;
    }

    return { first, last, next, prev };
  }

  private applyRelations<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    relations?: string[],
  ): void {
    if (relations && relations.length > 0) {
      for (const relation of relations) {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      }
    }
  }

  private applySelect<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    select?: string[],
  ): void {
    if (select && select.length > 0) {
      const selections = select.map(field => `entity.${field}`);
      queryBuilder.select(selections);
    }
  }

  private applySearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    search?: string,
    searchFields?: string[],
  ): void {
    if (search && searchFields && searchFields.length > 0) {
      const conditions = searchFields
        .map(field => `entity.${field} LIKE :search`)
        .join(' OR ');
      queryBuilder.andWhere(`(${conditions})`, { search: `%${search}%` });
    }
  }

  private applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters?: Record<string, any>,
  ): void {
    if (filters) {
      for (const [field, value] of Object.entries(filters)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
          queryBuilder.andWhere(`entity.${field} IN (:...${field})`, { [field]: value });
        } else if (typeof value === 'object' && value.operator) {
          this.applyOperatorFilter(queryBuilder, field, value);
        } else {
          queryBuilder.andWhere(`entity.${field} = :${field}`, { [field]: value });
        }
      }
    }
  }

  private applyOperatorFilter<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    field: string,
    filter: { operator: string; value: any },
  ): void {
    const { operator, value } = filter;

    switch (operator.toLowerCase()) {
      case 'eq':
        queryBuilder.andWhere(`entity.${field} = :${field}`, { [field]: value });
        break;
      case 'ne':
        queryBuilder.andWhere(`entity.${field} != :${field}`, { [field]: value });
        break;
      case 'gt':
        queryBuilder.andWhere(`entity.${field} > :${field}`, { [field]: value });
        break;
      case 'gte':
        queryBuilder.andWhere(`entity.${field} >= :${field}`, { [field]: value });
        break;
      case 'lt':
        queryBuilder.andWhere(`entity.${field} < :${field}`, { [field]: value });
        break;
      case 'lte':
        queryBuilder.andWhere(`entity.${field} <= :${field}`, { [field]: value });
        break;
      case 'like':
        queryBuilder.andWhere(`entity.${field} LIKE :${field}`, { [field]: `%${value}%` });
        break;
      case 'ilike':
        queryBuilder.andWhere(`LOWER(entity.${field}) LIKE LOWER(:${field})`, { [field]: `%${value}%` });
        break;
      case 'isnull':
        queryBuilder.andWhere(`entity.${field} IS NULL`);
        break;
      case 'isnotnull':
        queryBuilder.andWhere(`entity.${field} IS NOT NULL`);
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          queryBuilder.andWhere(`entity.${field} BETWEEN :${field}Start AND :${field}End`, {
            [`${field}Start`]: value[0],
            [`${field}End`]: value[1],
          });
        }
        break;
    }
  }

  private applyDateRange<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    dateRange?: PaginationParams['dateRange'],
  ): void {
    if (dateRange) {
      const { field, start, end } = dateRange;

      if (start) {
        queryBuilder.andWhere(`entity.${field} >= :startDate`, { startDate: start });
      }

      if (end) {
        queryBuilder.andWhere(`entity.${field} <= :endDate`, { endDate: end });
      }
    }
  }

  private applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): void {
    if (sortBy) {
      const order = sortOrder || 'DESC';
      const sortFields = sortBy.split(',').map(f => f.trim());

      for (const field of sortFields) {
        queryBuilder.addOrderBy(`entity.${field}`, order);
      }
    }
  }

  private applySoftDeleteFilter<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): void {
    const alias = queryBuilder.alias;
    try {
      queryBuilder.andWhere(`${alias}.deletedAt IS NULL`);
    } catch {
      // Entity doesn't have deletedAt field
    }
  }

  private encodeCursor(value: any): string {
    if (value === null || value === undefined) return '';
    return Buffer.from(String(value)).toString('base64');
  }

  private decodeCursor(cursor: string): any {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const num = Number(decoded);
      return isNaN(num) ? decoded : num;
    } catch {
      return null;
    }
  }
}
