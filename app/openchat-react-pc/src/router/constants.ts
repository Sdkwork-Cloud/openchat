/**
 * Central route constants.
 */
export const ROUTES = {
  HOME: "/",

  CHAT: "/chat",
  CHAT_DETAIL: "/chat/:id",

  CONTACTS: "/contacts",
  CONTACT_DETAIL: "/contacts/:id",

  TERMINAL: "/terminal",
  TERMINAL_SESSION: "/terminal/:id",

  SETTINGS: "/settings",
  SETTINGS_ACCOUNT: "/settings/account",
  SETTINGS_GENERAL: "/settings/general",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_PRIVACY: "/settings/privacy",
  SETTINGS_ABOUT: "/settings/about",

  AGENTS: "/agents",
  AGENT_DETAIL: "/agents/:id",
  AGENT_CREATE: "/agents/create",
  AGENT_CHAT: "/agents/chat/:conversationId",

  SKILLS: "/skills",
  MY_SKILLS: "/skills/my",
  SKILL_DETAIL: "/skills/:id",

  TOOL_MARKET: "/tools/api",
  MY_TOOLS: "/tools/my",
  TOOL_CONFIG: "/tools/configure/:id",

  DEVICES: "/devices",
  DEVICE_DETAIL: "/devices/:deviceId",

  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",

  NOTIFICATIONS: "/notifications",

  COMMERCE: "/commerce",
  COMMERCE_MALL: "/commerce/mall",
  COMMERCE_CART: "/commerce/cart",
  COMMERCE_ORDERS: "/commerce/orders",

  MOMENTS: "/moments",
  DISCOVER: "/discover",
  WALLET: "/wallet",
  CREATION: "/creation",
  DRIVE: "/drive",
  SHORT_VIDEO: "/short-video",
  TOOLS: "/tools",

  APPSTORE: "/appstore",
  APPSTORE_DETAIL: "/appstore/:id",

  NOT_FOUND: "/404",
} as const;

export const ROUTE_NAMES = {
  HOME: "Home",
  CHAT: "Chat",
  CONTACTS: "Contacts",
  TERMINAL: "Terminal",
  SETTINGS: "Settings",
  LOGIN: "Login",
  NOT_FOUND: "NotFound",
} as const;

export interface RouteMeta {
  title?: string;
  requiresAuth?: boolean;
  permissions?: string[];
  hiddenInMenu?: boolean;
  icon?: string;
  keepAlive?: boolean;
}

export default ROUTES;
