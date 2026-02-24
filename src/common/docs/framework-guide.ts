/**
 * OpenChat 框架使用指南
 * 框架级别的通用组件和最佳实践
 *
 * @framework
 */

/**
 * # OpenChat 框架使用指南
 *
 * ## 目录
 *
 * 1. [快速开始](#快速开始)
 * 2. [核心组件](#核心组件)
 * 3. [最佳实践](#最佳实践)
 * 4. [示例代码](#示例代码)
 *
 * ---
 *
 * ## 快速开始
 *
 * ### 1. 创建新模块
 *
 * ```typescript
 * // user.module.ts
 * import { Module } from '@nestjs/common';
 * import { UserController } from './user.controller';
 * import { UserService } from './user.service';
 *
 * @Module({
 *   controllers: [UserController],
 *   providers: [UserService],
 *   exports: [UserService],
 * })
 * export class UserModule {}
 * ```
 *
 * ### 2. 创建实体
 *
 * ```typescript
 * // user.entity.ts
 * import { Entity, Column, Index } from 'typeorm';
 * import { AuditableEntity } from '@/common/base/base.entity';
 *
 * @Entity('users')
 * export class UserEntity extends AuditableEntity {
 *   @Column({ unique: true })
 *   @Index()
 *   username: string;
 *
 *   @Column()
 *   nickname: string;
 *
 *   @Column({ nullable: true })
 *   avatar?: string;
 *
 *   @Column({ default: 'active' })
 *   status: string;
 * }
 * ```
 *
 * ### 3. 创建 DTO
 *
 * ```typescript
 * // dto/create-user.dto.ts
 * import { ApiProperty } from '@nestjs/swagger';
 * import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';
 * import { CreateDto } from '@/common/dto/base.dto';
 *
 * export class CreateUserDto extends CreateDto {
 *   @ApiProperty({ description: '用户名' })
 *   @IsString()
 *   @MinLength(3)
 *   @MaxLength(20)
 *   username: string;
 *
 *   @ApiProperty({ description: '邮箱' })
 *   @IsEmail()
 *   email: string;
 *
 *   @ApiProperty({ description: '昵称' })
 *   @IsString()
 *   @MaxLength(50)
 *   nickname: string;
 * }
 * ```
 *
 * ### 4. 创建服务
 *
 * ```typescript
 * // user.service.ts
 * import { Injectable } from '@nestjs/common';
 * import { InjectRepository } from '@nestjs/typeorm';
 * import { Repository } from 'typeorm';
 * import { UserEntity } from './user.entity';
 * import { CrudService } from '@/common/base/crud.service';
 * import { Audit } from '@/common/decorators/audit.decorator';
 * import { OperationType } from '@/common/decorators/audit.decorator';
 *
 * @Injectable()
 * export class UserService extends CrudService<UserEntity> {
 *   constructor(
 *     @InjectRepository(UserEntity)
 *     private userRepository: Repository<UserEntity>,
 *   ) {
 *     super(dataSource, userRepository);
 *   }
 *
 *   @Audit({ operation: OperationType.CREATE, description: '创建用户' })
 *   async createUser(dto: CreateUserDto): Promise<UserEntity> {
 *     return this.create(dto);
 *   }
 * }
 * ```
 *
 * ### 5. 创建控制器
 *
 * ```typescript
 * // user.controller.ts
 * import { Controller, Get, Post, Body, Param } from '@nestjs/common';
 * import { ApiTags, ApiOperation } from '@nestjs/swagger';
 * import { UserService } from './user.service';
 * import { CreateUserDto } from './dto/create-user.dto';
 * import { UpdateUserDto } from './dto/update-user.dto';
 * import {
 *   ApiEndpoint,
 *   ApiSuccessResponse,
 *   ApiErrorResponses,
 *   CurrentUser,
 *   Audit,
 *   OperationType,
 * } from '@/common';
 *
 * @ApiTags('用户管理')
 * @Controller('users')
 * export class UserController {
 *   constructor(private readonly userService: UserService) {}
 *
 *   @Post()
 *   @ApiOperation({ summary: '创建用户' })
 *   @ApiSuccessResponse(UserEntity)
 *   @ApiErrorResponses({ badRequest: true, unauthorized: true })
 *   @Audit({ operation: OperationType.CREATE, description: '创建用户' })
 *   async create(@Body() dto: CreateUserDto) {
 *     return this.userService.create(dto);
 *   }
 *
 *   @Get(':id')
 *   @ApiOperation({ summary: '获取用户' })
 *   @ApiSuccessResponse(UserEntity)
 *   async findOne(@Param('id') id: string) {
 *     return this.userService.findOneOrFail(id);
 *   }
 *
 *   @Get()
 *   @ApiOperation({ summary: '获取用户列表' })
 *   @ApiSuccessResponse(UserEntity, { isPaged: true })
 *   async findAll(@PaginationParams() params: PaginationParams) {
 *     return this.userService.findWithPagination(params);
 *   }
 * }
 * ```
 *
 * ---
 *
 * ## 核心组件
 *
 * ### 基础实体类
 *
 * | 类名 | 描述 | 包含字段 |
 * |------|------|----------|
 * | `BaseEntity` | 基础实体 | id, createdAt, updatedAt, deletedAt, version, status, metadata |
 * | `AuditableEntity` | 审计实体 | 基础实体 + createdBy, updatedBy, deletedBy |
 * | `OwnedEntity` | 所有者实体 | 审计实体 + ownerId |
 * | `VisibleEntity` | 可见性实体 | 审计实体 + visibility |
 * | `SortableEntity` | 排序实体 | 审计实体 + sortOrder, parentId, path, level |
 * | `UUIDEntity` | UUID 主键实体 | UUID 主键 |
 * | `SnowflakeEntity` | 雪花 ID 主键实体 | 雪花 ID 主键 |
 *
 * ### 基础服务类
 *
 * | 类名 | 描述 | 主要方法 |
 * |------|------|----------|
 * | `BaseService` | 基础服务 | 事务处理、批量操作 |
 * | `CrudService<T>` | CRUD 服务 | create, findOne, findAll, update, remove |
 * | `EnhancedCacheService` | 增强缓存 | get, set, del, getOrSet, warmup |
 * | `EventBusService` | 事件总线 | publish, subscribe, replayEvents |
 * | `BatchOperationService` | 批量操作 | processBatch, bulkCreate, bulkDelete |
 *
 * ### 装饰器
 *
 * #### API 装饰器
 * - `@ApiEndpoint()` - API 端点装饰器
 * - `@ApiSuccessResponse()` - 成功响应装饰器
 * - `@ApiErrorResponses()` - 错误响应装饰器
 * - `@ApiPaginatedResponse()` - 分页响应装饰器
 *
 * #### 认证授权装饰器
 * - `@Public()` - 公开路由
 * - `@RequireAuth()` - 需要认证
 * - `@Roles()` - 角色限制
 * - `@Permissions()` - 权限限制
 * - `@ResourceAccess()` - 资源访问限制
 *
 * #### 缓存装饰器
 * - `@Cache()` - 缓存装饰器
 * - `@CacheClear()` - 缓存清除装饰器
 *
 * #### 事务装饰器
 * - `@Transaction()` - 事务装饰器
 * - `@ReadOnlyTransaction()` - 只读事务
 *
 * #### 审计装饰器
 * - `@Audit()` - 审计装饰器
 * - `@AuditCreate()` - 创建审计
 * - `@AuditUpdate()` - 更新审计
 * - `@AuditDelete()` - 删除审计
 *
 * #### 用户上下文装饰器
 * - `@CurrentUser()` - 当前用户
 * - `@CurrentUserId()` - 当前用户 ID
 * - `@CurrentUserRoles()` - 当前用户角色
 * - `@RequestId()` - 请求 ID
 * - `@ClientIp()` - 客户端 IP
 *
 * ### 管道
 *
 * | 管道 | 描述 | 用法 |
 * |------|------|------|
 * | `ParseJsonPipe` | JSON 解析 | `@Body(new ParseJsonPipe())` |
 * | `ParseBooleanPipe` | 布尔值解析 | `@Query('flag', new ParseBooleanPipe())` |
 * | `ParseArrayPipe` | 数组解析 | `@Query('ids', new ParseArrayPipe())` |
 * | `TrimPipe` | 字符串修剪 | `@Body(new TrimPipe())` |
 * | `SanitizePipe` | 数据清理 | `@Body(new SanitizePipe())` |
 * | `ValidateDtoPipe` | DTO 验证 | `@Body(new ValidateDtoPipe(CreateUserDto))` |
 * | `FileValidationPipe` | 文件验证 | `@UploadedFile(new FileValidationPipe())` |
 *
 * ### DTO 基类
 *
 * | 基类 | 描述 | 用途 |
 * |------|------|------|
 * | `BaseDto` | 基础 DTO | 所有 DTO 的基类 |
 * | `CreateDto` | 创建 DTO | 创建操作 |
 * | `UpdateDto` | 更新 DTO | 更新操作 |
 * | `PartialUpdateDto` | 部分更新 DTO | PATCH 请求 |
 * | `DeleteDto` | 删除 DTO | 删除操作 |
 * | `SearchDto` | 搜索 DTO | 搜索操作 |
 * | `FilterDto` | 过滤 DTO | 复杂过滤 |
 * | `SortDto` | 排序 DTO | 排序参数 |
 *
 * ### 响应 DTO
 *
 * | 响应 DTO | 描述 |
 * |----------|------|
 * | `SuccessResponseDto<T>` | 成功响应 |
 * | `ErrorResponseDto` | 错误响应 |
 * | `PagedResponseDto<T>` | 分页响应 |
 * | `CursorPagedResponseDto<T>` | 游标分页响应 |
 * | `EmptyResponseDto` | 空响应 |
 * | `BooleanResponseDto` | 布尔响应 |
 * | `IdResponseDto` | ID 响应 |
 * | `BatchResponseDto<T>` | 批量操作响应 |
 * | `TaskResponseDto` | 任务响应 |
 *
 * ---
 *
 * ## 最佳实践
 *
 * ### 1. 错误处理
 *
 * ```typescript
 * // 使用业务异常
 * throw new BusinessException(
 *   BusinessErrorCode.RESOURCE_NOT_FOUND,
 *   {
 *     customMessage: '用户不存在',
 *     details: { userId: id },
 *   },
 * );
 *
 * // 或使用快捷方法
 * throw BusinessException.notFound('User', id);
 * throw BusinessException.permissionDenied('update', 'user');
 * ```
 *
 * ### 2. 缓存使用
 *
 * ```typescript
 * // 使用装饰器
 * @Cache({ key: (userId: string) => `user:${userId}`, ttl: 300 })
 * async getUser(userId: string) {
 *   return this.userService.findOne(userId);
 * }
 *
 * // 或使用服务
 * const user = await this.cache.getOrSet(
 *   `user:${userId}`,
 *   () => this.userService.findOne(userId),
 *   { ttl: 300 }
 * );
 * ```
 *
 * ### 3. 事务处理
 *
 * ```typescript
 * // 使用装饰器
 * @Transaction()
 * async transfer(from: string, to: string, amount: number) {
 *   await this.accountService.debit(from, amount);
 *   await this.accountService.credit(to, amount);
 * }
 *
 * // 或使用服务
 * await this.userService.transaction(async (manager) => {
 *   await manager.save(user);
 *   await manager.save(log);
 * });
 * ```
 *
 * ### 4. 事件驱动
 *
 * ```typescript
 * // 发布事件
 * await this.eventBus.publish('user.created', { userId: user.id });
 *
 * // 订阅事件
 * @OnEvent('user.created')
 * async handleUserCreated(event: IEvent) {
 *   await this.sendWelcomeEmail(event.data.userId);
 * }
 * ```
 *
 * ### 5. 批量操作
 *
 * ```typescript
 * const result = await this.batchService.processBatch(
 *   items,
 *   async (item) => this.processItem(item),
 *   { batchSize: 20, concurrency: 5 }
 * );
 * ```
 *
 * ### 6. 性能优化
 *
 * ```typescript
 * // 使用分页
 * const users = await this.userService.findWithPagination({
 *   page: 1,
 *   pageSize: 20,
 * });
 *
 * // 使用游标分页（大数据量）
 * const messages = await this.messageService.findWithCursor({
 *   cursor: lastMessageId,
 *   limit: 50,
 * });
 *
 * // 批量加载关联数据
 * const users = await this.userService.findByIds(ids, {
 *   relations: ['profile', 'settings'],
 * });
 * ```
 *
 * ---
 *
 * ## 示例代码
 *
 * ### 完整的 CRUD 示例
 *
 * ```typescript
 * // product.entity.ts
 * @Entity('products')
 * export class Product extends AuditableEntity {
 *   @Column()
 *   name: string;
 *
 *   @Column('decimal', { precision: 10, scale: 2 })
 *   price: number;
 *
 *   @Column({ default: 0 })
 *   stock: number;
 *
 *   @Column({ nullable: true })
 *   description?: string;
 * }
 *
 * // dto/create-product.dto.ts
 * export class CreateProductDto extends CreateDto {
 *   @IsString()
 *   @MinLength(2)
 *   name: string;
 *
 *   @IsNumber()
 *   @Min(0)
 *   price: number;
 *
 *   @IsNumber()
 *   @Min(0)
 *   stock: number;
 *
 *   @IsString()
 *   @IsOptional()
 *   description?: string;
 * }
 *
 * // dto/update-product.dto.ts
 * export class UpdateProductDto extends PartialUpdateDto {
 *   @IsString()
 *   @IsOptional()
 *   name?: string;
 *
 *   @IsNumber()
 *   @IsOptional()
 *   price?: number;
 *
 *   @IsNumber()
 *   @IsOptional()
 *   stock?: number;
 * }
 *
 * // product.service.ts
 * @Injectable()
 * export class ProductService extends CrudService<Product> {
 *   constructor(
 *     @InjectRepository(Product)
 *     private productRepository: Repository<Product>,
 *   ) {
 *     super(dataSource, productRepository);
 *   }
 *
 *   @Audit({ operation: OperationType.CREATE, description: '创建产品' })
 *   async createProduct(dto: CreateProductDto): Promise<Product> {
 *     return this.create(dto);
 *   }
 *
 *   async updateStock(id: string, delta: number): Promise<Product> {
 *     return this.withTransaction(async (manager) => {
 *       const product = await this.findOneOrFail(id);
 *       product.stock += delta;
 *       if (product.stock < 0) {
 *         throw new BusinessException(
 *           BusinessErrorCode.OPERATION_FAILED,
 *           { customMessage: '库存不足' },
 *         );
 *       }
 *       return manager.save(product);
 *     });
 *   }
 * }
 *
 * // product.controller.ts
 * @ApiTags('产品管理')
 * @Controller('products')
 * export class ProductController {
 *   constructor(private readonly productService: ProductService) {}
 *
 *   @Post()
 *   @AuditCreate('创建产品')
 *   async create(@Body() dto: CreateProductDto) {
 *     return this.productService.createProduct(dto);
 *   }
 *
 *   @Put(':id')
 *   @AuditUpdate('更新产品')
 *   async update(
 *     @Param('id') id: string,
 *     @Body() dto: UpdateProductDto,
 *   ) {
 *     return this.productService.update(id, dto);
 *   }
 *
 *   @Delete(':id')
 *   @AuditDelete('删除产品')
 *   async remove(@Param('id') id: string) {
 *     return this.productService.remove(id);
 *   }
 *
 *   @Get(':id')
 *   async findOne(@Param('id') id: string) {
 *     return this.productService.findOneOrFail(id);
 *   }
 *
 *   @Get()
 *   async findAll(@SearchParams() params: SearchParams) {
 *     return this.productService.findWithPagination(params);
 *   }
 *
 *   @Post(':id/stock')
 *   async updateStock(
 *     @Param('id') id: string,
 *     @Body('delta') delta: number,
 *   ) {
 *     return this.productService.updateStock(id, delta);
 *   }
 * }
 * ```
 *
 * ---
 *
 * ## 配置说明
 *
 * ### 环境变量
 *
 * ```bash
 * # 应用配置
 * NODE_ENV=development
 * APP_NAME=OpenChat Server
 * PORT=3000
 *
 * # 数据库配置
 * DB_HOST=localhost
 * DB_PORT=5432
 * DB_USER=openchat
 * DB_PASSWORD=your_password
 * DB_NAME=openchat
 *
 * # Redis 配置
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 *
 * # JWT 配置（必需）
 * JWT_SECRET=your-jwt-secret-at-least-32-characters-long
 *
 * # 缓存配置
 * CACHE_ENABLED=true
 * CACHE_TTL=300
 *
 * # 限流配置
 * RATE_LIMIT_ENABLED=true
 * RATE_LIMIT_MAX=100
 * RATE_LIMIT_TTL=60
 * ```
 *
 * ---
 *
 * 如需更多帮助，请查看项目文档或联系技术支持。
 */

export const FRAMEWORK_GUIDE = '';
