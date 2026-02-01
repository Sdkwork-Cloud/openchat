import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 命令选项类型（参考 Discord Application Command Option Types）
 */
export enum CommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}

/**
 * 命令选项选择项
 */
export interface CommandChoice {
  name: string;
  value: string | number;
  nameLocalizations?: Record<string, string>;
}

/**
 * 命令选项
 */
export interface CommandOption {
  name: string;
  nameLocalizations?: Record<string, string>;
  description: string;
  descriptionLocalizations?: Record<string, string>;
  type: CommandOptionType;
  required?: boolean;
  choices?: CommandChoice[];
  options?: CommandOption[];      // 子命令选项
  channelTypes?: string[];        // 频道类型限制
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  autocomplete?: boolean;         // 是否启用自动补全
}

/**
 * 命令上下文类型
 */
export type CommandContextType = 'private' | 'group' | 'supergroup' | 'channel';

/**
 * Bot 命令实体
 * 存储 Bot 注册的斜杠命令
 */
@Entity('platform_bot_commands')
@Index(['botId', 'name'], { unique: true })
export class BotCommandEntity extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  botId: string;                  // 所属 Bot ID

  @Column({ type: 'varchar', length: 32, nullable: false })
  name: string;                   // 命令名称（1-32字符，小写+下划线）

  @Column({ type: 'varchar', length: 100, nullable: false })
  description: string;            // 命令描述（1-100字符）

  @Column({ type: 'jsonb', nullable: true })
  nameLocalizations?: Record<string, string>;  // 多语言名称

  @Column({ type: 'jsonb', nullable: true })
  descriptionLocalizations?: Record<string, string>;  // 多语言描述

  @Column({ type: 'jsonb', nullable: true })
  options?: CommandOption[];      // 命令选项

  @Column({ type: 'simple-array', nullable: true })
  defaultMemberPermissions?: string[];  // 默认需要的成员权限

  @Column({ type: 'boolean', nullable: false, default: true })
  dmPermission: boolean;          // 是否可在私信使用

  @Column({ type: 'simple-array', nullable: true })
  contexts?: CommandContextType[]; // 可用上下文

  @Column({ type: 'boolean', nullable: false, default: false })
  nsfw: boolean;                  // 是否 NSFW

  @Column({ type: 'integer', nullable: false, default: 0 })
  version: number;                // 命令版本（用于更新）

  @Column({ type: 'boolean', nullable: false, default: true })
  isActive: boolean;              // 是否激活

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt?: Date;            // 上次同步时间

  @Column({ type: 'varchar', length: 500, nullable: true })
  handlerEndpoint?: string;       // 自定义处理端点（可选）
}
