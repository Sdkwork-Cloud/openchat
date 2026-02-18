import { IsString, IsOptional, IsNumber, Min, Max, IsIn, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BaseQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  get offset(): number {
    return ((this.page || 1) - 1) * (this.pageSize || 20);
  }

  get limit(): number {
    return this.pageSize || 20;
  }
}

export class CursorQueryDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  get limit(): number {
    return this.pageSize || 20;
  }
}

export class SearchQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class BulkIdsDto {
  @ApiPropertyOptional({ description: 'Array of IDs', type: [String] })
  @IsString({ each: true })
  ids: string[];
}

export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  get startDateObj(): Date | undefined {
    return this.startDate ? new Date(this.startDate) : undefined;
  }

  get endDateObj(): Date | undefined {
    return this.endDate ? new Date(this.endDate) : undefined;
  }

  isValid(): boolean {
    if (!this.startDate || !this.endDate) return true;
    return new Date(this.startDate) <= new Date(this.endDate);
  }
}
