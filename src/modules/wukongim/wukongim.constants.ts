export const WUKONGIM_ENDPOINTS = {
  MESSAGE_SEND: '/message/send',
  MESSAGE_SEND_BATCH: '/message/sendbatch',
  MESSAGE_SYNC: '/message/sync',
  CHANNEL_CREATE: '/channel/create',
  CHANNEL_DELETE: '/channel/delete',
  CHANNEL_INFO: '/channel/info',
  SUBSCRIBER_ADD: '/channel/subscriber/add',
  SUBSCRIBER_REMOVE: '/channel/subscriber/remove',
  SUBSCRIBER_LIST: '/channel/subscribers',
  BLACKLIST_ADD: '/channel/blacklist/add',
  BLACKLIST_REMOVE: '/channel/blacklist/remove',
  WHITELIST_ADD: '/channel/whitelist/add',
  WHITELIST_REMOVE: '/channel/whitelist/remove',
  USER_CREATE: '/user/create',
  USER_TOKEN: '/user/token',
  USER_UPDATE: '/user/update',
  USER_INFO: '/user/info',
  HEALTH: '/health',
  VARZ: '/varz',
} as const;

export enum WukongIMChannelType {
  PERSON = 1,
  GROUP = 2,
}

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

export enum WukongIMWebhookEvent {
  MESSAGE = 'message',
  MESSAGE_ACK = 'message_ack',
  MESSAGE_READ = 'message_read',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  USER_ONLINE = 'user.online',
  USER_OFFLINE = 'user.offline',
}

export const WUKONGIM_DEFAULTS = {
  API_URL: 'http://localhost:5001',
  TCP_ADDR: 'localhost:5100',
  WS_URL: 'ws://localhost:5200',
  MANAGER_URL: 'http://localhost:5300',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;
