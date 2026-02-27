/**
 * 侧边栏组件 - 支持动态主题
 *
 * 特点：
 * - 使用 Tailwind 实用类
 * - 统一的色彩语言
 * - 克制的交互反馈
 * - 精致的图标设计
 */

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  AIChatIcon,
  AIContactsIcon,
  AIAgentIcon,
  AINotificationIcon,
  AIShopIcon,
  AISocialIcon,
  AIDiscoverIcon,
  AIWalletIcon,
  AICreationIcon,
  AICloudIcon,
  AIShortVideoIcon,
  AIToolsIcon,
  AITerminalIcon,
  AISettingsIcon,
} from "../icons/SidebarIcons";

interface NavItem {
  id: string;
  icon: (active: boolean) => React.ReactNode;
  path: string;
  badge?: number;
  label: string;
}

const navItems: NavItem[] = [
  {
    id: "chat",
    icon: (active) => <AIChatIcon active={active} />,
    path: "/chat",
    badge: 3,
    label: "AI对话",
  },
  {
    id: "contacts",
    icon: (active) => <AIContactsIcon active={active} />,
    path: "/contacts",
    label: "联系人",
  },
  {
    id: "agents",
    icon: (active) => <AIAgentIcon active={active} />,
    path: "/agents",
    label: "Agent市场",
  },
  {
    id: "notifications",
    icon: (active) => <AINotificationIcon active={active} />,
    path: "/notifications",
    badge: 5,
    label: "消息中心",
  },
  {
    id: "commerce",
    icon: (active) => <AIShopIcon active={active} />,
    path: "/commerce/mall",
    label: "商城",
  },
  {
    id: "moments",
    icon: (active) => <AISocialIcon active={active} />,
    path: "/moments",
    label: "社交圈",
  },
  {
    id: "discover",
    icon: (active) => <AIDiscoverIcon active={active} />,
    path: "/discover",
    label: "发现",
  },
  {
    id: "wallet",
    icon: (active) => <AIWalletIcon active={active} />,
    path: "/wallet",
    label: "钱包",
  },
  {
    id: "creation",
    icon: (active) => <AICreationIcon active={active} />,
    path: "/creation",
    label: "AI创作",
  },
  {
    id: "drive",
    icon: (active) => <AICloudIcon active={active} />,
    path: "/drive",
    label: "云盘",
  },
  {
    id: "short-video",
    icon: (active) => <AIShortVideoIcon active={active} />,
    path: "/short-video",
    label: "短视频",
  },
  {
    id: "tools",
    icon: (active) => <AIToolsIcon active={active} />,
    path: "/tools",
    label: "工具箱",
  },
  {
    id: "terminal",
    icon: (active) => <AITerminalIcon active={active} />,
    path: "/terminal",
    label: "终端",
  },
];

/**
 * 侧边栏组件 - 支持动态主题
 */
export function Sidebar() {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);

  return (
    <aside className="w-[72px] h-full bg-bg-secondary flex flex-col items-center py-4 select-none border-r border-border backdrop-blur-md">
      {/* Logo */}
      <div className="mb-6 relative group cursor-pointer">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
            <path
              d="M8 12l3 3 5-5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 状态指示器 */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-bg-secondary rounded-full animate-pulse-slow"></div>

        {/* 悬停提示 */}
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-bg-elevated text-primary font-medium text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none z-50 border border-border shadow-xl">
          OpenChat AI
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 flex flex-col items-center space-y-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted">
        {navItems.map((item) => {
          const isActive = activePath.startsWith(item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setActivePath(item.path)}
              className="relative p-2.5 rounded-xl transition-all duration-200 group w-12 h-12 flex items-center justify-center"
              title={item.label}
            >
              {/* 选中背景 */}
              <div
                className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
                    : "opacity-0 group-hover:opacity-100 group-hover:bg-bg-hover group-hover:translate-x-0.5"
                }`}
              />

              {/* 图标 */}
              <div className="relative z-10">{item.icon(isActive)}</div>

              {/* 徽章 */}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md border-2 border-bg-secondary">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}

              {/* 悬停标签 */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-bg-elevated text-text-secondary text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none z-50 border border-border shadow-xl">
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* 底部设置 */}
      <div className="mt-auto pt-3 border-t border-border w-10 flex justify-center">
        <NavLink
          to="/settings"
          onClick={() => setActivePath("/settings")}
          className="relative p-2.5 rounded-xl transition-all duration-200 group w-12 h-12 flex items-center justify-center"
          title="设置"
        >
          <div
            className={`absolute inset-0 rounded-xl transition-all duration-300 ${
              activePath === "/settings"
                ? "bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]"
                : "opacity-0 group-hover:opacity-100 group-hover:bg-bg-hover group-hover:translate-x-0.5"
            }`}
          />
          <div className="relative z-10 group-hover:rotate-45 transition-transform duration-300">
            <AISettingsIcon active={activePath === "/settings"} />
          </div>

          {/* 悬停标签 */}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-bg-elevated text-text-secondary text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none z-50 border border-border shadow-xl">
            设置
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
