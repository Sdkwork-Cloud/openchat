import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * Bot Intent 枚举（参考 Discord Gateway Intents）
 * 使用位掩码设计，支持组合
 */
export enum BotIntent {
  MESSAGES = 1 << 0,            // 消息事件
  MESSAGE_CONTENT = 1 << 1,     // 消息内容（敏感，需要单独申请）
  USERS = 1 << 2,               // 用户信息变更
  GROUPS = 1 << 3,              // 群组信息变更
  REACTIONS = 1 << 4,           // 消息反应
  TYPING = 1 << 5,              // 输入状态
  PRESENCE = 1 << 6,            // 在线状态
  VOICE = 1 << 7,               // 语音状态
  COMMANDS = 1 << 8,            // 命令交互
  INTERACTIONS = 1 << 9,        // 组件交互
  FILES = 1 << 10,              // 文件事件
}

/**
 * Bot Scope 权限范围（参考 Slack OAuth Scopes）
 */
export type BotScope =
  | 'bot:basic'                 // 基础功能
  | 'messages:read'             // 读取消息
  | 'messages:send'             // 发送消息
  | 'messages:manage'           // 管理消息（编辑、删除）
  | 'users:read'                // 读取用户信息
  | 'users:read:email'          // 读取用户邮箱
  | 'groups:read'               // 读取群组信息
  | 'groups:manage'             // 管理群组
  | 'files:read'                // 读取文件
  | 'files:write'               // 上传文件
  | 'webhook'                   // 接收 Webhook 事件
  | 'commands'                  // 注册斜杠命令
  | 'interactions'              // 使用交互组件
  | 'voice'                     // 语音相关
  | 'rtc'                       // 实时音视频
  | 'admin';                    // 管理权限（敏感）

/**
 * Bot 状态
 */
export type BotStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

/**
 * Webhook 配置
 */
export interface WebhookConfig {
  url: string;                   // Webhook URL（必须 HTTPS）
  secret: string;                // 签名密钥
  events: string[];              // 订阅的事件类型
  filters?: {
    conversations?: string[];    // 指定会话过滤
    users?: string[];            // 指定用户过滤
    groups?: string[];           // 指定群组过滤
  };
  retryPolicy: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  timeout: number;
}

/**
 * Bot 统计信息
 */
export interface BotStats {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalUsersInteracted: number;
  totalGroupsJoined: number;
  totalCommandsExecuted: number;
  totalInteractions: number;
  lastActivityAt?: Date;
}

/**
 * Bot 实体
 * 存储 Bot 应用的所有信息
 */
@Entity('platform_bots')
@Index(['username'], { unique: true })
@Index(['appId'], { unique: true })
@Index(['tokenHash'], { unique: true })
export class BotEntity extends BaseEntity {
  // ========== 基础信息 ==========
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  username: string;              // Bot 用户名，唯一标识

  @Column({ type: 'varchar', length: 32, nullable: false, unique: true })
  appId: string;                 // 应用 ID

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string;               // 头像 URL

  @Column({ type: 'varchar', length: 500, nullable: true })
  homepage?: string;             // 主页链接

  @Column({ type: 'varchar', length: 100, nullable: true })
  developerName?: string;        // 开发者名称

  @Column({ type: 'varchar', length: 100, nullable: true })
  developerEmail?: string;       // 开发者邮箱

  // ========== 认证信息 ==========
  @Column({ type: 'varchar', length: 100, nullable: false, select: false })
  tokenHash: string;             // Token 哈希值（不直接查询）

  // ========== 权限配置 ==========
  @Column({ type: 'integer', nullable: false, default: 0 })
  intents: number;               // Intent 位掩码

  @Column({ type: 'simple-array', nullable: false, default: '' })
  scopes: BotScope[];            // 权限范围列表

  // ========== Webhook 配置 ==========
  @Column({ type: 'jsonb', nullable: true })
  webhook?: WebhookConfig;

  // ========== 状态 ==========
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'inactive'
  })
  status: BotStatus;

  @Column({ type: 'text', nullable: true })
  statusReason?: string;         // 状态变更原因

  // ========== 统计信息 ==========
  @Column({ type: 'jsonb', nullable: true })
  stats?: BotStats;

  // ========== 元数据 ==========
  @Column({ type: 'uuid', nullable: false })
  createdBy: string;             // 创建者用户 ID

  @Column({ type: 'timestamp', nullable: true })
  activatedAt?: Date;            // 激活时间

  @Column({ type: 'timestamp', nullable: true })
  lastTokenRotatedAt?: Date;     // 上次 Token 轮换时间

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;            // 删除者

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;              // 删除时间

  // ========== 辅助方法 ==========

  /**
   * 检查是否订阅了指定 Intent
   */
  hasIntent(intent: BotIntent): boolean {
    return (this.intents & intent) === intent;
  }

  /**
   * 添加 Intent
   */
  addIntent(intent: BotIntent): void {
    this.intents |= intent;
  }

  /**
   * 移除 Intent
   */
  removeIntent(intent: BotIntent): void {
    this.intents &= ~intent;
  }

  /**
   * 检查是否有指定 Scope
   */
  hasScope(scope: BotScope): boolean {
    return this.scopes.includes(scope) || this.scopes.includes('bot:basic');
  }

  /**
   * 检查是否有管理员权限
   */
  isAdmin(): boolean {
    return this.scopes.includes('admin');
  }

  /**
   * 更新统计信息
   */
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

  /**
   * 增加消息发送计数
   */
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

  /**
   * 增加消息接收计数
   */
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
