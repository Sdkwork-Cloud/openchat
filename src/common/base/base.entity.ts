/**
 * 增强型实体基类
 * 
 * 提供通用的实体字段、方法、模式等
 * 支持软删除、审计字段、JSON 转换、数据验证等功能
 * 
 * @framework
 */

import {
  PrimaryGeneratedColumn,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
  Column,
  BaseEntity as TypeOrmBaseEntity,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsDateString, IsOptional } from 'class-validator';

/**
 * 实体状态枚举
 */
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

/**
 * 可见性枚举
 */
export enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INTERNAL = 'internal',
}

/**
 * 基础实体接口
 */
export interface IEntity<ID = string> {
  /** 实体 ID */
  id: ID;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 删除时间（软删除） */
  deletedAt?: Date | null;
  /** 版本号 */
  version?: number;
  /** 状态 */
  status?: EntityStatus;
  /** 元数据 */
  metadata?: Record<string, any> | null;
  /** 转换为普通对象 */
  toObject(): Record<string, any>;
  /** 转换为 JSON（排除敏感字段） */
  toJSON(options?: { excludeFields?: string[] }): Record<string, any>;
  /** 检查是否已删除 */
  isDeleted(): boolean;
  /** 检查是否活跃 */
  isActive(): boolean;
}

/**
 * 审计信息接口
 */
export interface IAuditable extends IEntity {
  /** 创建者 ID */
  createdBy?: string;
  /** 更新者 ID */
  updatedBy?: string;
  /** 删除者 ID */
  deletedBy?: string;
}

/**
 * 软删除实体接口
 */
export interface ISoftDelete extends IEntity {
  /** 删除时间 */
  deletedAt: Date | null;
  /** 删除者 ID */
  deletedBy?: string;
  /** 删除原因 */
  deleteReason?: string;
}

/**
 * 增强型实体基类
 */
export abstract class BaseEntity extends TypeOrmBaseEntity implements IEntity<string> {
  /**
   * 主键 ID（自增）
   */
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  @ApiProperty({ description: '实体 ID', example: 1 })
  @IsInt()
  @IsOptional()
  id: string;

  /**
   * 创建时间
   */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty({ description: '创建时间' })
  @IsDateString()
  @IsOptional()
  createdAt: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty({ description: '更新时间' })
  @IsDateString()
  @IsOptional()
  updatedAt: Date;

  /**
   * 删除时间（软删除）
   */
  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  @ApiPropertyOptional({ description: '删除时间' })
  @IsDateString()
  @IsOptional()
  deletedAt: Date | null;

  /**
   * 版本号（乐观锁）
   */
  @VersionColumn()
  @ApiPropertyOptional({ description: '版本号', example: 1 })
  @IsInt()
  @IsOptional()
  version: number;

  /**
   * 实体状态
   */
  @Column({ type: 'varchar', length: 20, default: EntityStatus.ACTIVE })
  @Index()
  @ApiProperty({ description: '状态', enum: EntityStatus, default: EntityStatus.ACTIVE })
  @IsString()
  @IsOptional()
  status: EntityStatus = EntityStatus.ACTIVE;

  /**
   * 元数据（JSON 字段）
   */
  @Column({ type: 'jsonb', nullable: true, default: null })
  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  metadata: Record<string, any> | null = null;

  /**
   * 转换为普通对象
   */
  toObject(): Record<string, any> {
    const obj: Record<string, any> = {};
    
    for (const key of Object.keys(this)) {
      const value = (this as any)[key];
      if (!(value instanceof Function)) {
        obj[key] = value instanceof Date ? value.toISOString() : value;
      }
    }
    
    return obj;
  }

  /**
   * 转换为 JSON（排除敏感字段）
   */
  toJSON(options?: { excludeFields?: string[] }): Record<string, any> {
    const excludeFields = options?.excludeFields || ['deletedAt', 'metadata'];
    const obj = this.toObject();
    
    for (const field of excludeFields) {
      delete obj[field];
    }
    
    return obj;
  }

  /**
   * 检查是否已删除
   */
  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  /**
   * 检查是否活跃
   */
  isActive(): boolean {
    return this.status === EntityStatus.ACTIVE && !this.isDeleted();
  }

  /**
   * 激活实体
   */
  activate(): this {
    this.status = EntityStatus.ACTIVE;
    this.deletedAt = null;
    return this;
  }

  /**
   * 停用实体
   */
  deactivate(): this {
    this.status = EntityStatus.INACTIVE;
    return this;
  }

  /**
   * 软删除实体
   */
  softDelete(reason?: string): this {
    this.status = EntityStatus.DELETED;
    this.deletedAt = new Date();
    if (reason) {
      (this as any).deleteReason = reason;
    }
    return this;
  }

  /**
   * 恢复已删除的实体
   */
  restore(): this {
    this.status = EntityStatus.ACTIVE;
    this.deletedAt = null;
    (this as any).deleteReason = undefined;
    return this;
  }

  /**
   * 更新元数据
   */
  updateMetadata(data: Record<string, any>): this {
    this.metadata = {
      ...this.metadata,
      ...data,
    };
    return this;
  }

  /**
   * 获取元数据字段
   */
  getMetadataField<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.metadata) return defaultValue;
    return (this.metadata[key] as T) ?? defaultValue;
  }

  /**
   * 设置元数据字段
   */
  setMetadataField<T>(key: string, value: T): this {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
    return this;
  }

  /**
   * 删除元数据字段
   */
  deleteMetadataField(key: string): this {
    if (this.metadata && key in this.metadata) {
      delete this.metadata[key];
    }
    return this;
  }

  /**
   * 插入前钩子
   */
  @BeforeInsert()
  beforeInsert(): void {
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    if (!this.updatedAt) {
      this.updatedAt = new Date();
    }
    if (this.version === undefined || this.version === null) {
      this.version = 1;
    }
    if (!this.status) {
      this.status = EntityStatus.ACTIVE;
    }
  }

  /**
   * 更新前钩子
   */
  @BeforeUpdate()
  beforeUpdate(): void {
    this.updatedAt = new Date();
    if (this.version !== undefined && this.version !== null) {
      this.version++;
    }
  }
}

/**
 * 带审计字段的实体基类
 */
export abstract class AuditableEntity extends BaseEntity implements IAuditable {
  /**
   * 创建者 ID
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  @ApiPropertyOptional({ description: '创建者 ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;

  /**
   * 更新者 ID
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  @ApiPropertyOptional({ description: '更新者 ID' })
  @IsString()
  @IsOptional()
  updatedBy?: string;

  /**
   * 删除者 ID
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  @ApiPropertyOptional({ description: '删除者 ID' })
  @IsString()
  @IsOptional()
  deletedBy?: string;

  /**
   * 删除原因
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  @ApiPropertyOptional({ description: '删除原因' })
  @IsString()
  @IsOptional()
  deleteReason?: string;

  /**
   * 设置审计信息
   */
  setAuditInfo(userId: string, isUpdate: boolean = false): this {
    if (isUpdate) {
      this.updatedBy = userId;
    } else {
      this.createdBy = userId;
    }
    return this;
  }

  /**
   * 转换为 JSON
   */
  override toJSON(options?: { excludeFields?: string[] }): Record<string, any> {
    const excludeFields = options?.excludeFields || [
      'deletedAt',
      'deletedBy',
      'deleteReason',
      'metadata',
    ];
    return super.toJSON({ excludeFields });
  }
}

/**
 * 带所有者的实体基类
 */
export abstract class OwnedEntity extends AuditableEntity {
  /**
   * 所有者 ID
   */
  @Column({ type: 'varchar', length: 64 })
  @Index()
  @ApiProperty({ description: '所有者 ID' })
  @IsString()
  ownerId: string;

  /**
   * 检查用户是否是所有者
   */
  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }
}

/**
 * 带可见性的实体基类
 */
export abstract class VisibleEntity extends AuditableEntity {
  /**
   * 可见性
   */
  @Column({ type: 'varchar', length: 20, default: Visibility.PRIVATE })
  @Index()
  @ApiProperty({ description: '可见性', enum: Visibility, default: Visibility.PRIVATE })
  @IsString()
  @IsOptional()
  visibility: Visibility = Visibility.PRIVATE;

  /**
   * 检查是否对指定用户可见
   */
  isVisibleTo(userId: string, _userRole?: string): boolean {
    switch (this.visibility) {
      case Visibility.PUBLIC:
        return true;
      case Visibility.PRIVATE:
        return this.isOwner(userId);
      case Visibility.INTERNAL:
        return !!userId; // 登录用户可见
      default:
        return false;
    }
  }

  /**
   * 检查是否是公开的
   */
  isPublic(): boolean {
    return this.visibility === Visibility.PUBLIC;
  }

  /**
   * 检查是否是私有的
   */
  isPrivate(): boolean {
    return this.visibility === Visibility.PRIVATE;
  }

  /**
   * 设置可见性
   */
  setVisibility(visibility: Visibility): this {
    this.visibility = visibility;
    return this;
  }

  /**
   * 设置为公开
   */
  makePublic(): this {
    this.visibility = Visibility.PUBLIC;
    return this;
  }

  /**
   * 设置为私有
   */
  makePrivate(): this {
    this.visibility = Visibility.PRIVATE;
    return this;
  }

  /**
   * 检查是否是所有者
   */
  protected isOwner(userId: string): boolean {
    return (this as any).ownerId === userId;
  }
}

/**
 * 带排序的实体基类
 */
export abstract class SortableEntity extends AuditableEntity {
  /**
   * 排序顺序
   */
  @Column({ type: 'int', default: 0 })
  @Index()
  @ApiPropertyOptional({ description: '排序顺序', example: 0 })
  @IsInt()
  @IsOptional()
  sortOrder: number = 0;

  /**
   * 父级 ID（用于树形结构）
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  @ApiPropertyOptional({ description: '父级 ID' })
  @IsString()
  @IsOptional()
  parentId?: string;

  /**
   * 路径（用于树形结构）
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  @Index()
  @ApiPropertyOptional({ description: '路径' })
  @IsString()
  @IsOptional()
  path?: string;

  /**
   * 层级（用于树形结构）
   */
  @Column({ type: 'int', default: 0 })
  @ApiPropertyOptional({ description: '层级', example: 0 })
  @IsInt()
  @IsOptional()
  level: number = 0;
}

/**
 * 带标签的实体 mixin
 */
export interface Taggable {
  /** 标签 */
  tags: string[];
  /** 添加标签 */
  addTag(tag: string): this;
  /** 移除标签 */
  removeTag(tag: string): this;
  /** 检查是否有标签 */
  hasTag(tag: string): boolean;
}

/**
 * 标签实体 mixin
 */
export function TaggableEntity<TBase extends new (...args: any[]) => AuditableEntity>(Base: TBase) {
  abstract class Taggable extends Base implements Taggable {
    @Column({ type: 'varchar', array: true, default: [] })
    @ApiPropertyOptional({ description: '标签列表', type: [String] })
    @IsString({ each: true })
    @IsOptional()
    tags: string[] = [];

    constructor(...args: any[]) {
      super(...args);
    }

    addTag(tag: string): this {
      if (!this.tags.includes(tag)) {
        this.tags.push(tag);
      }
      return this;
    }

    removeTag(tag: string): this {
      this.tags = this.tags.filter(t => t !== tag);
      return this;
    }

    hasTag(tag: string): boolean {
      return this.tags.includes(tag);
    }

    hasAnyTag(tags: string[]): boolean {
      return tags.some(tag => this.tags.includes(tag));
    }

    hasAllTags(tags: string[]): boolean {
      return tags.every(tag => this.tags.includes(tag));
    }
  }

  return Taggable;
}

/**
 * 带描述的实体 mixin
 */
export interface Describable {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 备注 */
  remark?: string;
}

/**
 * 描述实体 mixin
 */
export function DescribableEntity<TBase extends new (...args: any[]) => AuditableEntity>(Base: TBase) {
  abstract class Describable extends Base implements Describable {
    @Column({ type: 'varchar', length: 200, nullable: true })
    @ApiPropertyOptional({ description: '标题' })
    @IsString()
    @IsOptional()
    title?: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    @ApiPropertyOptional({ description: '描述' })
    @IsString()
    @IsOptional()
    description?: string;

    @Column({ type: 'text', nullable: true })
    @ApiPropertyOptional({ description: '备注' })
    @IsString()
    @IsOptional()
    remark?: string;

    constructor(...args: any[]) {
      super(...args);
    }
  }

  return Describable;
}

/**
 * UUID 主键实体基类
 */
export abstract class UUIDEntity extends BaseEntity implements IEntity<string> {
  /**
   * 主键 ID（UUID）
   */
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: '实体 ID (UUID)' })
  @IsString()
  id: string;
}

/**
 * Snowflake ID 主键实体基类
 */
export abstract class SnowflakeEntity extends BaseEntity implements IEntity<string> {
  /**
   * 主键 ID（Snowflake）
   */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  @ApiProperty({ description: '实体 ID (Snowflake)' })
  @IsString()
  id: string;
}
