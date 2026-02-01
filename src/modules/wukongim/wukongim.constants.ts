/**
 * 悟空IM 常量定义
 */

/**
 * API 端点
 */
export const WUKONGIM_ENDPOINTS = {
  // 消息相关
  MESSAGE_SEND: '/message/send',
  MESSAGE_SEND_BATCH: '/message/sendbatch',
  MESSAGE_SYNC: '/message/sync',

  // 频道相关
  CHANNEL_CREATE: '/channel/create',
  CHANNEL_DELETE: '/channel/delete',
  CHANNEL_INFO: '/channel/info',

  // 订阅者相关
  SUBSCRIBER_ADD: '/channel/subscriber/add',
  SUBSCRIBER_REMOVE: '/channel/subscriber/remove',
  SUBSCRIBER_LIST: '/channel/subscribers',

  // 黑白名单
  BLACKLIST_ADD: '/channel/blacklist/add',
  BLACKLIST_REMOVE: '/channel/blacklist/remove',
  WHITELIST_ADD: '/channel/whitelist/add',
  WHITELIST_REMOVE: '/channel/whitelist/remove',

  // 用户相关
  USER_CREATE: '/user/create',
  USER_TOKEN: '/user/token',
  USER_UPDATE: '/user/update',
  USER_INFO: '/user/info',

  // 系统相关
  HEALTH: '/health',
  VARZ: '/varz',
} as const;

/**
 * 频道类型
 */
export enum WukongIMChannelType {
  PERSON = 1,  // 个人频道（单聊）
  GROUP = 2,   // 群组频道（群聊）
}

/**
 * 消息类型
 */
export enum WukongIMMessageType {
  TEXT = 1,
  IMAGE = 2,
  AUDIO = 3,
  VIDEO = 4,
  FILE = 5,
  LOCATION = 6,
  CARD = 7,
  CUSTOM = 99,
}

/**
 * 事件类型
 */
export enum WukongIMEventType {
  // 连接事件
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',

  // 消息事件
  MESSAGE = 'message',
  MESSAGE_ACK = 'message_ack',
  MESSAGE_READ = 'message_read',

  // 频道事件
  CHANNEL_JOIN = 'channel_join',
  CHANNEL_LEAVE = 'channel_leave',

  // 用户事件
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
}

/**
 * Webhook 事件类型
 */
export enum WukongIMWebhookEvent {
  // 消息事件
  MESSAGE = 'message',
  MESSAGE_ACK = 'message_ack',
  MESSAGE_READ = 'message_read',

  // 连接事件
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',

  // 用户事件
  USER_ONLINE = 'user.online',
  USER_OFFLINE = 'user.offline',
}

/**
 * 默认配置
 */
export const WUKONGIM_DEFAULTS = {
  API_URL: 'http://localhost:5001',
  TCP_ADDR: 'localhost:5100',
  WS_URL: 'ws://localhost:5200',
  MANAGER_URL: 'http://localhost:5300',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;
