import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum BotIntent {
  MESSAGES = 1 << 0,
  MESSAGE_CONTENT = 1 << 1,
  USERS = 1 << 2,
  GROUPS = 1 << 3,
  REACTIONS = 1 << 4,
  TYPING = 1 << 5,
  PRESENCE = 1 << 6,
  VOICE = 1 << 7,
  COMMANDS = 1 << 8,
  INTERACTIONS = 1 << 9,
  FILES = 1 << 10,
}

export type BotScope =
  | 'bot:basic'
  | 'messages:read'
  | 'messages:send'
  | 'messages:manage'
  | 'users:read'
  | 'users:read:email'
  | 'groups:read'
  | 'groups:manage'
  | 'files:read'
  | 'files:write'
  | 'webhook'
  | 'commands'
  | 'interactions'
  | 'voice'
  | 'rtc'
  | 'admin';

export type BotStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  filters?: {
    conversations?: string[];
    users?: string[];
    groups?: string[];
  };
  retryPolicy: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  timeout: number;
}

export interface BotStats {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalUsersInteracted: number;
  totalGroupsJoined: number;
  totalCommandsExecuted: number;
  totalInteractions: number;
  lastActivityAt?: Date;
}

@Entity('platform_bots')
@Index(['username'], { unique: true })
@Index(['appId'], { unique: true })
@Index(['tokenHash'], { unique: true })
export class BotEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 32, nullable: false, unique: true, name: 'app_id' })
  appId: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  homepage?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'developer_name' })
  developerName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'developer_email' })
  developerEmail?: string;

  @Column({ type: 'varchar', length: 100, nullable: false, select: false, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'integer', nullable: false, default: 0 })
  intents: number;

  @Column({ type: 'simple-array', nullable: false, default: '' })
  scopes: BotScope[];

  @Column({ type: 'jsonb', nullable: true })
  webhook?: WebhookConfig;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'inactive'
  })
  status: BotStatus;

  @Column({ type: 'text', nullable: true, name: 'status_reason' })
  statusReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  stats?: BotStats;

  @Column({ type: 'uuid', nullable: false, name: 'created_by' })
  createdBy: string;

  @Column({ type: 'timestamp', nullable: true, name: 'activated_at' })
  activatedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_token_rotated_at' })
  lastTokenRotatedAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'deleted_by' })
  deletedBy?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  hasIntent(intent: BotIntent): boolean {
    return (this.intents & intent) === intent;
  }

  addIntent(intent: BotIntent): void {
    this.intents |= intent;
  }

  removeIntent(intent: BotIntent): void {
    this.intents &= ~intent;
  }

  hasScope(scope: BotScope): boolean {
    return this.scopes.includes(scope) || this.scopes.includes('bot:basic');
  }

  isAdmin(): boolean {
    return this.scopes.includes('admin');
  }

  updateStats(updates: Partial<BotStats>): void {
    this.stats = {
      totalMessagesSent: this.stats?.totalMessagesSent || 0,
      totalMessagesReceived: this.stats?.totalMessagesReceived || 0,
      totalUsersInteracted: this.stats?.totalUsersInteracted || 0,
      totalGroupsJoined: this.stats?.totalGroupsJoined || 0,
      totalCommandsExecuted: this.stats?.totalCommandsExecuted || 0,
      totalInteractions: this.stats?.totalInteractions || 0,
      ...this.stats,
      ...updates,
      lastActivityAt: new Date()
    };
  }

  incrementMessagesSent(): void {
    if (!this.stats) {
      this.stats = {
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        totalUsersInteracted: 0,
        totalGroupsJoined: 0,
        totalCommandsExecuted: 0,
        totalInteractions: 0
      };
    }
    this.stats.totalMessagesSent++;
    this.stats.lastActivityAt = new Date();
  }

  incrementMessagesReceived(): void {
    if (!this.stats) {
      this.stats = {
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        totalUsersInteracted: 0,
        totalGroupsJoined: 0,
        totalCommandsExecuted: 0,
        totalInteractions: 0
      };
    }
    this.stats.totalMessagesReceived++;
    this.stats.lastActivityAt = new Date();
  }
}
