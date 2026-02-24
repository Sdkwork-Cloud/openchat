/**
 * 增强型 DTO 基类
 * 提供通用的 DTO 功能和模式
 *
 * @framework
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max, IsString, IsDateString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 基础 DTO 类
 * 所有 DTO 的基类
 */
export abstract class BaseDto {
  /**
   * 转换为普通对象
   */
  toObject(): Record<string, any> {
    const obj: Record<string, any> = {};

    for (const key of Object.keys(this)) {
      const value = (this as any)[key];
      obj[key] = value instanceof Date ? value.toISOString() : value;
    }

    return obj;
  }

  /**
   * 转换为 JSON（排除 null 和 undefined）
   */
  toJSON(): Record<string, any> {
    const obj: Record<string, any> = {};

    for (const key of Object.keys(this)) {
      const value = (this as any)[key];
      if (value !== null && value !== undefined) {
        obj[key] = value instanceof Date ? value.toISOString() : value;
      }
    }

    return obj;
  }

  /**
   * 获取指定字段
   */
  pick<T extends keyof this>(fields: T[]): Pick<this, T> {
    const result = {} as Pick<this, T>;
    for (const field of fields) {
      result[field] = this[field];
    }
    return result;
  }

  /**
   * 排除指定字段
   */
  omit<T extends keyof this>(fields: T[]): Omit<this, T> {
    const result = { ...this } as any;
    for (const field of fields) {
      delete result[field];
    }
    return result;
  }
}

/**
 * 创建 DTO
 */
export abstract class CreateDto extends BaseDto {
  @ApiPropertyOptional({ description: '创建者 ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

/**
 * 更新 DTO
 */
export abstract class UpdateDto extends BaseDto {
  @ApiPropertyOptional({ description: '更新者 ID' })
  @IsString()
  @IsOptional()
  updatedBy?: string;
}

/**
 * 部分更新 DTO
 */
export abstract class PartialUpdateDto extends UpdateDto {
  // 所有字段都是可选的
}

/**
 * 删除 DTO
 */
export abstract class DeleteDto extends BaseDto {
  @ApiPropertyOptional({ description: '删除原因' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: '是否永久删除', default: false })
  @IsOptional()
  permanent?: boolean = false;
}

/**
 * 批量操作 DTO
 */
export abstract class BatchDto<T = any> extends BaseDto {
  @ApiProperty({ description: '操作列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  items: T[];
}

/**
 * 批量创建 DTO
 */
export abstract class BatchCreateDto<T extends CreateDto> extends BatchDto<T> {
  @ApiProperty({ description: '创建项列表', type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type((options) => {
    // 动态类型需要在子类中指定
    return Object;
  })
  items: T[];
}

/**
 * 批量更新 DTO
 */
export abstract class BatchUpdateDto<T extends UpdateDto> extends BatchDto<T> {
  @ApiProperty({ description: '更新项列表', type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type((options) => {
    // 动态类型需要在子类中指定
    return Object;
  })
  items: T[];
}

/**
 * 批量删除 DTO
 */
export abstract class BatchDeleteDto extends BaseDto {
  @ApiProperty({ description: '要删除的 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiPropertyOptional({ description: '删除原因' })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * 导入 DTO
 */
export abstract class ImportDto extends BaseDto {
  @ApiProperty({ description: '导入数据' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  data: Record<string, any>[];

  @ApiPropertyOptional({ description: '导入选项' })
  @IsOptional()
  options?: {
    skipDuplicates?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
  };
}

/**
 * 导出 DTO
 */
export abstract class ExportDto extends BaseDto {
  @ApiPropertyOptional({ description: '导出格式', default: 'csv' })
  @IsString()
  @IsOptional()
  format?: 'csv' | 'xlsx' | 'json' | 'xml' = 'csv';

  @ApiPropertyOptional({ description: '导出字段' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[];

  @ApiPropertyOptional({ description: '过滤条件' })
  @IsOptional()
  filters?: Record<string, any>;
}

/**
 * 搜索 DTO
 */
export abstract class SearchDto extends BaseDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '搜索字段' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[];

  @ApiPropertyOptional({ description: '精确匹配', default: false })
  @IsOptional()
  exact?: boolean = false;

  @ApiPropertyOptional({ description: '是否区分大小写', default: false })
  @IsOptional()
  caseSensitive?: boolean = false;
}

/**
 * 过滤 DTO
 */
export abstract class FilterDto extends BaseDto {
  @ApiPropertyOptional({ description: '等于条件' })
  @IsOptional()
  eq?: Record<string, any>;

  @ApiPropertyOptional({ description: '不等于条件' })
  @IsOptional()
  ne?: Record<string, any>;

  @ApiPropertyOptional({ description: '大于条件' })
  @IsOptional()
  gt?: Record<string, any>;

  @ApiPropertyOptional({ description: '大于等于条件' })
  @IsOptional()
  gte?: Record<string, any>;

  @ApiPropertyOptional({ description: '小于条件' })
  @IsOptional()
  lt?: Record<string, any>;

  @ApiPropertyOptional({ description: '小于等于条件' })
  @IsOptional()
  lte?: Record<string, any>;

  @ApiPropertyOptional({ description: '包含条件' })
  @IsOptional()
  contains?: Record<string, any>;

  @ApiPropertyOptional({ description: '开始匹配' })
  @IsOptional()
  startsWith?: Record<string, any>;

  @ApiPropertyOptional({ description: '结束匹配' })
  @IsOptional()
  endsWith?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IN 条件' })
  @IsOptional()
  in?: Record<string, any[]>;

  @ApiPropertyOptional({ description: 'NOT IN 条件' })
  @IsOptional()
  notIn?: Record<string, any[]>;

  @ApiPropertyOptional({ description: 'NULL 检查' })
  @IsOptional()
  isNull?: string[];

  @ApiPropertyOptional({ description: 'NOT NULL 检查' })
  @IsOptional()
  isNotNull?: string[];

  @ApiPropertyOptional({ description: ' BETWEEN 条件' })
  @IsOptional()
  between?: Record<string, [any, any]>;

  @ApiPropertyOptional({ description: '逻辑 OR 条件' })
  @IsOptional()
  or?: FilterDto[];

  @ApiPropertyOptional({ description: '逻辑 AND 条件' })
  @IsOptional()
  and?: FilterDto[];
}

/**
 * 排序 DTO
 */
export abstract class SortDto extends BaseDto {
  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: '排序方向', default: 'desc', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * 转换为 TypeORM 排序对象
   */
  toTypeORMOrder(): Record<string, 'ASC' | 'DESC'> {
    return {
      [this.sortBy!]: this.sortOrder === 'asc' ? 'ASC' : 'DESC',
    };
  }
}

/**
 * 统计 DTO
 */
export abstract class StatsDto extends BaseDto {
  @ApiProperty({ description: '总数' })
  total: number;

  @ApiPropertyOptional({ description: '活跃数量' })
  activeCount?: number;

  @ApiPropertyOptional({ description: '非活跃数量' })
  inactiveCount?: number;

  @ApiPropertyOptional({ description: '增长率' })
  growthRate?: number;

  @ApiPropertyOptional({ description: '统计时间范围' })
  range?: {
    start: Date;
    end: Date;
  };
}

/**
 * 状态变更 DTO
 */
export abstract class ChangeStatusDto extends BaseDto {
  @ApiProperty({ description: '新状态' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: '变更原因' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 时间戳 DTO
 */
export class TimestampDto extends BaseDto {
  @ApiProperty({ description: '时间戳' })
  @IsInt()
  timestamp: number;
}

/**
 * 基础实体 DTO
 */
export class BaseEntityDto extends BaseDto {
  @ApiProperty({ description: 'ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '创建时间' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: '更新时间' })
  @IsDateString()
  updatedAt: string;
}

/**
 * 可审计 DTO
 */
export class AuditableDto extends BaseEntityDto {
  @ApiPropertyOptional({ description: '创建者 ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ description: '更新者 ID' })
  @IsString()
  @IsOptional()
  updatedBy?: string;
}

/**
 * 分页查询 DTO
 */
export class PaginationQueryDto extends BaseDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;
}

/**
 * 搜索查询 DTO
 */
export class SearchQueryDto extends BaseDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * 状态 DTO
 */
export class StatusDto extends BaseDto {
  @ApiProperty({ description: '状态' })
  @IsString()
  status: string;
}

/**
 * 关键词 DTO
 */
export class KeywordDto extends BaseDto {
  @ApiProperty({ description: '关键词' })
  @IsString()
  keyword: string;
}

/**
 * IDs DTO
 */
export class IdsDto extends BaseDto {
  @ApiProperty({ description: 'ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

/**
 * 日期范围 DTO
 */
export class DateRangeDto extends BaseDto {
  @ApiPropertyOptional({ description: '开始日期' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

/**
 * 邮箱 DTO
 */
export class EmailDto extends BaseDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsString()
  email: string;
}

/**
 * 手机号 DTO
 */
export class PhoneDto extends BaseDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  phone: string;
}

/**
 * 密码 DTO
 */
export class PasswordDto extends BaseDto {
  @ApiProperty({ description: '密码' })
  @IsString()
  password: string;
}

/**
 * 用户名 DTO
 */
export class UsernameDto extends BaseDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  username: string;
}

/**
 * 昵称 DTO
 */
export class NicknameDto extends BaseDto {
  @ApiProperty({ description: '昵称' })
  @IsString()
  nickname: string;
}

/**
 * URL DTO
 */
export class UrlDto extends BaseDto {
  @ApiProperty({ description: 'URL 地址' })
  @IsString()
  url: string;
}

/**
 * 数字 ID 参数 DTO
 */
export class NumericIdParamDto extends BaseDto {
  @ApiProperty({ description: 'ID' })
  @IsInt()
  id: number;
}

/**
 * 字符串 ID 参数 DTO
 */
export class StringIdParamDto extends BaseDto {
  @ApiProperty({ description: 'ID' })
  @IsString()
  id: string;
}

/**
 * UUID 参数 DTO
 */
export class UuidParamDto extends BaseDto {
  @ApiProperty({ description: 'UUID' })
  @IsString()
  id: string;
}

/**
 * 坐标 DTO
 */
export class CoordinatesDto extends BaseDto {
  @ApiProperty({ description: '纬度' })
  @IsInt()
  latitude: number;

  @ApiProperty({ description: '经度' })
  @IsInt()
  longitude: number;
}

/**
 * 文件上传 DTO
 */
export class FileUploadDto extends BaseDto {
  @ApiProperty({ description: '文件' })
  file: any;

  @ApiPropertyOptional({ description: '文件描述' })
  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * 布尔查询 DTO
 */
export class BooleanQueryDto extends BaseDto {
  @ApiPropertyOptional({ description: '布尔值', default: true })
  @IsOptional()
  value?: boolean = true;
}

/**
 * 数字范围 DTO
 */
export class NumberRangeDto extends BaseDto {
  @ApiPropertyOptional({ description: '最小值' })
  @IsInt()
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({ description: '最大值' })
  @IsInt()
  @IsOptional()
  max?: number;
}

/**
 * 创建枚举 DTO 工厂
 */
export function createEnumDto<T extends Record<string | number, string | number>>(enumType: T, defaultKey?: keyof T) {
  abstract class EnumDto extends BaseDto {
    @ApiProperty({ description: '枚举值', enum: enumType })
    @IsString()
    value: keyof T;
  }
  return EnumDto;
}

/**
 * 创建数组 DTO 工厂
 */
export function createArrayDto<T>(itemType: { new (...args: any[]): T }) {
  abstract class ArrayDto extends BaseDto {
    @ApiProperty({ description: '数组项', type: [itemType] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => itemType)
    items: T[];
  }
  return ArrayDto;
}
