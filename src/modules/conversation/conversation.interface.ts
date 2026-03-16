import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

/**
 * 会话类型
 */
export type ConversationType = 'single' | 'group';

/**
 * 会话实体
 */
export class Conversation {
  id: string;
  uuid?: string;
  type: ConversationType;
  userId: string; // 会话所属用户ID
  targetId: string; // 对方用户ID或群组ID
  targetName?: string; // 对方名称或群组名称
  targetAvatar?: string | ImageMediaResource; // 对方头像或群组头像
  lastMessageId?: string; // 最后一条消息ID
  lastMessageContent?: string; // 最后一条消息内容预览
  lastMessageTime?: Date; // 最后一条消息时间
  unreadCount: number; // 未读消息数
  isPinned: boolean; // 是否置顶
  isMuted: boolean; // 是否免打扰
  draft?: string;
  draftUpdatedAt?: Date;
  lastReadSeq?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建会话请求
 */
export interface CreateConversationRequest {
  type: ConversationType;
  userId: string;
  targetId: string;
}

/**
 * 更新会话请求
 */
export interface UpdateConversationRequest {
  isPinned?: boolean;
  isMuted?: boolean;
  draft?: string | null;
}

/**
 * 会话列表查询参数
 */
export interface ConversationQueryParams {
  userId: string;
  type?: ConversationType;
  isPinned?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 会话同步状态
 */
export interface ConversationSyncState {
  targetId: string;
  type: ConversationType;
  unreadCount: number;
  lastReadSeq: number;
  userLastReadSeq?: number;
  deviceId?: string;
  deviceLastReadSeq?: number;
  syncScope?: 'user' | 'device';
  maxSeq: number;
  pendingSeq: number;
  isCaughtUp: boolean;
  serverTime: string;
}

export interface ConversationSyncStateOptions {
  deviceId?: string;
}

export interface ConversationSyncTarget {
  targetId: string;
  type: ConversationType;
}

export interface ConversationSyncStateBatchResult {
  total: number;
  found: number;
  missing: ConversationSyncTarget[];
  items: ConversationSyncState[];
}

export interface DeviceReadCursorSummary {
  deviceId: string;
  conversationCount: number;
  lastActiveAt: string;
}

export interface DeviceReadCursorSummaryResult {
  total: number;
  items: DeviceReadCursorSummary[];
}

/**
 * 会话管理服务接口
 */
export interface ConversationManager {
  /**
   * 创建会话
   */
  createConversation(request: CreateConversationRequest): Promise<Conversation>;

  /**
   * 获取会话详情
   */
  getConversationById(id: string): Promise<Conversation | null>;

  /**
   * 获取用户的会话列表
   */
  getConversationsByUserId(params: ConversationQueryParams): Promise<Conversation[]>;

  /**
   * 获取用户与特定目标的会话
   */
  getConversationByTarget(userId: string, targetId: string, type: ConversationType): Promise<Conversation | null>;

  /**
   * 更新会话
   */
  updateConversation(id: string, request: UpdateConversationRequest): Promise<Conversation | null>;

  /**
   * 删除会话
   */
  deleteConversation(id: string): Promise<boolean>;

  /**
   * 更新会话最后消息
   */
  updateLastMessage(conversationId: string, messageId: string, content: string, messageTime: Date): Promise<boolean>;

  /**
   * 增加未读消息数
   */
  incrementUnreadCount(conversationId: string): Promise<boolean>;

  /**
   * 清空未读消息数
   */
  clearUnreadCount(conversationId: string): Promise<boolean>;

  /**
   * 置顶/取消置顶会话
   */
  pinConversation(id: string, isPinned: boolean): Promise<boolean>;

  /**
   * 设置免打扰
   */
  muteConversation(id: string, isMuted: boolean): Promise<boolean>;

  /**
   * 获取会话同步状态
   */
  getConversationSyncStateForUser(
    userId: string,
    targetId: string,
    type: ConversationType,
    options?: ConversationSyncStateOptions,
  ): Promise<ConversationSyncState | null>;

  /**
   * 批量获取会话同步状态
   */
  getConversationSyncStatesForUser(
    userId: string,
    targets: ConversationSyncTarget[],
    options?: ConversationSyncStateOptions,
  ): Promise<ConversationSyncStateBatchResult>;

  advanceDeviceLastReadSeq(
    userId: string,
    deviceId: string,
    targetId: string,
    type: ConversationType,
    seq: number,
  ): Promise<boolean>;

  deleteDeviceReadCursorsForUser(userId: string, deviceId: string): Promise<number>;

  deleteDeviceReadCursorsForUserExcept(userId: string, keepDeviceId: string): Promise<number>;

  getDeviceReadCursorSummariesForUser(
    userId: string,
    limit?: number,
  ): Promise<DeviceReadCursorSummaryResult>;

  deleteStaleDeviceReadCursorsForUser(userId: string, inactiveDays?: number): Promise<number>;
}
