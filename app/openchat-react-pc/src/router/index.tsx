/**
 * 路由入口
 * 
 * 职责：
 * 1. 定义应用路由
 * 2. 渲染路由组件
 * 3. 处理路由守卫
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './constants';
import { routes } from './routes';

// 页面组件 - 从模块导入
import { ChatPage } from '../modules/im/pages/ChatPage';
import { ContactsPage } from '../modules/contacts/pages/ContactsPage';
import { TerminalPage } from '../pages/TerminalPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AgentMarketPage, AgentDetailPage } from '../modules/agent';
import { DeviceListPage, DeviceDetailPage } from '../modules/device';

/**
 * 应用路由组件
 */
export function AppRouter() {
  return (
    <Routes>
      {/* 首页重定向到聊天 */}
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.CHAT} replace />} />
      
      {/* 聊天页面 */}
      <Route path={`${ROUTES.CHAT}/*`} element={<ChatPage />} />
      
      {/* 通讯录页面 */}
      <Route path={`${ROUTES.CONTACTS}/*`} element={<ContactsPage />} />
      
      {/* 终端页面 */}
      <Route path={`${ROUTES.TERMINAL}/*`} element={<TerminalPage />} />
      
      {/* 设置页面 */}
      <Route path={`${ROUTES.SETTINGS}/*`} element={<SettingsPage />} />

      {/* Agent 市场页面 */}
      <Route path={ROUTES.AGENTS} element={<AgentMarketPage />} />
      <Route path={ROUTES.AGENT_DETAIL} element={<AgentDetailPage />} />

      {/* 设备管理页面 */}
      <Route path={ROUTES.DEVICES} element={<DeviceListPage />} />
      <Route path={ROUTES.DEVICE_DETAIL} element={<DeviceDetailPage />} />

      {/* 404 页面 */}
      <Route path="*" element={<Navigate to={ROUTES.CHAT} replace />} />
    </Routes>
  );
}

/**
 * 导出路由配置
 */
export { routes };
export { ROUTES, ROUTE_NAMES, type RouteMeta } from './constants';
export { authGuard, permissionGuard, executeGuards } from './guards';

export default AppRouter;
