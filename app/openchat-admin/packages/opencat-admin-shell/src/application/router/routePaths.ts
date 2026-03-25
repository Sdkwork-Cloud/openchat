export const ROUTE_PATHS = {
  ROOT: '/',
  LOGIN: '/login',
  OVERVIEW: '/overview',
  USERS: '/users',
  GROUPS: '/groups',
  FRIENDS: '/friends',
  MESSAGES: '/messages',
  IOT: '/iot',
  RTC: '/rtc',
  IM_SERVER: '/im-server',
  SYSTEM: '/system',
} as const;

export type AppRoutePath = typeof ROUTE_PATHS[keyof typeof ROUTE_PATHS];
