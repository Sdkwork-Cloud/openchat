/**
 * 状态常量定义
 * 统一管理系统中所有状态值
 */

/**
 * 用户状态
 */
export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  AWAY = 'away',
  INVISIBLE = 'invisible',
}

/**
 * 好友请求状态
 */
export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

/**
 * 好友关系状态
 */
export enum FriendStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
}

/**
 * 群组成员状态
 */
export enum GroupMemberStatus {
  JOINED = 'joined',
  PENDING = 'pending',
  KICKED = 'kicked',
  LEFT = 'left',
}

/**
 * 群组邀请状态
 */
export enum GroupInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * 消息状态
 */
export enum MessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RECALLED = 'recalled',
}

/**
 * 消息类型
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video',
  LOCATION = 'location',
  SYSTEM = 'system',
  RECALL = 'recall',
  TYPING = 'typing',
}

/**
 * 验证码类型
 */
export enum VerificationCodeType {
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password',
  CHANGE_PHONE = 'change-phone',
  CHANGE_EMAIL = 'change-email',
}

/**
 * 智能体状态
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

/**
 * Bot平台类型
 */
export enum BotPlatformType {
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  WECHAT = 'wechat',
  CUSTOM = 'custom',
}

/**
 * 会话类型
 */
export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
  BOT = 'bot',
}

/**
 * 设备类型
 */
export enum DeviceType {
  WEB = 'web',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  IOT = 'iot',
}
