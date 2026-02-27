/**
 * 路由入口
 *
 * 职责：
 * 1. 定义应用路由
 * 2. 渲染路由组件
 * 3. 处理路由守卫
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./constants";
import { routes } from "./routes";

// 页面组件 - 从模块导入
import { ChatPage } from "../modules/im/pages/ChatPage";
import { ContactsPage } from "../modules/contacts/pages/ContactsPage";
import { TerminalPage } from "../pages/TerminalPage";
import { SettingsPage } from "../pages/SettingsPage";
import { AgentMarketPage, AgentDetailPage } from "../modules/agent";
import { DeviceListPage, DeviceDetailPage } from "../modules/device";
import { NotificationsPage } from "../modules/notification";
import { MallPage, ShoppingCartPage } from "../modules/commerce";
import { MomentsPage } from "../modules/social";
import { DiscoverPage } from "../modules/discover";
import { WalletPage } from "../modules/wallet";
import { CreationPage } from "../modules/creation";
import { CloudDrivePage } from "../modules/drive";
import { ShortVideoPage } from "../modules/video";
import { ToolsPage } from "../modules/tools";
import { SkillMarketPage, MySkillsPage } from "../modules/skill";
import { ToolMarketPage, MyToolsPage, ToolConfigPage } from "../modules/tool";

/**
 * 应用路由组件
 */
export function AppRouter() {
  return (
    <Routes>
      {/* 首页重定向到聊天 */}
      <Route
        path={ROUTES.HOME}
        element={<Navigate to={ROUTES.CHAT} replace />}
      />

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

      {/* Skill 市场页面 */}
      <Route path={ROUTES.SKILLS} element={<SkillMarketPage />} />
      <Route path={ROUTES.MY_SKILLS} element={<MySkillsPage />} />
      <Route path={ROUTES.SKILL_DETAIL} element={<SkillMarketPage />} />

      {/* Tool API 工具页面 */}
      <Route path={ROUTES.TOOL_MARKET} element={<ToolMarketPage />} />
      <Route path={ROUTES.MY_TOOLS} element={<MyToolsPage />} />
      <Route path={ROUTES.TOOL_CONFIG} element={<ToolConfigPage />} />

      {/* 设备管理页面 */}
      <Route path={ROUTES.DEVICES} element={<DeviceListPage />} />
      <Route path={ROUTES.DEVICE_DETAIL} element={<DeviceDetailPage />} />

      {/* 通知中心页面 */}
      <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />

      {/* 电商页面 */}
      <Route path={ROUTES.COMMERCE_MALL} element={<MallPage />} />
      <Route path={ROUTES.COMMERCE_CART} element={<ShoppingCartPage />} />

      {/* 社交圈页面 */}
      <Route path={ROUTES.MOMENTS} element={<MomentsPage />} />

      {/* 发现页面 */}
      <Route path={ROUTES.DISCOVER} element={<DiscoverPage />} />

      {/* 钱包页面 */}
      <Route path={ROUTES.WALLET} element={<WalletPage />} />

      {/* AI创作页面 */}
      <Route path={ROUTES.CREATION} element={<CreationPage />} />

      {/* 云盘页面 */}
      <Route path={ROUTES.DRIVE} element={<CloudDrivePage />} />

      {/* 短视频页面 */}
      <Route path={ROUTES.SHORT_VIDEO} element={<ShortVideoPage />} />

      {/* 工具页面 */}
      <Route path={ROUTES.TOOLS} element={<ToolsPage />} />

      {/* 404 页面 */}
      <Route path="*" element={<Navigate to={ROUTES.CHAT} replace />} />
    </Routes>
  );
}

/**
 * 导出路由配置
 */
export { routes };
export { ROUTES, ROUTE_NAMES, type RouteMeta } from "./constants";
export { authGuard, permissionGuard, executeGuards } from "./guards";

export default AppRouter;
