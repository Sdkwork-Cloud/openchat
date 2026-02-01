/**
 * 路由配置
 * 
 * 集中定义所有路由配置
 */

import { ROUTES } from './constants';
import type { RouteMeta } from './constants';

/**
 * 应用路由对象类型
 * 使用自定义类型避免与 react-router-dom 的 RouteObject 类型冲突
 */
export interface AppRouteObject {
  path: string;
  element?: React.ReactNode;
  meta?: RouteMeta;
  children?: AppRouteObject[];
}

/**
 * 路由配置
 */
export const routes: AppRouteObject[] = [
  {
    path: ROUTES.HOME,
    element: null, // 重定向到聊天页面
    meta: {
      title: '首页',
      hiddenInMenu: true,
    },
  },
  {
    path: ROUTES.CHAT,
    element: null, // 在 AppRouter 中渲染
    meta: {
      title: 'AI对话',
      icon: 'chat',
      keepAlive: true,
    },
  },
  {
    path: ROUTES.CONTACTS,
    element: null,
    meta: {
      title: '智能体',
      icon: 'contacts',
      keepAlive: true,
    },
  },
  {
    path: ROUTES.TERMINAL,
    element: null,
    meta: {
      title: '终端',
      icon: 'terminal',
      keepAlive: false,
    },
  },
  {
    path: ROUTES.SETTINGS,
    element: null,
    meta: {
      title: '设置',
      icon: 'settings',
      keepAlive: true,
    },
  },
  {
    path: ROUTES.NOT_FOUND,
    element: null,
    meta: {
      title: '页面未找到',
      hiddenInMenu: true,
    },
  },
];

/**
 * 获取路由元数据
 */
export function getRouteMeta(path: string): RouteMeta | undefined {
  const route = routes.find(r => r.path === path);
  return route?.meta;
}

/**
 * 获取页面标题
 */
export function getPageTitle(path: string): string {
  const meta = getRouteMeta(path);
  return meta?.title || 'OpenChat';
}

export default routes;
