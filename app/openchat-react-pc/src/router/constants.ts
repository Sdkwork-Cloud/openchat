/**
 * 路由常量定义
 * 
 * 集中管理所有路由路径，避免硬编码
 */

/**
 * 路由路径常量
 */
export const ROUTES = {
  // 首页
  HOME: '/',
  
  // 聊天
  CHAT: '/chat',
  CHAT_DETAIL: '/chat/:id',
  
  // 通讯录
  CONTACTS: '/contacts',
  CONTACT_DETAIL: '/contacts/:id',
  
  // 终端
  TERMINAL: '/terminal',
  TERMINAL_SESSION: '/terminal/:id',
  
  // 设置
  SETTINGS: '/settings',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_GENERAL: '/settings/general',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_PRIVACY: '/settings/privacy',
  SETTINGS_ABOUT: '/settings/about',

  // Agent 市场
  AGENTS: '/agents',
  AGENT_DETAIL: '/agents/:id',
  AGENT_CREATE: '/agents/create',
  AGENT_CHAT: '/agents/chat/:conversationId',

  // 设备管理
  DEVICES: '/devices',
  DEVICE_DETAIL: '/devices/:deviceId',

  // 认证
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // 其他
  NOT_FOUND: '/404',
} as const;

/**
 * 路由名称常量
 */
export const ROUTE_NAMES = {
  HOME: 'Home',
  CHAT: 'Chat',
  CONTACTS: 'Contacts',
  TERMINAL: 'Terminal',
  SETTINGS: 'Settings',
  LOGIN: 'Login',
  NOT_FOUND: 'NotFound',
} as const;

/**
 * 路由元数据类型
 */
export interface RouteMeta {
  /** 页面标题 */
  title?: string;
  /** 是否需要认证 */
  requiresAuth?: boolean;
  /** 所需权限 */
  permissions?: string[];
  /** 是否在菜单中隐藏 */
  hiddenInMenu?: boolean;
  /** 菜单图标 */
  icon?: string;
  /** 页面缓存 */
  keepAlive?: boolean;
}

export default ROUTES;
