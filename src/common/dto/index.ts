/**
 * DTO 模块索引
 * 提供通用的数据传输对象
 *
 * @framework
 */

// 基础 DTO（明确导出，避免重复）
export {
  BaseDto,
  CreateDto,
  UpdateDto,
  PartialUpdateDto,
  DeleteDto,
  BatchDto,
  BatchCreateDto,
  BatchUpdateDto,
  BatchDeleteDto,
  ImportDto,
  ExportDto,
  SearchDto,
  FilterDto,
  SortDto,
  StatsDto,
  ChangeStatusDto,
  TimestampDto,
  BaseEntityDto,
  AuditableDto,
  PaginationQueryDto,
  SearchQueryDto,
  StatusDto,
  KeywordDto,
  IdsDto,
  DateRangeDto,
  EmailDto,
  PhoneDto,
  PasswordDto,
  UsernameDto,
  NicknameDto,
  UrlDto,
  NumericIdParamDto,
  StringIdParamDto,
  UuidParamDto,
  CoordinatesDto,
  FileUploadDto,
  BooleanQueryDto,
  NumberRangeDto,
  createEnumDto,
  createArrayDto,
} from './base.dto';

// 分页和游标 DTO
export {
  BaseQueryDto,
  CursorQueryDto,
} from './base-query.dto';

// 响应 DTO
export * from './response.dto';
