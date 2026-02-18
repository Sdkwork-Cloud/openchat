import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  get offset(): number {
    return (this.page - 1) * this.pageSize;
  }

  get limit(): number {
    return this.pageSize;
  }
}

export class CursorPaginationDto {
  @ApiPropertyOptional({ description: '游标' })
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: '每页数量', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class IdParamDto {
  @ApiProperty({ description: 'ID' })
  id: string;
}

export class UuidParamDto {
  @ApiProperty({ description: 'UUID' })
  uuid: string;
}

export class DateRangeDto {
  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  endDate?: Date;
}

export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
