/**
 * 增强型分页服务
 * 
 * 提供多种分页策略：偏移量分页、游标分页、关键集分页
 * 支持分页元数据、排序、过滤等功能
 * 
 * @framework
 */

import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * 分页方向
 */
export type PaginationDirection = 'forward' | 'backward';

/**
 * 排序方向
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * 分页选项
 */
export interface PaginationOptions {
  /** 页码（偏移量分页） */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 游标（游标分页） */
  cursor?: string;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortDirection?: SortDirection;
  /** 分页方向 */
  direction?: PaginationDirection;
  /** 是否包含总数 */
  includeTotal?: boolean;
  /** 最大限制 */
  maxLimit?: number;
  /** 默认限制 */
  defaultLimit?: number;
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总记录数 */
  total?: number;
  /** 总页数 */
  totalPages?: number;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 上一页页码 */
  previousPage?: number;
  /** 下一页页码 */
  nextPage?: number;
  /** 游标信息 */
  cursor?: {
    /** 当前游标 */
    current: string | null;
    /** 下一页游标 */
    next: string | null;
    /** 上一页游标 */
    previous: string | null;
  };
}

/**
 * 分页结果
 */
export interface PaginationResult<T> {
  /** 数据列表 */
  data: T[];
  /** 分页元数据 */
  meta: PaginationMeta;
  /** 查询时间（毫秒） */
  queryTime?: number;
}

/**
 * 游标分页结果
 */
export interface CursorPaginationResult<T> {
  /** 数据列表 */
  data: T[];
  /** 游标信息 */
  cursor: {
    /** 当前游标 */
    current: string | null;
    /** 下一页游标 */
    next: string | null;
    /** 上一页游标 */
    previous: string | null;
    /** 是否有更多 */
    hasMore: boolean;
  };
  /** 限制数量 */
  limit: number;
}

/**
 * 过滤条件
 */
export interface FilterCondition {
  /** 字段 */
  field: string;
  /** 操作符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between' | 'null' | 'notNull';
  /** 值 */
  value?: any;
  /** 值 2（用于 between） */
  value2?: any;
}

/**
 * 查询选项
 */
export interface QueryOptions<T> extends PaginationOptions {
  /** 过滤条件 */
  filters?: FilterCondition[];
  /** 搜索关键词 */
  search?: string;
  /** 搜索字段 */
  searchFields?: (keyof T)[];
  /** 包含关系 */
  relations?: string[];
  /** 选择字段 */
  select?: (keyof T)[];
  /** 额外排序 */
  orderBy?: { field: string; direction: SortDirection }[];
}

/**
 * 增强型分页服务
 */
@Injectable()
export class PaginationService {
  /**
   * 应用分页到 TypeORM 查询构建器
   */
  applyPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): SelectQueryBuilder<T> {
    const limit = this.getLimit(options);
    const offset = this.getOffset(options);

    queryBuilder.skip(offset).take(limit + 1); // 多取一条用于判断是否有下一页

    return queryBuilder;
  }

  /**
   * 应用排序到 TypeORM 查询构建器
   */
  applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: { sortBy?: string; sortDirection?: SortDirection; orderBy?: { field: string; direction: SortDirection }[] },
  ): SelectQueryBuilder<T> {
    // 主排序
    if (options.sortBy) {
      queryBuilder.addOrderBy(`${queryBuilder.alias}.${options.sortBy}`, options.sortDirection || 'ASC');
    }

    // 额外排序
    if (options.orderBy?.length) {
      for (const { field, direction } of options.orderBy) {
        queryBuilder.addOrderBy(`${queryBuilder.alias}.${field}`, direction);
      }
    }

    return queryBuilder;
  }

  /**
   * 应用过滤到 TypeORM 查询构建器
   */
  applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: FilterCondition[] | undefined,
  ): SelectQueryBuilder<T> {
    if (!filters?.length) return queryBuilder;

    filters.forEach((filter, index) => {
      const paramName = `filter_${index}`;
      const alias = queryBuilder.alias;

      switch (filter.operator) {
        case 'eq':
          queryBuilder.andWhere(`${alias}.${filter.field} = :${paramName}`, { [paramName]: filter.value });
          break;
        case 'ne':
          queryBuilder.andWhere(`${alias}.${filter.field} != :${paramName}`, { [paramName]: filter.value });
          break;
        case 'gt':
          queryBuilder.andWhere(`${alias}.${filter.field} > :${paramName}`, { [paramName]: filter.value });
          break;
        case 'gte':
          queryBuilder.andWhere(`${alias}.${filter.field} >= :${paramName}`, { [paramName]: filter.value });
          break;
        case 'lt':
          queryBuilder.andWhere(`${alias}.${filter.field} < :${paramName}`, { [paramName]: filter.value });
          break;
        case 'lte':
          queryBuilder.andWhere(`${alias}.${filter.field} <= :${paramName}`, { [paramName]: filter.value });
          break;
        case 'like':
          queryBuilder.andWhere(`${alias}.${filter.field} LIKE :${paramName}`, { [paramName]: `%${filter.value}%` });
          break;
        case 'in':
          queryBuilder.andWhere(`${alias}.${filter.field} IN (:...${paramName})`, { [paramName]: filter.value });
          break;
        case 'between':
          queryBuilder.andWhere(
            `${alias}.${filter.field} BETWEEN :${paramName}_start AND :${paramName}_end`,
            {
              [`${paramName}_start`]: filter.value,
              [`${paramName}_end`]: filter.value2,
            },
          );
          break;
        case 'null':
          queryBuilder.andWhere(`${alias}.${filter.field} IS NULL`);
          break;
        case 'notNull':
          queryBuilder.andWhere(`${alias}.${filter.field} IS NOT NULL`);
          break;
      }
    });

    return queryBuilder;
  }

  /**
   * 应用搜索到 TypeORM 查询构建器
   */
  applySearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    search: string | undefined,
    searchFields: (keyof T)[] | undefined,
  ): SelectQueryBuilder<T> {
    if (!search || !searchFields?.length) return queryBuilder;

    const searchTerms = search.trim().split(/\s+/);
    
    searchTerms.forEach((term, termIndex) => {
      const conditions = searchFields.map((field, fieldIndex) => {
        return `${queryBuilder.alias}.${String(field)} LIKE :search_${termIndex}_${fieldIndex}`;
      }).join(' OR ');

      queryBuilder.andWhere(`(${conditions})`, 
        searchFields.reduce((params, field, fieldIndex) => {
          params[`search_${termIndex}_${fieldIndex}`] = `%${term}%`;
          return params;
        }, {} as Record<string, string>)
      );
    });

    return queryBuilder;
  }

  /**
   * 执行分页查询
   */
  async paginate<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: QueryOptions<T>,
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    const limit = this.getLimit(options);
    const page = options.page || 1;

    // 应用查询选项
    this.applyPagination(queryBuilder, options);
    this.applySorting(queryBuilder, options);
    this.applyFilters(queryBuilder, options.filters);
    this.applySearch(queryBuilder, options.search, options.searchFields);

    // 选择字段
    if (options.select?.length) {
      queryBuilder.select(options.select.map(f => `${queryBuilder.alias}.${String(f)}`));
    }

    // 包含关系
    if (options.relations?.length) {
      for (const relation of options.relations) {
        queryBuilder.leftJoinAndSelect(`${queryBuilder.alias}.${relation}`, `${queryBuilder.alias}_${relation}`);
      }
    }

    // 获取数据和总数
    const [entities, total] = await Promise.all([
      queryBuilder.getMany(),
      options.includeTotal !== false ? this.getTotalCount(queryBuilder) : Promise.resolve(0),
    ]);

    // 检查是否多取了一条（用于判断是否有下一页）
    let data = entities;
    let hasNext = false;

    if (entities.length > limit) {
      data = entities.slice(0, limit);
      hasNext = true;
    } else {
      hasNext = page * limit < (total || 0);
    }

    const totalPages = options.includeTotal !== false && total ? Math.ceil(total / limit) : undefined;

    return {
      data,
      meta: {
        page,
        limit,
        total: options.includeTotal !== false ? total : undefined,
        totalPages,
        hasPrevious: page > 1,
        hasNext,
        previousPage: page > 1 ? page - 1 : undefined,
        nextPage: hasNext ? page + 1 : undefined,
      },
      queryTime: Date.now() - startTime,
    };
  }

  /**
   * 游标分页查询
   */
  async paginateCursor<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: {
      limit?: number;
      cursor?: string;
      sortBy?: string;
      sortDirection?: SortDirection;
      cursorField?: string;
    },
  ): Promise<CursorPaginationResult<T>> {
    const limit = Math.min(options.limit || 20, 100);
    const cursorField = options.cursorField || 'id';
    const sortDirection = options.sortDirection || 'ASC';

    // 多取一条用于判断是否有更多
    queryBuilder.take(limit + 1);

    // 应用游标
    if (options.cursor) {
      const operator = sortDirection === 'ASC' ? '>' : '<';
      queryBuilder.andWhere(`${queryBuilder.alias}.${cursorField} ${operator} :cursor`, { cursor: options.cursor });
    }

    // 应用排序
    queryBuilder.addOrderBy(`${queryBuilder.alias}.${cursorField}`, sortDirection);

    const entities = await queryBuilder.getMany();

    // 检查是否多取了一条
    let data = entities;
    let hasMore = false;

    if (entities.length > limit) {
      data = entities.slice(0, limit);
      hasMore = true;
    }

    // 生成游标
    const currentCursor = data.length > 0 ? String((data[0] as any)[cursorField]) : null;
    const nextCursor = hasMore ? String((data[data.length - 1] as any)[cursorField]) : null;

    return {
      data,
      cursor: {
        current: currentCursor,
        next: nextCursor,
        previous: options.cursor || null,
        hasMore,
      },
      limit,
    };
  }

  /**
   * 构建分页链接
   */
  buildPaginationLinks(
    baseUrl: string,
    meta: PaginationMeta,
    additionalParams?: Record<string, string>,
  ): {
    first: string;
    previous?: string;
    next?: string;
    last?: string;
  } {
    const params = new URLSearchParams(additionalParams);
    params.set('limit', meta.limit.toString());

    const links: any = {
      first: `${baseUrl}?${params.toString()}`,
    };

    if (meta.hasPrevious && meta.previousPage) {
      params.set('page', meta.previousPage.toString());
      links.previous = `${baseUrl}?${params.toString()}`;
    }

    if (meta.hasNext && meta.nextPage) {
      params.set('page', meta.nextPage.toString());
      links.next = `${baseUrl}?${params.toString()}`;
    }

    if (meta.totalPages) {
      params.set('page', meta.totalPages.toString());
      links.last = `${baseUrl}?${params.toString()}`;
    }

    return links;
  }

  /**
   * 验证分页参数
   */
  validatePaginationOptions(options: PaginationOptions): PaginationOptions {
    const validated: PaginationOptions = { ...options };
    const maxLimit = options.maxLimit || 100;
    const defaultLimit = options.defaultLimit || 20;

    // 验证页码
    if (validated.page !== undefined) {
      validated.page = Math.max(1, Math.floor(validated.page));
    }

    // 验证限制
    if (validated.limit !== undefined) {
      validated.limit = Math.max(1, Math.min(validated.limit, maxLimit));
    } else {
      validated.limit = defaultLimit;
    }

    // 验证偏移量
    if (validated.offset !== undefined) {
      validated.offset = Math.max(0, validated.offset);
    }

    return validated;
  }

  /**
   * 获取限制数量
   */
  private getLimit(options: PaginationOptions): number {
    return options.limit || options.defaultLimit || 20;
  }

  /**
   * 获取偏移量
   */
  private getOffset(options: PaginationOptions): number {
    if (options.offset !== undefined) {
      return options.offset;
    }
    
    const page = options.page || 1;
    const limit = this.getLimit(options);
    
    return (page - 1) * limit;
  }

  /**
   * 获取总数（不计算偏移和限制）
   */
  private async getTotalCount<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): Promise<number> {
    const countQueryBuilder = queryBuilder.clone();
    countQueryBuilder.skip(undefined).take(undefined);
    // 清除排序 - 使用空字符串替代空数组
    countQueryBuilder.orderBy('');

    const result = await countQueryBuilder.getCount();
    return result;
  }
}

/**
 * 分页查询装饰器
 */
export function Paginate(options?: {
  maxLimit?: number;
  defaultLimit?: number;
  includeTotal?: boolean;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const paginationService = (this as any).paginationService as PaginationService;
      
      if (!paginationService) {
        return originalMethod.apply(this, args);
      }

      // 从参数或请求中获取分页选项
      const paginationOptions = this.extractPaginationOptions?.() || {
        maxLimit: options?.maxLimit || 100,
        defaultLimit: options?.defaultLimit || 20,
        includeTotal: options?.includeTotal ?? true,
      };

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
