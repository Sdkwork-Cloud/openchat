import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export abstract class BaseDto {
  @ApiPropertyOptional({ description: '唯一标识' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'UUID' })
  @IsOptional()
  @IsUUID()
  uuid?: string;
}

export abstract class TimestampDto {
  @ApiPropertyOptional({ description: '创建时间' })
  @IsOptional()
  @IsDateString()
  createdAt?: Date;

  @ApiPropertyOptional({ description: '更新时间' })
  @IsOptional()
  @IsDateString()
  updatedAt?: Date;
}

export abstract class BaseEntityDto extends BaseDto {}

export abstract class AuditableDto extends BaseEntityDto {
  @ApiPropertyOptional({ description: '创建者ID' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: '更新者ID' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class StringIdParamDto {
  @ApiProperty({ description: 'ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class UuidParamDto {
  @ApiProperty({ description: 'UUID' })
  @IsUUID()
  @IsNotEmpty()
  uuid: string;
}

export class NumericIdParamDto {
  @ApiProperty({ description: 'ID' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  id: number;
}

export class DateRangeDto {
  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EmailDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class PhoneDto {
  @ApiProperty({ description: '手机号码' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '请输入有效的手机号码' })
  @IsNotEmpty()
  phone: string;
}

export class PasswordDto {
  @ApiProperty({ description: '密码', minLength: 8, maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: '密码必须包含字母和数字',
  })
  password: string;
}

export class UsernameDto {
  @ApiProperty({ description: '用户名', minLength: 3, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: '用户名必须以字母开头，只能包含字母、数字和下划线',
  })
  username: string;
}

export class NicknameDto {
  @ApiProperty({ description: '昵称', minLength: 1, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  nickname: string;
}

export class UrlDto {
  @ApiProperty({ description: 'URL地址' })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}

export class IdsDto {
  @ApiProperty({ description: 'ID列表', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids: string[];
}

export class SortDto {
  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class StatusDto {
  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class KeywordDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}

export class BooleanQueryDto {
  @ApiPropertyOptional({ description: '布尔值' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  value?: boolean;
}

export class NumberRangeDto {
  @ApiPropertyOptional({ description: '最小值' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ description: '最大值' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  max?: number;
}

export class FileUploadDto {
  @ApiPropertyOptional({ description: '文件名称' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @ApiPropertyOptional({ description: '文件大小(字节)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  size?: number;

  @ApiPropertyOptional({ description: '文件MIME类型' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CoordinatesDto {
  @ApiProperty({ description: '纬度' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: '经度' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class PaginationQueryDto extends SortDto {
  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  get offset(): number {
    return ((this.page || 1) - 1) * (this.pageSize || 20);
  }
}

export class SearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}

export function createEnumDto<T extends Record<string, string>>(
  enumObj: T,
  name: string,
): new () => { value: T[keyof T] } {
  class EnumDtoClass {
    @ApiProperty({ description: `${name}值`, enum: enumObj })
    @IsEnum(enumObj)
    @IsNotEmpty()
    value: T[keyof T];
  }
  return EnumDtoClass;
}

export function createArrayDto<T>(
  itemDto: new () => T,
  options: { minItems?: number; maxItems?: number } = {},
): new () => { items: T[] } {
  const { minItems = 0, maxItems = 100 } = options;

  class ArrayDtoClass {
    @ApiProperty({ description: '项目列表', type: [itemDto] })
    @ValidateNested({ each: true })
    @Type(() => itemDto)
    @IsArray()
    @ArrayMinSize(minItems)
    @ArrayMaxSize(maxItems)
    items: T[];
  }
  return ArrayDtoClass;
}
