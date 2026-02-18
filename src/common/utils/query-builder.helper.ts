import { SelectQueryBuilder, FindOptionsWhere, ObjectLiteral, OrderByCondition } from 'typeorm';

export type SortDirection = 'ASC' | 'DESC';

export interface QueryBuilderOptions {
  alias: string;
  defaultSort?: string;
  defaultSortDirection?: SortDirection;
  maxLimit?: number;
}

export class QueryBuilderHelper<T extends ObjectLiteral> {
  private readonly alias: string;
  private readonly defaultSort: string;
  private readonly defaultSortDirection: SortDirection;
  private readonly maxLimit: number;

  constructor(options: QueryBuilderOptions) {
    this.alias = options.alias;
    this.defaultSort = options.defaultSort || 'createdAt';
    this.defaultSortDirection = options.defaultSortDirection || 'DESC';
    this.maxLimit = options.maxLimit || 100;
  }

  applyPagination(
    qb: SelectQueryBuilder<T>,
    page: number = 1,
    pageSize: number = 20,
  ): SelectQueryBuilder<T> {
    const limit = Math.min(pageSize, this.maxLimit);
    const offset = (page - 1) * limit;
    return qb.skip(offset).take(limit);
  }

  applyCursorPagination(
    qb: SelectQueryBuilder<T>,
    cursor: string | undefined,
    pageSize: number = 20,
    cursorField: string = 'id',
    direction: SortDirection = 'DESC',
  ): SelectQueryBuilder<T> {
    const limit = Math.min(pageSize, this.maxLimit);
    
    if (cursor) {
      const operator = direction === 'DESC' ? '<' : '>';
      qb.andWhere(`${this.alias}.${cursorField} ${operator} :cursor`, { cursor });
    }
    
    return qb.orderBy(`${this.alias}.${cursorField}`, direction).take(limit + 1);
  }

  applySorting(
    qb: SelectQueryBuilder<T>,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): SelectQueryBuilder<T> {
    const field = sortBy || this.defaultSort;
    const direction = (sortOrder?.toUpperCase() as SortDirection) || this.defaultSortDirection;
    
    if (this.isValidSortField(field)) {
      qb.orderBy(`${this.alias}.${field}`, direction);
    }
    
    return qb;
  }

  applyDateRange(
    qb: SelectQueryBuilder<T>,
    field: string,
    startDate?: Date,
    endDate?: Date,
  ): SelectQueryBuilder<T> {
    if (startDate) {
      qb.andWhere(`${this.alias}.${field} >= :startDate`, { startDate });
    }
    if (endDate) {
      qb.andWhere(`${this.alias}.${field} <= :endDate`, { endDate });
    }
    return qb;
  }

  applySearch(
    qb: SelectQueryBuilder<T>,
    keyword: string,
    fields: string[],
  ): SelectQueryBuilder<T> {
    if (!keyword || fields.length === 0) return qb;

    const conditions = fields.map(field => `${this.alias}.${field} LIKE :keyword`);
    qb.andWhere(`(${conditions.join(' OR ')})`, { keyword: `%${keyword}%` });
    
    return qb;
  }

  applySoftDeleteFilter(
    qb: SelectQueryBuilder<T>,
    includeDeleted: boolean = false,
  ): SelectQueryBuilder<T> {
    if (!includeDeleted) {
      qb.andWhere(`${this.alias}.isDeleted = :isDeleted`, { isDeleted: false });
    }
    return qb;
  }

  applyOwnerFilter(
    qb: SelectQueryBuilder<T>,
    ownerId: string,
    ownerField: string = 'ownerId',
  ): SelectQueryBuilder<T> {
    return qb.andWhere(`${this.alias}.${ownerField} = :ownerId`, { ownerId });
  }

  applyStatusFilter(
    qb: SelectQueryBuilder<T>,
    status: string | string[],
    statusField: string = 'status',
  ): SelectQueryBuilder<T> {
    if (Array.isArray(status)) {
      qb.andWhere(`${this.alias}.${statusField} IN (:...status)`, { status });
    } else {
      qb.andWhere(`${this.alias}.${statusField} = :status`, { status });
    }
    return qb;
  }

  applyInFilter(
    qb: SelectQueryBuilder<T>,
    field: string,
    values: any[],
  ): SelectQueryBuilder<T> {
    if (values.length === 0) return qb;
    
    if (values.length === 1) {
      qb.andWhere(`${this.alias}.${field} = :${field}`, { [field]: values[0] });
    } else {
      qb.andWhere(`${this.alias}.${field} IN (:...${field})`, { [field]: values });
    }
    return qb;
  }

  applyWhereConditions(
    qb: SelectQueryBuilder<T>,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): SelectQueryBuilder<T> {
    if (Array.isArray(where)) {
      where.forEach((condition, index) => {
        if (index === 0) {
          qb.where(condition as any);
        } else {
          qb.orWhere(condition as any);
        }
      });
    } else {
      qb.where(where as any);
    }
    return qb;
  }

  private isValidSortField(field: string): boolean {
    const validFields = ['id', 'uuid', 'createdAt', 'updatedAt', 'status', 'name', 'title'];
    return validFields.includes(field) || field.startsWith('custom_');
  }
}

export function createQueryBuilderHelper<T extends ObjectLiteral>(
  options: QueryBuilderOptions,
): QueryBuilderHelper<T> {
  return new QueryBuilderHelper<T>(options);
}
