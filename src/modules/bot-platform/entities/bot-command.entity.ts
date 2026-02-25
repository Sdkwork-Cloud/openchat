import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

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

export interface CommandChoice {
  name: string;
  value: string | number;
  nameLocalizations?: Record<string, string>;
}

export interface CommandOption {
  name: string;
  nameLocalizations?: Record<string, string>;
  description: string;
  descriptionLocalizations?: Record<string, string>;
  type: CommandOptionType;
  required?: boolean;
  choices?: CommandChoice[];
  options?: CommandOption[];
  channelTypes?: string[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  autocomplete?: boolean;
}

export type CommandContextType = 'private' | 'group' | 'supergroup' | 'channel';

@Entity('platform_bot_commands')
@Index(['botId', 'name'], { unique: true })
export class BotCommandEntity extends BaseEntity {
  @Column({ type: 'uuid', nullable: false, name: 'bot_id' })
  botId: string;

  @Column({ type: 'varchar', length: 32, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  description: string;

  @Column({ type: 'jsonb', nullable: true, name: 'name_localizations' })
  nameLocalizations?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true, name: 'description_localizations' })
  descriptionLocalizations?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  options?: CommandOption[];

  @Column({ type: 'simple-array', nullable: true, name: 'default_member_permissions' })
  defaultMemberPermissions?: string[];

  @Column({ type: 'boolean', nullable: false, default: true, name: 'dm_permission' })
  dmPermission: boolean;

  @Column({ type: 'simple-array', nullable: true })
  contexts?: CommandContextType[];

  @Column({ type: 'boolean', nullable: false, default: false })
  nsfw: boolean;

  @Column({ type: 'integer', nullable: false, default: 0 })
  version: number;

  @Column({ type: 'boolean', nullable: false, default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_synced_at' })
  lastSyncedAt?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'handler_endpoint' })
  handlerEndpoint?: string;
}
